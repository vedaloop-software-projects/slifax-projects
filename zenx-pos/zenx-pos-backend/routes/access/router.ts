import { Router, type RequestHandler, type Response } from 'express'
import { authenticate, type AuthenticatedLocals } from '../../middlewares/auth/authenticate.ts'
import { ApiError, type AuthService } from '../auth/service.ts'
import type { AccessService } from './service.ts'

const jsonOnly: RequestHandler = (request, response, next) => { if (!request.is('application/json')) { response.status(400).json({ errors: 'Content-Type must be application/json.' }); return } next() }
const handle = (action: (request: Parameters<RequestHandler>[0], response: Parameters<RequestHandler>[1]) => Promise<void>): RequestHandler => (request, response, next) => { void action(request, response).catch(next) }
export function createAccessRouter(auth: AuthService, service: AccessService) {
  const router = Router(), protectedRoute = authenticate(auth), account = (response: Response) => (response.locals as AuthenticatedLocals).account
  router.post('/getRoleAccessLevels', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Features fetched successfully.', data: await service.get(account(response), request.body) }) }))
  router.post('/saveRoleAccessLevels', protectedRoute, jsonOnly, handle(async (request, response) => { await service.save(account(response), request.body); response.json({ success: true, message: 'Access levels saved successfully.', data: null }) }))
  router.use((error: unknown, _request: unknown, response: Response, next: (error: unknown) => void) => { if (error instanceof ApiError) { response.status(error.status).json({ errors: error.message }); return } next(error) })
  return router
}
