import { Router, type RequestHandler, type Response } from 'express'
import { authenticate, type AuthenticatedLocals } from '../../middlewares/auth/authenticate.ts'
import { ApiError, type AuthService } from '../auth/service.ts'
import type { ReportService } from './service.ts'

type AsyncHandler = (request: Parameters<RequestHandler>[0], response: Parameters<RequestHandler>[1]) => Promise<void>
const handle = (action: AsyncHandler): RequestHandler => (request, response, next) => { void action(request, response).catch(next) }
const jsonOnly: RequestHandler = (request, response, next) => { if (!request.is('application/json')) { response.status(400).json({ errors: 'Content-Type must be application/json.' }); return } next() }

export function createReportRouter(auth: AuthService, service: ReportService) {
  const router = Router(), protectedRoute = authenticate(auth), account = (response: Response) => (response.locals as AuthenticatedLocals).account
  router.post('/getSalesReport', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Sales report fetched successfully.', data: await service.sales(account(response), request.body) }) }))
  router.post('/getPaymentCollectionReport', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Payment collection report fetched successfully.', data: await service.paymentCollection(account(response), request.body) }) }))
  router.post('/getTaxBreakupReport', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Tax breakup report fetched successfully.', data: await service.taxBreakup(account(response), request.body) }) }))
  router.post('/getBillWiseSalesReport', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Billwise sales report fetched successfully.', data: await service.billWiseSales(account(response), request.body) }) }))
  router.post('/getTransferInReport', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Transfer In report fetched successfully.', data: await service.transfer(account(response), 'in', request.body) }) }))
  router.post('/getTransferOutReport', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Transfer Out report fetched successfully.', data: await service.transfer(account(response), 'out', request.body) }) }))
  router.post('/getBillSummaryReport', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Bill summary report fetched successfully.', data: await service.billSummary(account(response), request.body) }) }))
  router.post('/getStockStatusReport', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Stock status report fetched successfully.', data: await service.stockStatus(account(response), request.body) }) }))
  router.post('/getKotReport', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'KOT report fetched successfully.', data: await service.kot(account(response), request.body) }) }))
  router.post('/getSalesmanReport', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Salesman report fetched successfully.', data: await service.salesman(account(response), request.body) }) }))
  router.post('/getCustomerSalesReport', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Customer sales report fetched successfully.', data: await service.customerSales(account(response), request.body) }) }))
  router.use((error: unknown, _request: unknown, response: Response, next: (error: unknown) => void) => { if (error instanceof ApiError) { response.status(error.status).json({ errors: error.message }); return } next(error) })
  return router
}
