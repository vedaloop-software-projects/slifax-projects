import { Router, type RequestHandler, type Response } from 'express'
import { authenticate, type AuthenticatedLocals } from '../../middlewares/auth/authenticate.ts'
import { billingOperations, type BillingOperation } from '../../models/billing/contracts.ts'
import { ApiError, type AuthService } from '../auth/service.ts'
import { billingSuccessResponse } from './response.ts'
import type { BillingService } from './service.ts'

const get = new Set<BillingOperation>(['clearTempBill','getShortcutKeys','getTempBillItems','clearManualDiscount','getFreeProductDetails','dayClose','getBillFormats'])
export function createBillingRouter(auth: AuthService, service: BillingService) {
  const router = Router(), protectedRoute = authenticate(auth)
  const handler = (operation: BillingOperation): RequestHandler => (request, response, next) => {
    if (!get.has(operation) && !request.is('application/json')) { response.status(400).json({ errors: 'Content-Type must be application/json.' }); return }
    const account = (response.locals as AuthenticatedLocals).account
    void service.execute(operation, account, get.has(operation) ? {} : request.body)
      .then(data => {
        if (operation === 'getTempBillItems' || operation === 'getFreeProductDetails') response.set('Cache-Control', 'no-store')
        response.json(billingSuccessResponse(operation, data))
      }).catch(next)
  }
  for (const operation of billingOperations) router[get.has(operation) ? 'get' : 'post'](`/${operation}`, protectedRoute, handler(operation))
  router.use((error: unknown, _request: unknown, response: Response, next: (error: unknown) => void) => {
    if (error instanceof ApiError) { response.status(error.status).json({ errors: error.message }); return }
    next(error)
  })
  return router
}
