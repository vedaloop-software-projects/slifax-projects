import { Router, type RequestHandler, type Response } from 'express'
import { authenticate, type AuthenticatedLocals } from '../../middlewares/auth/authenticate.ts'
import { ApiError, type AuthService } from '../auth/service.ts'
import type { SupportService } from './service.ts'

const wrap = (action: RequestHandler): RequestHandler => (request, response, next) => { Promise.resolve(action(request, response, next)).catch(next) }
export function createSupportRouter(auth: AuthService, service: SupportService) {
  const router = Router(), guard = authenticate(auth)
  router.post('/support/incidents', guard, wrap(async (request, response) => { const incident = await service.customerCreate((response.locals as AuthenticatedLocals).account, request.body); response.status(201).json({ success: true, message: `Support request #${incident.id} was submitted as ${incident.priority}.`, data: { incidentId: incident.id.toString(), priority: incident.priority, status: incident.status } }) }))
  router.use((error: unknown, _request: unknown, response: Response, next: (error: unknown) => void) => { if (error instanceof ApiError) { response.status(error.status).json({ errors: error.message }); return } next(error) })
  return router
}
