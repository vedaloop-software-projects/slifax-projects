import { Router, type RequestHandler, type Response } from 'express'
import { z } from 'zod'
import type { AdminIdentity, AdminStore } from '../../models/admin/contracts.ts'
import type { WebsiteEnquiry, WebsiteEnquiryStore } from '../../models/website-enquiries/contracts.ts'
import { ApiError } from '../auth/service.ts'
import { cookieValue, readAdminSession } from './session.ts'

const wrap = (handler: RequestHandler): RequestHandler => (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next) }
const idOf = (raw: string | string[] | undefined) => { const value = Array.isArray(raw) ? raw[0] : raw; if (!value || !/^[1-9]\d{0,19}$/.test(value) || BigInt(value) > 18446744073709551615n) throw new ApiError(422, 'Invalid enquiry id.'); return BigInt(value) }
const filtersSchema = z.object({
  status: z.enum(['new', 'in_progress', 'closed']).optional(), type: z.enum(['quote', 'contact']).optional(),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
})
const statusSchema = z.object({ status: z.enum(['new', 'in_progress', 'closed']) })
const serialize = (row: WebsiteEnquiry) => ({ ...row, id: row.id.toString(), businessTypeId: row.businessTypeId?.toString() ?? null })

export function createWebsiteEnquiryAdminRouter(admins: { store: Pick<AdminStore, 'findAdminById'> }, store: WebsiteEnquiryStore, secret: string, rawPath = '/admin') {
  const router = Router(), path = '/' + rawPath.replace(/^\/+|\/+$/g, '') + '/website-enquiries'
  const auth: RequestHandler = (request, response, next) => { void (async () => {
    const session = readAdminSession(cookieValue(request.headers.cookie, 'zenx_admin'), secret)
    const admin = session && await admins.store.findAdminById(session.adminId)
    if (!session || !admin || admin.status !== 1) throw new ApiError(401, 'Admin authentication required.')
    response.locals.admin = admin
    response.set('Cache-Control', 'no-store')
    next()
  })().catch(next) }
  router.get(path + '/summary', auth, wrap(async (_request, response) => {
    response.json({ success: true, data: { unreadCount: await store.unreadCount() } })
  }))
  router.get(path, auth, wrap(async (request, response) => {
    const parsed = filtersSchema.safeParse({ ...request.query, status: request.query.status || undefined, type: request.query.type || undefined })
    if (!parsed.success) throw new ApiError(422, 'Choose valid enquiry filters and a whole-number page.')
    const { page, ...filters } = parsed.data, pageSize = 25
    const result = await store.list(filters, page, pageSize)
    response.json({ success: true, data: result.rows.map(serialize), meta: { total: result.total, page, pageSize } })
  }))
  router.post(path + '/:id/read', auth, wrap(async (request, response) => {
    const row = await store.markRead(idOf(request.params.id), (response.locals.admin as AdminIdentity).id)
    if (!row) throw new ApiError(404, 'Enquiry not found.')
    response.json({ success: true, message: 'Enquiry marked as read.', data: serialize(row) })
  }))
  router.post(path + '/:id/status', auth, wrap(async (request, response) => {
    const parsed = statusSchema.safeParse(request.body)
    if (!parsed.success) throw new ApiError(422, 'Choose a valid enquiry status.')
    const row = await store.setStatus(idOf(request.params.id), parsed.data.status, (response.locals.admin as AdminIdentity).id)
    if (!row) throw new ApiError(404, 'Enquiry not found.')
    response.json({ success: true, message: 'Enquiry status updated.', data: serialize(row) })
  }))
  router.use((error: unknown, _request: unknown, response: Response, next: (error: unknown) => void) => { if (error instanceof ApiError) { response.status(error.status).json({ errors: error.message }); return } next(error) })
  return router
}
