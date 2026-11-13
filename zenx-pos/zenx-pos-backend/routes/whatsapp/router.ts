import { Router, type Request, type RequestHandler, type Response } from 'express'
import type { AdminIdentity } from '../../models/admin/contracts.ts'
import { authenticate, type AuthenticatedLocals } from '../../middlewares/auth/authenticate.ts'
import { ApiError, type AuthService } from '../auth/service.ts'
import { cookieValue, readAdminSession } from '../admin/session.ts'
import type { AdminService } from '../admin/service.ts'
import type { WhatsAppService } from './service.ts'

const wrap = (handler: RequestHandler): RequestHandler => (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next) }
const account = (response: Response) => (response.locals as AuthenticatedLocals).account
const parameter = (value: unknown) => Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
const ok = (response: Response, message: string, data: unknown, status = 200) => { response.status(status).json({ success: true, message, data }) }
const errors = (error: unknown, _request: unknown, response: Response, next: (error: unknown) => void) => {
  if (error instanceof ApiError) { response.status(error.status).json({ errors: error.message, ...(error.details === undefined ? {} : { data: error.details }) }); return }
  next(error)
}

// Raw request bytes, captured by the JSON parser for webhook signature checks.
export type RawBodyRequest = Request & { rawBody?: Buffer }

// Store app: /api/whatsapp/...
export function createWhatsAppRouter(auth: AuthService, service: WhatsAppService) {
  const router = Router(), guard = authenticate(auth)
  router.get('/whatsapp/overview', guard, wrap(async (_request, response) => { response.set('Cache-Control', 'no-store'); ok(response, 'WhatsApp overview fetched.', await service.overview(account(response))) }))
  router.get('/whatsapp/templates', guard, wrap(async (_request, response) => { ok(response, 'Templates fetched.', await service.templates(account(response))) }))
  router.post('/whatsapp/quote', guard, wrap(async (request, response) => { ok(response, 'Quote prepared.', await service.quote(account(response), request.body)) }))
  router.post('/whatsapp/send', guard, wrap(async (request, response) => {
    const data = await service.send(account(response), request.body)
    ok(response, data.status === 'queued' ? 'Messages are being sent.' : 'Complete the payment to send the messages.', data, 201)
  }))
  router.post('/whatsapp/wallet/topup', guard, wrap(async (request, response) => { ok(response, 'Cashfree checkout created.', await service.topup(account(response), request.body), 201) }))
  router.post('/whatsapp/payments/verify', guard, wrap(async (request, response) => { ok(response, 'Payment status verified.', await service.verifyPayment(account(response), request.body)) }))
  router.get('/whatsapp/campaigns', guard, wrap(async (request, response) => { ok(response, 'Campaigns fetched.', await service.campaigns(account(response), request.query.page)) }))
  router.get('/whatsapp/campaigns/:id', guard, wrap(async (request, response) => { ok(response, 'Campaign fetched.', await service.campaign(account(response), parameter(request.params.id))) }))
  router.get('/whatsapp/wallet', guard, wrap(async (request, response) => { ok(response, 'Wallet fetched.', await service.wallet(account(response), request.query.page)) }))

  // VedaLoop delivery reports (Connectors → WhatsApp API → webhook URL https://<api>/api/whatsapp/webhook/vedaloop).
  router.post('/whatsapp/webhook/vedaloop', wrap(async (request, response) => {
    const accepted = await service.webhook((request as RawBodyRequest).rawBody, {
      timestamp: request.header('x-vedaloop-timestamp'), signature: request.header('x-vedaloop-signature'), event: request.header('x-vedaloop-event'),
    })
    if (!accepted) { response.status(401).json({ errors: 'Invalid signature.' }); return }
    response.status(204).end()
  }))
  router.use(errors)
  return router
}

// Super admin: <ADMIN_PATH>/whatsapp/... and <ADMIN_PATH>/client/:id/whatsapp
export function createWhatsAppAdminRouter(admins: AdminService, service: WhatsAppService, secret: string, rawPath = '/admin') {
  const router = Router(), path = '/' + rawPath.replace(/^\/+|\/+$/g, '')
  const auth: RequestHandler = (request, response, next) => { void (async () => {
    const session = readAdminSession(cookieValue(request.headers.cookie, 'zenx_admin'), secret), admin = session && await admins.store.findAdminById(session.adminId)
    if (!session || !admin) throw new ApiError(401, 'Admin authentication required.')
    response.locals.admin = admin as AdminIdentity; next()
  })().catch(next) }
  const actor = (response: Response) => (response.locals.admin as AdminIdentity).id
  const id = (raw: unknown, what: string) => { const value = parameter(raw); if (!/^[1-9]\d*$/.test(value)) throw new ApiError(422, `Invalid ${what} id.`); return BigInt(value) }
  const client = (raw: unknown) => id(raw, 'client')

  router.get(path + '/whatsapp/templates', auth, wrap(async (_request, response) => { ok(response, 'Templates fetched.', await service.adminTemplates()) }))
  router.get(path + '/whatsapp/provider-templates', auth, wrap(async (_request, response) => { ok(response, 'Provider templates fetched.', await service.providerTemplates()) }))
  router.post(path + '/whatsapp/templates', auth, wrap(async (request, response) => { ok(response, 'Template saved.', await service.saveTemplate(null, request.body, actor(response)), 201) }))
  router.post(path + '/whatsapp/templates/:id', auth, wrap(async (request, response) => { ok(response, 'Template saved.', await service.saveTemplate(id(request.params.id, 'template'), request.body, actor(response))) }))
  router.get(path + '/client/:id/whatsapp', auth, wrap(async (request, response) => { ok(response, 'WhatsApp settings fetched.', await service.clientSettings(client(request.params.id))) }))
  router.post(path + '/client/:id/whatsapp', auth, wrap(async (request, response) => { ok(response, 'WhatsApp settings saved.', await service.setClientSettings(client(request.params.id), request.body, actor(response))) }))
  router.post(path + '/client/:id/whatsapp/wallet', auth, wrap(async (request, response) => { ok(response, 'Wallet adjusted.', await service.adjustWallet(client(request.params.id), request.body, actor(response))) }))
  router.use(errors)
  return router
}
