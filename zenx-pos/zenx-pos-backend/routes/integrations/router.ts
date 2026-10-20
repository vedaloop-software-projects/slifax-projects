import { Router, type RequestHandler, type Response } from 'express'
import { authenticate, type AuthenticatedLocals } from '../../middlewares/auth/authenticate.ts'
import { ApiError, type AuthService } from '../auth/service.ts'
import type { IntegrationService } from './service.ts'

const wrap = (handler: RequestHandler): RequestHandler => (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next) }
const account = (response: Response) => (response.locals as AuthenticatedLocals).account
const parameter = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? '' : value ?? ''

export function createIntegrationRouter(auth: AuthService, service: IntegrationService) {
  const router = Router(), guard = authenticate(auth)
  router.get('/integrations', guard, wrap(async (_request, response) => { response.json({ success: true, message: 'Integrations fetched successfully.', data: await service.list(account(response)) }) }))
  router.post('/integrations/:provider/request', guard, wrap(async (request, response) => { const result = await service.request(account(response), parameter(request.params.provider), request.body); response.status(result === 'created' ? 201 : 200).json({ success: true, message: 'Integration request submitted.', data: { status: 'requested' } }) }))
  router.post('/integrations/:provider/initialize', guard, wrap(async (request, response) => { response.json({ success: true, message: 'Integration initialized.', data: await service.initialize(account(response), parameter(request.params.provider)) }) }))
  router.post('/integrations/pinelabs/checkout', guard, wrap(async (request, response) => { response.status(201).json({ success: true, message: 'Pine Labs checkout created.', data: await service.createPineLabsCheckout(account(response), request.body) }) }))
  router.use((error: unknown, _request: unknown, response: Response, next: (error: unknown) => void) => { if (error instanceof ApiError) { response.status(error.status).json({ errors: error.message }); return } next(error) })
  return router
}
