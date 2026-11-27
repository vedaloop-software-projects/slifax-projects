import { Router, type RequestHandler, type Response } from 'express'
import { authenticate, type AuthenticatedLocals } from '../../middlewares/auth/authenticate.ts'
import type { AuthService } from '../auth/service.ts'
import type { AiService } from './service.ts'

const wrap = (handler: RequestHandler): RequestHandler => (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next) }
const account = (response: Response) => (response.locals as AuthenticatedLocals).account
const ok = (response: Response, message: string, data: unknown) => { response.set('Cache-Control', 'no-store'); response.status(200).json({ success: true, message, data }) }

// Store app: /api/ai/...
export function createAiRouter(auth: AuthService, service: AiService) {
  const router = Router(), guard = authenticate(auth)
  router.get('/ai/credits', guard, wrap(async (_request, response) => ok(response, 'ZenxPOS AI credits fetched.', await service.status(account(response)))))
  router.post('/ai/run/:feature', guard, wrap(async (request, response) => ok(response, 'ZenxPOS AI finished.', await service.run(account(response), String(request.params.feature), request.body))))
  return router
}
