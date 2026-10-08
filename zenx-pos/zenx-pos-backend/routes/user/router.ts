import { Router, type RequestHandler, type Response } from 'express'
import { authenticate, type AuthenticatedLocals } from '../../middlewares/auth/authenticate.ts'
import { ApiError, type AuthService } from '../auth/service.ts'
import type { UserService } from './service.ts'
type AsyncHandler = (request: Parameters<RequestHandler>[0], response: Parameters<RequestHandler>[1]) => Promise<void>
const handle = (action: AsyncHandler): RequestHandler => (request, response, next) => { void action(request, response).catch(next) }
const jsonOnly: RequestHandler = (request, response, next) => { if (!request.is('application/json')) { response.status(400).json({ errors: 'Content-Type must be application/json.' }); return } next() }
export function createUserRouter(auth: AuthService, service: UserService) { const router = Router(), protectedRoute = authenticate(auth), account = (response: Response) => (response.locals as AuthenticatedLocals).account
  router.post('/addUser', protectedRoute, jsonOnly, handle(async (request, response) => { await service.add(account(response), request.body); response.json({ success: true, message: 'User added successfully.', data: null }) }))
  router.post('/updateUser', protectedRoute, jsonOnly, handle(async (request, response) => { await service.update(account(response), request.body); response.json({ success: true, message: 'User updated successfully.', data: null }) }))
  router.post('/getUsers', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Users fetched successfully.', data: await service.many(account(response), request.body) }) }))
  router.post('/getUserById', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'User details fetched successfully.', data: await service.one(account(response), request.body) }) }))
  router.use((error: unknown, _request: unknown, response: Response, next: (error: unknown) => void) => { if (error instanceof ApiError) { response.status(error.status).json({ errors: error.message }); return } next(error) }); return router }
