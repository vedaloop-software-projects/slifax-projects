import { Router, type RequestHandler, type Response } from 'express'
import { ApiError } from '../auth/service.ts'
import type { ResetService } from './service.ts'

type AsyncHandler = (request: Parameters<RequestHandler>[0], response: Parameters<RequestHandler>[1]) => Promise<void>
function handle(action: AsyncHandler): RequestHandler { return (request, response, next) => { void action(request, response).catch(next) } }
const jsonOnly: RequestHandler = (request, response, next) => {
  if (!request.is('application/json')) { response.status(400).json({ errors: 'Content-Type must be application/json.' }); return }
  next()
}

export function createResetRouter(service: ResetService) {
  const router = Router()
  router.post('/forgotPassword', jsonOnly, handle(async (request, response) => {
    await service.forgot(request.body)
    response.json({ success: true, message: 'If the account exists, an OTP has been sent.', data: null })
  }))
  router.post('/verifyOtp', jsonOnly, handle(async (request, response) => {
    response.json({ success: true, message: 'OTP verified successfully.', data: await service.verify(request.body) })
  }))
  router.post('/resetPassword', jsonOnly, handle(async (request, response) => {
    await service.reset(request.body)
    response.json({ success: true, message: 'Password reset successfully.', data: null })
  }))
  router.use((error: unknown, _request: unknown, response: Response, next: (error: unknown) => void) => {
    if (error instanceof ApiError) { response.status(error.status).json({ errors: error.message }); return }
    next(error)
  })
  return router
}
