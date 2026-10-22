import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express'
import type { AdminRow } from '../../models/admin/contracts.ts'
import { ApiError } from '../auth/service.ts'
import { AdminService, resources, type ResourceDefinition } from './service.ts'
import { cookieValue, issueAdminSession, readAdminSession } from './session.ts'
import { adminPage, formPage, loginPage, resourcePage } from './view.ts'
import multer from 'multer'
import type { BillFormatStorage } from '../../models/admin/bill-format-storage.ts'
import type { PasswordResetRequestService } from '../password-reset-requests/service.ts'

declare global { namespace Express { interface Request { adminId?: bigint } } }

function id(value: string | string[]) {
  if (Array.isArray(value)) throw new ApiError(400, 'Invalid id.')
  if (!/^[1-9]\d*$/.test(value)) throw new ApiError(400, 'Invalid id.')
  return BigInt(value)
}

function jsonRows(rows: AdminRow[]) {
  return rows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'password').map(([key, value]) => [key, typeof value === 'bigint' ? value.toString() : value])))
}

export const routeNames: Record<string, { add: string; create: string; list: string; edit: string; update: string; remove: string }> = {
  admins: { add: 'add_admin', create: 'add/admin', list: 'admins', edit: 'edit/admin', update: 'update/admin', remove: 'delete/admin' },
  businessTypes: { add: 'add_business_type', create: 'add/business_type', list: 'business_types', edit: 'edit/business_type', update: 'update/business_type', remove: 'delete/business_type' },
  features: { add: 'add_feature', create: 'add/feature', list: 'features', edit: 'edit/feature', update: 'update/feature', remove: 'delete/feature' },
  subFeatures: { add: 'add_sub_feature', create: 'add/sub_feature', list: 'sub_features', edit: 'edit/sub_feature', update: 'update/sub_feature', remove: 'delete/sub_feature' },
  keyMappings: { add: 'add_key_map', create: 'add/key_map', list: 'key_maps', edit: 'edit/key_map', update: 'update/key_map', remove: 'delete/key_map' },
  billColumns: { add: 'add_bill_column', create: 'add/bill_column', list: 'bill_columns', edit: 'edit/bill_column', update: 'update/bill_column', remove: 'delete/bill_column' },
  couponUsageTypes: { add: 'add_coupon_usage_type', create: 'add/coupon_usage_type', list: 'coupon_usage_types', edit: 'edit/coupon_usage_type', update: 'update/coupon_usage_type', remove: 'delete/coupon_usage_type' },
  billFormats: { add: 'add_bill_format', create: 'add/bill_format', list: 'bill_formats', edit: 'edit/bill_format', update: 'update/bill_format', remove: 'delete/bill_format' },
}

function wantsJson(request: Request) { return request.accepts(['html', 'json']) === 'json' }
function sessionCookie(request: Request, adminPath: string, value: string, maxAge: number) {
  const forwarded = request.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase()
  const secure = request.secure || forwarded === 'https'
  return `zenx_admin=${value}; Path=${adminPath}; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`
}
type AsyncHandler = (request: Request, response: Response, next: NextFunction) => Promise<void>
const asyncRoute = (action: AsyncHandler) => (request: Request, response: Response, next: NextFunction) => { void action(request, response, next).catch(next) }

