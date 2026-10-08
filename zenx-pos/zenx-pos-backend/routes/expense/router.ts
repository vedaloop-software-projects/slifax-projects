import { Router, type RequestHandler, type Response } from 'express'
import { authenticate, type AuthenticatedLocals } from '../../middlewares/auth/authenticate.ts'
import { ApiError, type AuthService } from '../auth/service.ts'
import type { ExpenseService } from './service.ts'

type AsyncHandler = (request: Parameters<RequestHandler>[0], response: Parameters<RequestHandler>[1]) => Promise<void>
const handle = (action: AsyncHandler): RequestHandler => (request, response, next) => { void action(request, response).catch(next) }
const jsonOnly: RequestHandler = (request, response, next) => { if (!request.is('application/json')) { response.status(400).json({ errors: 'Content-Type must be application/json.' }); return } next() }

export function createExpenseRouter(auth: AuthService, service: ExpenseService) {
  const router = Router(), protectedRoute = authenticate(auth), account = (response: Response) => (response.locals as AuthenticatedLocals).account
  router.post('/addExpenseHead', protectedRoute, jsonOnly, handle(async (request, response) => { await service.addHead(account(response), request.body); response.json({ success: true, message: 'Expense Head added successfully.', data: null }) }))
  router.post('/updateExpenseHead', protectedRoute, jsonOnly, handle(async (request, response) => { await service.updateHead(account(response), request.body); response.json({ success: true, message: 'Expense Head updated successfully.', data: null }) }))
  router.post('/getExpenseHeads', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Expense Heads fetched successfully.', data: await service.getHeads(account(response), request.body) }) }))
  router.post('/getExpenseHeadById', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Expense Head details fetched successfully.', data: await service.getHead(account(response), request.body) }) }))
  router.post('/addExpense', protectedRoute, jsonOnly, handle(async (request, response) => { await service.addExpense(account(response), request.body); response.json({ success: true, message: 'Expense added successfully.', data: null }) }))
  router.post('/cancelExpense', protectedRoute, jsonOnly, handle(async (request, response) => { await service.cancelExpense(account(response), request.body); response.json({ success: true, message: 'Expense cancelled successfully.', data: null }) }))
  router.post('/getExpenses', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Expenses fetched successfully.', data: await service.getExpenses(account(response), request.body) }) }))
  router.post('/getExpenseById', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Expense details fetched successfully.', data: await service.getExpense(account(response), request.body) }) }))
  router.post('/exportExpenses', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Expense export generated successfully.', data: await service.exportExpenses(account(response), request.body) }) }))
  router.use((error: unknown, _request: unknown, response: Response, next: (error: unknown) => void) => { if (error instanceof ApiError) { response.status(error.status).json({ errors: error.message }); return } next(error) })
  return router
}
