import { Router, type RequestHandler, type Response } from 'express'
import type { AdminIdentity } from '../../models/admin/contracts.ts'
import { ApiError } from '../auth/service.ts'
import type { IntegrationService } from '../integrations/service.ts'
import { cookieValue, readAdminSession } from './session.ts'
import type { AdminService } from './service.ts'

const id = (raw: string | string[] | undefined) => { const value = Array.isArray(raw) ? raw[0] : raw; if (!value || !/^[1-9]\d*$/.test(value)) throw new ApiError(422, 'Invalid integration request id.'); return BigInt(value) }
const wrap = (handler: RequestHandler): RequestHandler => (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next) }

export function createIntegrationAdminRouter(admins: AdminService, service: IntegrationService, secret: string, rawPath = '/admin') {
  const router = Router(), path = '/' + rawPath.replace(/^\/+|\/+$/g, '')
  const auth: RequestHandler = (request, response, next) => { void (async () => { const session = readAdminSession(cookieValue(request.headers.cookie, 'zenx_admin'), secret), identity = session && await admins.store.findAdminById(session.adminId); if (!session || !identity) throw new ApiError(401, 'Admin authentication required.'); response.locals.admin = identity; next() })().catch(next) }
  const actor = (response: Response) => response.locals.admin as AdminIdentity
  router.get(path + '/integration-requests', auth, wrap(async (request, response) => { response.json({ success: true, data: await service.adminList(typeof request.query.status === 'string' ? request.query.status : undefined) }) }))
  router.post(path + '/integration-requests/:id/configure', auth, wrap(async (request, response) => { await service.configure(id(request.params.id), actor(response).id, request.body); response.json({ success: true, message: 'Tenant integration configured and activated.' }) }))
  router.post(path + '/integration-requests/:id/status', auth, wrap(async (request, response) => { await service.updateStatus(id(request.params.id), actor(response).id, request.body); response.json({ success: true, message: 'Integration request updated.' }) }))
  router.use((error: unknown, _request: unknown, response: Response, next: (error: unknown) => void) => { if (error instanceof ApiError) { response.status(error.status).json({ errors: error.message }); return } next(error) })
  return router
}
