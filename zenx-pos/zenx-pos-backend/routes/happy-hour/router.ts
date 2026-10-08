import { Router, type RequestHandler, type Response } from 'express'
import { authenticate, type AuthenticatedLocals } from '../../middlewares/auth/authenticate.ts'
import { ApiError, type AuthService } from '../auth/service.ts'
import type { HappyHourService } from './service.ts'
type AsyncHandler = (request: Parameters<RequestHandler>[0], response: Parameters<RequestHandler>[1]) => Promise<void>
const handler = (fn: AsyncHandler): RequestHandler => (request, response, next) => { void fn(request, response).catch(next) }
const json: RequestHandler = (request, response, next) => { if (!request.is('application/json')) { response.status(400).json({ errors: 'Content-Type must be application/json.' }); return } next() }
export function createHappyHourRouter(auth: AuthService, service: HappyHourService) {
  const router = Router(), protect = authenticate(auth), account = (response: Response) => (response.locals as AuthenticatedLocals).account
  const routes: Array<[string, (a: ReturnType<typeof account>, body: unknown) => Promise<unknown>, string]> = [
    ['/addHappyHour', (a, b) => service.addProduct(a, b), 'Happy Hour added successfully.'], ['/updateHappyHour', (a, b) => service.editProduct(a, b), 'Happy Hour updated successfully.'], ['/getHappyHours', (a, b) => service.products(a, b), 'Happy Hours fetched successfully.'], ['/getHappyHourById', (a, b) => service.oneProduct(a, b), 'Happy Hour details fetched successfully.'], ['/deleteHappyHourChild', (a, b) => service.removeProduct(a, b), 'Happy Hour child deleted successfully.'],
    ['/addGroupWiseHappyHour', (a, b) => service.addGroup(a, b), 'Group Wise Happy Hour added successfully.'], ['/updateGroupWiseHappyHour', (a, b) => service.editGroup(a, b), 'Group Wise Happy Hour updated successfully.'], ['/getGroupWiseHappyHours', (a, b) => service.groups(a, b), 'Group Wise Happy Hours fetched successfully.'], ['/getGroupWiseHappyHourById', (a, b) => service.oneGroup(a, b), 'Group Wise Happy Hour details fetched successfully.'], ['/deleteGroupWiseHappyHourChild', (a, b) => service.removeGroup(a, b), 'Child group wise happy hour deleted successfully.'],
  ]
  for (const [path, action, message] of routes) router.post(path, protect, json, handler(async (request, response) => { const data = await action(account(response), request.body); response.json({ success: true, message, data: data ?? null }) }))
  router.use((error: unknown, _request: unknown, response: Response, next: (error: unknown) => void) => { if (error instanceof ApiError) { response.status(error.status).json({ errors: error.message }); return } next(error) })
  return router
}
