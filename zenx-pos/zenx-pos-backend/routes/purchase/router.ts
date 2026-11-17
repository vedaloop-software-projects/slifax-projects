import { Router, type Request, type RequestHandler, type Response } from 'express'
import { authenticate, type AuthenticatedLocals } from '../../middlewares/auth/authenticate.ts'
import { PurchaseError } from '../../models/purchase/rules.ts'
import { ApiError, type AuthService } from '../auth/service.ts'
import type { PurchaseService } from './service.ts'

const wrap = (handler: RequestHandler): RequestHandler => (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next) }
const account = (response: Response) => (response.locals as AuthenticatedLocals).account
const ok = (response: Response, message: string, data: unknown, status = 200) => { response.set('Cache-Control', 'no-store'); response.status(status).json({ success: true, message, data }) }
const idOf = (request: Request, name = 'id') => {
  const value = String(request.params[name] ?? '')
  if (!/^[1-9]\d{0,18}$/.test(value)) throw new ApiError(422, 'Invalid id.')
  return BigInt(value)
}

// Store app: /api/purchase/...
export function createPurchaseRouter(auth: AuthService, service: PurchaseService) {
  const router = Router(), guard = authenticate(auth)
  const get = (path: string, message: string, run: (request: Request, response: Response) => Promise<unknown>) => router.get(path, guard, wrap(async (request, response) => ok(response, message, await run(request, response))))
  const post = (path: string, message: string, run: (request: Request, response: Response) => Promise<unknown>, status = 200) => router.post(path, guard, wrap(async (request, response) => ok(response, message, await run(request, response), status)))

  get('/purchase/dashboard', 'Purchase dashboard fetched.', (_q, r) => service.dashboard(account(r)))
  get('/purchase/states', 'States fetched.', () => service.states())

  get('/purchase/suppliers', 'Suppliers fetched.', (q, r) => service.listSuppliers(account(r), q.query))
  get('/purchase/suppliers/options', 'Suppliers fetched.', (_q, r) => service.supplierOptions(account(r)))
  get('/purchase/suppliers/:id', 'Supplier fetched.', (q, r) => service.getSupplier(account(r), idOf(q)))
  get('/purchase/suppliers/:id/references', 'Supplier documents fetched.', (q, r) => service.supplierReferences(account(r), idOf(q)))
  post('/purchase/suppliers', 'Supplier created.', (q, r) => service.saveSupplier(account(r), null, q.body), 201)
  post('/purchase/suppliers/:id', 'Supplier updated.', (q, r) => service.saveSupplier(account(r), idOf(q), q.body))

  get('/purchase/products', 'Products fetched.', (q, r) => service.lookupProducts(account(r), q.query))
  get('/purchase/product-settings', 'Purchase settings fetched.', (q, r) => service.listProductSettings(account(r), q.query))
  post('/purchase/product-settings', 'Purchase settings saved.', (q, r) => service.saveProductSettings(account(r), q.body))

  post('/purchase/auto-po/suggest', 'Suggestions calculated.', (q, r) => service.autoPoSuggest(account(r), q.body))
  post('/purchase/auto-po/create', 'Draft purchase orders created.', (q, r) => service.autoPoCreate(account(r), q.body), 201)

  get('/purchase/orders', 'Purchase orders fetched.', (q, r) => service.listOrders(account(r), q.query))
  get('/purchase/orders/:id', 'Purchase order fetched.', (q, r) => service.getOrder(account(r), idOf(q)))
  post('/purchase/orders', 'Purchase order saved.', (q, r) => service.saveOrder(account(r), null, q.body), 201)
  post('/purchase/orders/:id', 'Purchase order saved.', (q, r) => service.saveOrder(account(r), idOf(q), q.body))
  post('/purchase/orders/:id/:action', 'Purchase order updated.', (q, r) => service.orderAction(account(r), idOf(q), String(q.params.action), q.body))

  get('/purchase/grns', 'GRNs fetched.', (q, r) => service.listGrns(account(r), q.query))
  get('/purchase/grns/:id', 'GRN fetched.', (q, r) => service.getGrn(account(r), idOf(q)))
  post('/purchase/grns', 'GRN saved.', (q, r) => service.saveGrn(account(r), null, q.body), 201)
  post('/purchase/grns/:id/post', 'GRN posted. Stock updated.', (q, r) => service.postGrn(account(r), idOf(q)))
  post('/purchase/grns/:id/cancel', 'GRN cancelled.', (q, r) => service.cancelGrn(account(r), idOf(q), q.body))
  post('/purchase/grns/:id', 'GRN saved.', (q, r) => service.saveGrn(account(r), idOf(q), q.body))

  get('/purchase/invoices', 'Purchase invoices fetched.', (q, r) => service.listInvoices(account(r), q.query))
  get('/purchase/invoices/:id', 'Purchase invoice fetched.', (q, r) => service.getInvoice(account(r), idOf(q)))
  post('/purchase/invoices', 'Purchase invoice saved.', (q, r) => service.saveInvoice(account(r), null, q.body), 201)
  post('/purchase/invoices/:id/post', 'Purchase invoice posted.', (q, r) => service.postInvoice(account(r), idOf(q)))
  post('/purchase/invoices/:id/cancel', 'Purchase invoice cancelled.', (q, r) => service.cancelInvoice(account(r), idOf(q), q.body))
  post('/purchase/invoices/:id', 'Purchase invoice saved.', (q, r) => service.saveInvoice(account(r), idOf(q), q.body))

  get('/purchase/returns', 'Purchase returns fetched.', (q, r) => service.listReturns(account(r), q.query))
  get('/purchase/returns/:id', 'Purchase return fetched.', (q, r) => service.getReturn(account(r), idOf(q)))
  post('/purchase/returns', 'Purchase return saved.', (q, r) => service.saveReturn(account(r), null, q.body), 201)
  post('/purchase/returns/:id/post', 'Purchase return posted. Stock updated.', (q, r) => service.postReturn(account(r), idOf(q)))
  post('/purchase/returns/:id/cancel', 'Purchase return cancelled.', (q, r) => service.cancelReturn(account(r), idOf(q), q.body))
  post('/purchase/returns/:id', 'Purchase return saved.', (q, r) => service.saveReturn(account(r), idOf(q), q.body))

  get('/purchase/notes', 'Notes fetched.', (q, r) => service.listNotes(account(r), q.query))
  get('/purchase/debit-notes/:id', 'Debit note fetched.', (q, r) => service.getDebitNote(account(r), idOf(q)))
  post('/purchase/debit-notes/:id/:action', 'Debit note updated.', (q, r) => service.debitNoteAction(account(r), idOf(q), String(q.params.action), q.body))
  get('/purchase/credit-notes/:id', 'Credit note fetched.', (q, r) => service.getCreditNote(account(r), idOf(q)))
  post('/purchase/credit-notes', 'Credit note saved.', (q, r) => service.saveCreditNote(account(r), null, q.body), 201)
  post('/purchase/credit-notes/:id/post', 'Credit note posted.', (q, r) => service.postCreditNote(account(r), idOf(q)))
  post('/purchase/credit-notes/:id/cancel', 'Credit note cancelled.', (q, r) => service.cancelCreditNote(account(r), idOf(q), q.body))
  post('/purchase/credit-notes/:id', 'Credit note saved.', (q, r) => service.saveCreditNote(account(r), idOf(q), q.body))

  get('/purchase/suppliers/:id/ledger', 'Ledger fetched.', (q, r) => service.ledger(account(r), idOf(q), q.query))
  get('/purchase/suppliers/:id/open-items', 'Open items fetched.', (q, r) => service.openItems(account(r), idOf(q)))
  get('/purchase/reports', 'Reports fetched.', async () => service.reportList())
  get('/purchase/reports/:key', 'Report fetched.', (q, r) => service.report(account(r), String(q.params.key), q.query))
  get('/purchase/outstanding', 'Outstanding fetched.', (q, r) => service.outstanding(account(r), q.query))
  get('/purchase/payments', 'Payments fetched.', (q, r) => service.listPayments(account(r), q.query))
  get('/purchase/payments/:id', 'Payment fetched.', (q, r) => service.getPayment(account(r), idOf(q)))
  post('/purchase/payments', 'Payment saved.', (q, r) => service.savePayment(account(r), q.body), 201)
  post('/purchase/payments/:id/allocate', 'Advance allocated.', (q, r) => service.allocateAdvance(account(r), idOf(q), q.body))
  post('/purchase/payments/:id/cancel', 'Payment cancelled.', (q, r) => service.cancelPayment(account(r), idOf(q), q.body))
  post('/purchase/payments/:id/cheque', 'Cheque status updated.', (q, r) => service.chequeStatus(account(r), idOf(q), q.body))

  router.use((error: unknown, _request: Request, response: Response, next: (error: unknown) => void) => {
    if (error instanceof ApiError || error instanceof PurchaseError) { response.status(error.status).json({ errors: error.message }); return }
    next(error)
  })
  return router
}
