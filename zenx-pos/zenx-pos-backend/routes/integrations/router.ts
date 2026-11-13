import { Router, type RequestHandler, type Response } from 'express'
import { authenticate, authenticateForRenewal, type AuthenticatedLocals } from '../../middlewares/auth/authenticate.ts'
import { ApiError, type AuthService } from '../auth/service.ts'
import type { IntegrationService } from './service.ts'

const wrap = (handler: RequestHandler): RequestHandler => (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next) }
const account = (response: Response) => (response.locals as AuthenticatedLocals).account
const parameter = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? '' : value ?? ''

export function createIntegrationRouter(auth: AuthService, service: IntegrationService) {
  const router = Router(), guard = authenticate(auth), renewalGuard = authenticateForRenewal(auth)
  router.get('/subscription/cashfree/return', (request, response) => {
    const orderId = parameter(request.query.order_id as string | string[] | undefined).replace(/[^A-Za-z0-9_-]/g, '')
    response.type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:Arial;text-align:center;padding:40px;color:#17365d"><h2>Payment submitted</h2><p>Return to ZenxPOS and tap Verify Payment to confirm it.</p><script>window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(${JSON.stringify(JSON.stringify({ returned: true }))});</script><small>${orderId}</small></body></html>`)
  })
  router.get('/integrations', guard, wrap(async (_request, response) => { response.json({ success: true, message: 'Integrations fetched successfully.', data: await service.list(account(response)) }) }))
  router.post('/integrations/:provider/request', guard, wrap(async (request, response) => { const result = await service.request(account(response), parameter(request.params.provider), request.body); response.status(result === 'created' ? 201 : 200).json({ success: true, message: 'Integration request submitted.', data: { status: 'requested' } }) }))
  router.post('/integrations/:provider/initialize', guard, wrap(async (request, response) => { response.json({ success: true, message: 'Integration initialized.', data: await service.initialize(account(response), parameter(request.params.provider)) }) }))
  router.post('/integrations/pinelabs/checkout', guard, wrap(async (request, response) => { response.status(201).json({ success: true, message: 'Pine Labs checkout created.', data: await service.createPineLabsCheckout(account(response), request.body) }) }))
  router.get('/subscription/renewal-quote', renewalGuard, wrap(async (_request, response) => { response.json({ success: true, message: 'Renewal quote fetched.', data: await service.renewalQuote(account(response)) }) }))
  router.post('/subscription/cashfree/checkout', renewalGuard, wrap(async (_request, response) => { response.status(201).json({ success: true, message: 'Cashfree renewal checkout created.', data: await service.createCashfreeRenewal(account(response)) }) }))
  router.post('/subscription/cashfree/verify', renewalGuard, wrap(async (request, response) => { response.json({ success: true, message: 'Cashfree renewal status verified.', data: await service.verifyCashfreeRenewal(account(response), request.body) }) }))
  router.use((error: unknown, _request: unknown, response: Response, next: (error: unknown) => void) => { if (error instanceof ApiError) { response.status(error.status).json({ errors: error.message }); return } next(error) })
  return router
}
