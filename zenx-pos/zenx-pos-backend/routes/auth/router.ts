import { Router, type RequestHandler, type Response } from 'express'
import { authenticate, type AuthenticatedLocals } from '../../middlewares/auth/authenticate.ts'
import { ApiError, AuthService } from './service.ts'

type AsyncHandler = (request: Parameters<RequestHandler>[0], response: Parameters<RequestHandler>[1]) => Promise<void>

function handle(action: AsyncHandler): RequestHandler {
  return (request, response, next) => { void action(request, response).catch(next) }
}

const jsonOnly: RequestHandler = (request, response, next) => {
  if (!request.is('application/json')) {
    response.status(400).json({ errors: 'Content-Type must be application/json.' })
    return
  }
  next()
}

export function createAuthRouter(service: AuthService) {
  const router = Router()
  router.post('/login', jsonOnly, handle(async (request, response) => {
    response.json({ success: true, message: 'Login successful.', data: await service.login(request.body) })
  }))

  const protectedRoute = authenticate(service)
  router.post('/changePassword', protectedRoute, jsonOnly, handle(async (request, response) => {
    await service.changePassword((response.locals as AuthenticatedLocals).account, request.body)
    response.json({ success: true, message: 'Password changed successfully.', data: null })
  }))
  router.get('/getProfile', protectedRoute, handle(async (_request, response) => {
    const data = await service.profile((response.locals as AuthenticatedLocals).account)
    response.json({ success: true, message: 'Profile fetched successfully.', data })
  }))
  router.get('/getPermission', protectedRoute, handle(async (_request, response) => {
    const data = await service.permissions((response.locals as AuthenticatedLocals).account)
    response.json({ success: true, message: 'Login successful.', data })
  }))

  router.use((error: unknown, _request: unknown, response: Response, next: (error: unknown) => void) => {
    if (error instanceof ApiError) {
      response.status(error.status).json({ errors: error.message })
      return
    }
    next(error)
  })
  return router
}
