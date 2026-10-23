import { Router, type RequestHandler, type Response } from 'express'
import { authenticate, type AuthenticatedLocals } from '../../middlewares/auth/authenticate.ts'
import { ApiError, type AuthService } from '../auth/service.ts'
import type { PasswordResetRequestService } from './service.ts'

type AsyncHandler = (request: Parameters<RequestHandler>[0], response: Parameters<RequestHandler>[1]) => Promise<void>
const handle = (action: AsyncHandler): RequestHandler => (request, response, next) => { void action(request, response).catch(next) }

export function createPasswordResetRequestRouter(auth: AuthService, service: PasswordResetRequestService) {
  const router = Router(), protectedRoute = authenticate(auth)
  router.post('/forgotPassword', handle(async (request, response) => {
    await service.request(request.body)
    response.json({ success: true, message: 'If the mobile number is registered, the reset request was sent to the appropriate administrator.', data: null })
  }))
  router.get('/passwordResetRequests', protectedRoute, handle(async (_request, response) => {
    const rows = await service.tenantList((response.locals as AuthenticatedLocals).account)
    response.json({ success: true, message: 'Password reset requests fetched.', data: rows.map((row) => ({ requestId: Number(row.requestId), userId: Number(row.id), name: row.name, mobile: row.mobile, requestedAt: row.requestedAt })) })
  }))
  router.post('/resetRequestedPassword', protectedRoute, handle(async (request, response) => {
    await service.tenantReset((response.locals as AuthenticatedLocals).account, request.body)
    response.json({ success: true, message: 'Password reset successfully.', data: null })
  }))
  router.use((error: unknown, _request: unknown, response: Response, next: (error: unknown) => void) => {
    if (error instanceof ApiError) { response.status(error.status).json({ errors: error.message }); return }
    next(error)
  })
  return router
}