export function createAdminRouter(service: AdminService, secret: string, rawPath = '/admin', billFiles?: BillFormatStorage, passwordResets?: PasswordResetRequestService) {
  if (Buffer.byteLength(secret) < 32) throw new Error('ADMIN_SESSION_SECRET must be at least 32 bytes.')
  const adminPath = '/' + rawPath.replace(/^\/+|\/+$/g, '')
  const router = express.Router()
  const upload = multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:10},fileFilter:(_q,file,cb)=>cb(null,['application/pdf','image/jpeg','image/png','image/webp'].includes(file.mimetype))})
  const validate = async (definition: ResourceDefinition, body: Record<string, unknown>, create = false) => {
    try { return await service.validate(definition, body, create) }
    catch (error) { if (error instanceof Error) throw new ApiError(422, error.message); throw error }
  }
  const duplicate = async (definition: ResourceDefinition, data: Record<string, unknown>, excludeId?: bigint) => {
    for (const fields of definition.duplicateFields) {
      const values = Object.fromEntries(fields.map((field) => [field, data[field]]))
      if (Object.values(values).some((value) => value === null || value === undefined || value === '')) continue
      if (await service.store.findDuplicate(definition.resource, values, excludeId)) return true
    }
    return false
  }
  router.use(express.urlencoded({ extended: false, limit: '64kb' }))

  const authenticate = asyncRoute(async (request: Request, response: Response, next: NextFunction) => {
    const session = readAdminSession(cookieValue(request.headers.cookie, 'zenx_admin'), secret)
    const admin = session && await service.store.findAdminById(session.adminId)
    if (!session || !admin) {
      if (wantsJson(request)) throw new ApiError(401, 'Admin authentication required.')
      response.redirect(303, adminPath)
      return
    }
    request.adminId = session.adminId
    response.locals.admin = admin
    next()
  })

  router.get(adminPath, (_request, response) => response.type('html').send(loginPage(adminPath)))
  router.post(adminPath + '/login', asyncRoute(async (request, response) => {
    const admin = await service.login(request.body.mobile, request.body.password)
    if (!admin) {
      if (wantsJson(request)) throw new ApiError(401, 'Invalid credentials.')
      response.status(401).type('html').send(loginPage(adminPath, 'Invalid credentials.'))
      return
    }
    response.setHeader('Set-Cookie', sessionCookie(request, adminPath, issueAdminSession(admin.id, secret), 28800))
    if (wantsJson(request)) response.json({ success: true, data: { id: admin.id.toString(), name: admin.name, mobile: admin.mobile } })
    else response.redirect(303, adminPath + '/dashboard')
  }))
  router.post(adminPath + '/forgot-password', asyncRoute(async (request, response) => {
    if (!passwordResets) throw new ApiError(503, 'Password reset requests are unavailable.')
    await passwordResets.request(request.body)
    response.json({ success: true, message: 'If the mobile number is registered, the reset request was sent to another super administrator.' })
  }))
  router.get(adminPath + '/logout', (request, response) => {
    response.setHeader('Set-Cookie', sessionCookie(request, adminPath, '', 0))
    response.redirect(303, adminPath)
  })
  router.post(adminPath + '/logout', (request, response) => {
    response.setHeader('Set-Cookie', sessionCookie(request, adminPath, '', 0))
    response.json({ success: true })
  })
  router.get(adminPath + '/session', authenticate, (_request, response) => {
    const admin = response.locals.admin as { id: bigint; name: string; mobile: string }
    response.json({ success: true, data: { id: admin.id.toString(), name: admin.name, mobile: admin.mobile } })
  })
  router.get(adminPath + '/dashboard', authenticate, (_request, response) => response.type('html').send(adminPage('Dashboard', '<p>ZenxPOS administration</p>', adminPath)))
  router.get(adminPath + '/change_password', authenticate, (_request, response) => response.type('html').send(formPage('Change password', ['current_password', 'password', 'password_confirmation'], adminPath + '/update_password', adminPath)))
  router.post(adminPath + '/update_password', authenticate, asyncRoute(async (request, response) => {
    const changed = await service.changePassword(request.adminId!, request.body.current_password, request.body.password, request.body.password_confirmation)
    if (!changed) throw new ApiError(422, 'Current password or new password is invalid.')
    if (wantsJson(request)) response.json({ success: true, message: 'Password updated.' })
    else response.redirect(303, adminPath + '/dashboard')
  }))
  router.get(adminPath + '/password-reset-requests', authenticate, asyncRoute(async (_request, response) => {
    if (!passwordResets) throw new ApiError(503, 'Password reset requests are unavailable.')
    const rows = await passwordResets.superAdminList()
    response.json({ success: true, data: rows.map((row) => ({ requestId: row.requestId.toString(), requesterType: row.type, requesterId: row.id.toString(), clientId: row.clientId?.toString() ?? null, clientName: row.clientName ?? null, name: row.name, mobile: row.mobile, accountLevel: row.type === 'admin' ? 'Super admin' : 'Tenant admin', requestedAt: row.requestedAt })) })
  }))
  router.post(adminPath + '/password-reset-requests/:id/reset', authenticate, asyncRoute(async (request, response) => {
    if (!passwordResets) throw new ApiError(503, 'Password reset requests are unavailable.')
    await passwordResets.superAdminReset(request.adminId!, { ...request.body, requestId: request.params.id })
    response.json({ success: true, message: 'Password reset successfully.' })
  }))

  function install(definition: ResourceDefinition) {
    const names = routeNames[definition.resource]!
    const fields = definition.fields.map((field) => field.name).concat(definition.resource==='billFormats'?['file']:[])
    const receive:RequestHandler=definition.resource==='billFormats'?upload.single('file'):(_q,_s,next)=>next()
    router.get(`${adminPath}/${names.add}`, authenticate, (_request, response) => response.type('html').send(formPage(`Add ${definition.singular}`, fields, `${adminPath}/${names.create}`, adminPath)))
    router.post(`${adminPath}/${names.create}`, authenticate, receive, asyncRoute(async (request, response) => {
      const data = await validate(definition, request.body, true)
      if(definition.resource==='billFormats'){if(!billFiles||!request.file)throw new ApiError(422,'Bill format file is required.');try{const saved=await billFiles.save({buffer:request.file.buffer,mimeType:request.file.mimetype});data.file=saved.path;data.file_type=saved.type}catch{throw new ApiError(422,'Invalid bill format file content.')}}
      if (await duplicate(definition, data)) throw new ApiError(409, `${definition.singular} already exists.`)
      const row = await service.store.create(definition.resource, data, request.adminId!)
      if (wantsJson(request)) response.status(201).json({ success: true, data: jsonRows([row])[0] })
      else response.redirect(303, `${adminPath}/${names.list}`)
    }))
    const list = asyncRoute(async (request: Request, response: Response) => {
      const query = { ...request.query, ...request.body }
      const result = await service.list(definition, query)
      if (wantsJson(request)) response.json({ success: true, data: jsonRows(result.items), meta: { total: result.total, pageSize: service.pageSize } })
      else response.type('html').send(resourcePage(definition.title, jsonRows(result.items), adminPath))
    })
    router.get(`${adminPath}/${names.list}`, authenticate, list)
    router.post(`${adminPath}/${names.list}`, authenticate, list)
    router.get(`${adminPath}/${names.list}/refresh`, authenticate, (_request, response) => response.redirect(303, `${adminPath}/${names.list}`))
    router.get(`${adminPath}/${names.edit}/:id`, authenticate, asyncRoute(async (request, response) => {
      const row = await service.store.find(definition.resource, id(request.params.id!))
      if (!row) throw new ApiError(404, `${definition.singular} not found.`)
      if (wantsJson(request)) response.json({ success: true, data: jsonRows([row])[0] })
      else response.type('html').send(formPage(`Edit ${definition.singular}`, fields, `${adminPath}/${names.update}/${request.params.id}`, adminPath, row))
    }))
    router.post(`${adminPath}/${names.update}/:id`, authenticate, receive, asyncRoute(async (request, response) => {
      const recordId = id(request.params.id!)
      const data = await validate(definition, request.body)
      const before=definition.resource==='billFormats'?await service.store.find(definition.resource,recordId):null
      let replacement:string|undefined
      if(definition.resource==='billFormats'&&request.file){if(!billFiles)throw new ApiError(422,'Bill format storage is unavailable.');try{const saved=await billFiles.save({buffer:request.file.buffer,mimeType:request.file.mimetype});data.file=saved.path;data.file_type=saved.type;replacement=saved.path}catch{throw new ApiError(422,'Invalid bill format file content.')}}
      if (await duplicate(definition, data, recordId)) throw new ApiError(409, `${definition.singular} already exists.`)
      const row = await service.store.update(definition.resource, recordId, data, request.adminId!)
      if (!row){if(replacement)await billFiles?.remove(replacement);throw new ApiError(404, `${definition.singular} not found.`)}
      if(replacement&&typeof before?.file==='string')await billFiles?.remove(before.file)
      if (wantsJson(request)) response.json({ success: true, data: jsonRows([row])[0] })
      else response.redirect(303, `${adminPath}/${names.list}`)
    }))
    router.get(`${adminPath}/${names.remove}/:id`, authenticate, asyncRoute(async (request, response) => {
      const row = await service.store.find(definition.resource, id(request.params.id!))
      if (!row) throw new ApiError(404, `${definition.singular} not found.`)
      if (wantsJson(request)) response.json({ success: true, message: 'Confirmation required before deletion.', data: jsonRows([row])[0] })
      else response.type('html').send(adminPage(`Delete ${definition.singular}`, `<p>Confirm deletion of record ${request.params.id}.</p><form method="post"><button>Delete</button></form>`, adminPath))
    }))
    router.post(`${adminPath}/${names.remove}/:id`, authenticate, asyncRoute(async (request, response) => {
      const before=definition.resource==='billFormats'?await service.store.find(definition.resource,id(request.params.id!)):null
      if (!await service.store.softDelete(definition.resource, id(request.params.id!), request.adminId!)) throw new ApiError(404, `${definition.singular} not found.`)
      if(typeof before?.file==='string')await billFiles?.remove(before.file)
      if (wantsJson(request)) response.json({ success: true, message: 'Deleted.' })
      else response.redirect(303, `${adminPath}/${names.list}`)
    }))
  }

  for (const definition of resources) install(definition)
  router.use((error: unknown, _request: Request, response: Response, next: NextFunction) => {
    if (error instanceof ApiError) { response.status(error.status).json({ errors: error.message }); return }
    if(error instanceof multer.MulterError){response.status(error.code==='LIMIT_FILE_SIZE'?413:422).json({errors:'Invalid bill format upload.'});return}
    next(error)
  })
  return router
}
