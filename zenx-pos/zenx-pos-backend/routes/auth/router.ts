import { Router, type RequestHandler, type Response } from 'express'
import { authenticate, authenticateForRenewal, type AuthenticatedLocals } from '../../middlewares/auth/authenticate.ts'
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
    response.json({ success: true, message: 'Login successful.', data: await service.login(request.body, { ip: request.ip ?? null }) })
  }))

  // "Sign out on <device> & continue here": the ticket from a blocked login is the credential.
  router.post('/loginTakeover/status', jsonOnly, handle(async (request, response) => {
    response.set('Cache-Control', 'no-store')
    response.json({ success: true, message: 'Sign-in request status.', data: await service.takeoverStatus(request.body) })
  }))
  router.post('/loginTakeover/sendOtp', jsonOnly, handle(async (request, response) => {
    response.json({ success: true, message: 'OTP sent.', data: await service.sendTakeoverOtp(request.body) })
  }))
  router.post('/loginTakeover/complete', jsonOnly, handle(async (request, response) => {
    response.json({ success: true, message: 'Login successful.', data: await service.completeTakeover(request.body, { ip: request.ip ?? null }) })
  }))

  const protectedRoute = authenticate(service)
  router.post('/changePassword', protectedRoute, jsonOnly, handle(async (request, response) => {
    await service.changePassword((response.locals as AuthenticatedLocals).account, request.body)
    response.json({ success: true, message: 'Password changed successfully.', data: null })
  }))
  router.get('/getProfile', authenticateForRenewal(service), handle(async (_request, response) => {
    const data = await service.profile((response.locals as AuthenticatedLocals).account)
    response.json({ success: true, message: 'Profile fetched successfully.', data })
  }))
  // Logout and login alerts stay reachable for expired contracts (renewal guard).
  const sessionRoute = authenticateForRenewal(service)
  router.post('/logout', sessionRoute, handle(async (_request, response) => {
    await service.logout((response.locals as AuthenticatedLocals).account)
    response.json({ success: true, message: 'Logged out successfully.', data: null })
  }))
  router.get('/getLoginAlerts', sessionRoute, handle(async (_request, response) => {
    response.set('Cache-Control', 'no-store')
    response.json({ success: true, message: 'Login alerts fetched successfully.', data: await service.loginAlerts((response.locals as AuthenticatedLocals).account) })
  }))
  router.post('/respondLoginAlert', sessionRoute, jsonOnly, handle(async (request, response) => {
    await service.respondLoginAlert((response.locals as AuthenticatedLocals).account, request.body)
    response.json({ success: true, message: 'Login alert updated.', data: null })
  }))
  router.get('/getPermission', protectedRoute, handle(async (_request, response) => {
    const data = await service.permissions((response.locals as AuthenticatedLocals).account)
    response.json({ success: true, message: 'Login successful.', data })
  }))

  router.use((error: unknown, _request: unknown, response: Response, next: (error: unknown) => void) => {
    if (error instanceof ApiError) {
      response.status(error.status).json({ errors: error.message, ...(error.details === undefined ? {} : { data: error.details }) })
      return
    }
    next(error)
  })
  return router
}
