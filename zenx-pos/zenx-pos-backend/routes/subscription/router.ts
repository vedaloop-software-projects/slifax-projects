import { Router, type RequestHandler, type Response } from 'express'
import { authenticateForRenewal, type AuthenticatedLocals } from '../../middlewares/auth/authenticate.ts'
import { ApiError, type AuthService } from '../auth/service.ts'
import type { SubscriptionService } from './service.ts'

const wrap = (handler: RequestHandler): RequestHandler => (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next) }
const account = (response: Response) => (response.locals as AuthenticatedLocals).account
const invoiceId = (value: unknown) => {
  const text = Array.isArray(value) ? value[0] : value
  if (typeof text !== 'string' || !/^\d{1,15}$/.test(text)) throw new ApiError(422, 'Invalid invoice.')
  return BigInt(text)
}

// Uses the renewal guard so an expired client can still see and download its invoices.
export function createSubscriptionRouter(auth: AuthService, service: SubscriptionService) {
  const router = Router(), guard = authenticateForRenewal(auth)
  router.get('/subscription/details', guard, wrap(async (_request, response) => { response.json({ success: true, message: 'Subscription details fetched.', data: await service.details(account(response)) }) }))
  router.get('/subscription/invoices/:id/pdf', guard, wrap(async (request, response) => {
    const { filename, content } = await service.invoicePdf(account(response), invoiceId(request.params.id))
    response.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' }).send(content)
  }))
  router.post('/subscription/invoices/:id/email', guard, wrap(async (request, response) => { response.json({ success: true, message: 'Invoice emailed.', data: await service.emailInvoice(account(response), invoiceId(request.params.id)) }) }))
  router.use((error: unknown, _request: unknown, response: Response, next: (error: unknown) => void) => { if (error instanceof ApiError) { response.status(error.status).json({ errors: error.message }); return } next(error) })
  return router
}
