import { Router, type RequestHandler, type Response } from 'express'
import type { AdminIdentity } from '../../models/admin/contracts.ts'
import { ApiError } from '../auth/service.ts'
import type { SupportService } from '../support/service.ts'
import { cookieValue, readAdminSession } from './session.ts'
import type { AdminService } from './service.ts'

const wrap = (handler: RequestHandler): RequestHandler => (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next) }
const incidentId = (raw: string | string[] | undefined) => { const value = Array.isArray(raw) ? raw[0] : raw; if (!value || !/^[1-9]\d*$/.test(value)) throw new ApiError(422, 'Invalid support incident id.'); return BigInt(value) }
export function createSupportAdminRouter(admins: AdminService, service: SupportService, secret: string, rawPath = '/admin') {
  const router = Router(), path = '/' + rawPath.replace(/^\/+|\/+$/g, '')
  const auth: RequestHandler = (request, response, next) => { void (async () => { const session = readAdminSession(cookieValue(request.headers.cookie, 'zenx_admin'), secret), admin = session && await admins.store.findAdminById(session.adminId); if (!session || !admin) throw new ApiError(401, 'Admin authentication required.'); response.locals.admin = admin as AdminIdentity; next() })().catch(next) }
  router.get(path + '/support-incidents', auth, wrap(async (request, response) => { const rows = await service.list(typeof request.query.priority === 'string' ? request.query.priority : undefined, typeof request.query.status === 'string' ? request.query.status : undefined); response.json({ success: true, data: rows.map(row => ({ ...row, id: row.id.toString(), clientId: row.clientId?.toString() ?? null, userId: row.userId?.toString() ?? null, signature: undefined })) }) }))
  router.post(path + '/support-incidents/:id/status', auth, wrap(async (request, response) => { await service.update(incidentId(request.params.id), request.body); response.json({ success: true, message: 'Support incident updated.' }) }))
  router.use((error: unknown, _request: unknown, response: Response, next: (error: unknown) => void) => { if (error instanceof ApiError) { response.status(error.status).json({ errors: error.message }); return } next(error) })
  return router
}
