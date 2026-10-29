import { Router, type RequestHandler, type Response } from 'express'
import { z } from 'zod'
import type { AdminIdentity } from '../../models/admin/contracts.ts'
import { businessDate, closeBusinessDay, pendingDayCloses, recentDayCloses, reopenBusinessDay } from '../../models/billing/day-close.ts'
import type { PrismaPlatformAdminStore } from '../../models/platform/admin-store.ts'
import type { PlatformSettingsStore, RegistrationStore, SessionStore } from '../../models/platform/contracts.ts'
import { ApiError } from '../auth/service.ts'
import type { LetterheadStore } from '../../models/documents/contracts.ts'
import { DEFAULT_LETTERHEAD, parseLetterhead } from '../../models/documents/letterhead.ts'
import { renderInvoicePdf } from '../../models/subscription/invoice-pdf.ts'
import { cookieValue, readAdminSession } from './session.ts'
import type { AdminService } from './service.ts'

const wrap = (handler: RequestHandler): RequestHandler => (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next) }
const clientId = (raw: string | string[] | undefined) => { const value = Array.isArray(raw) ? raw[0] : raw; if (!value || !/^[1-9]\d*$/.test(value)) throw new ApiError(422, 'Invalid client id.'); return BigInt(value) }
const parse = <T>(schema: z.ZodType<T>, body: unknown, message: string) => { const parsed = schema.safeParse(body); if (!parsed.success) throw new ApiError(422, parsed.error.issues[0]?.message ?? message); return parsed.data }

const settingsSchema = z.object({
  renewal_grace_days: z.coerce.number().int().min(0, 'Grace days cannot be negative.').max(90, 'Grace days cannot exceed 90.').optional(),
  max_devices_per_user: z.coerce.number().int().min(1, 'At least one device must be allowed.').max(20, 'At most 20 devices can be allowed.').optional(),
})
const deviceLimitSchema = z.object({ maxLoginDevices: z.union([z.null(), z.coerce.number().int().min(1).max(20)]) })
const revokeSchema = z.object({ sessionId: z.string().regex(/^[0-9a-f]{64}$/).optional() })
const dayCloseSchema = z.object({ date: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, 'Date must be DD-MM-YYYY.'), action: z.enum(['close', 'reopen']) })
const reviewSchema = z.object({ status: z.enum(['approved', 'rejected']), note: z.string().trim().max(1000).nullish(), clientId: z.coerce.number().int().positive().nullish() })

export type PlatformAdminDeps = { admins: AdminService; store: PrismaPlatformAdminStore; settings: PlatformSettingsStore; sessions: SessionStore; registrations: RegistrationStore; letterheads: LetterheadStore }

// A realistic invoice so the designer preview shows the letterhead around real content.
const SAMPLE_INVOICE = { number: 'REN-1024', date: '20-10-2026', generatedAt: '20-10-2026', buyer: { name: 'Sample Retail Store', contact: 'Store owner', address: 'Kondapur, Hyderabad, 500084', gstin: '36ABCDE1234F1Z5', mobile: '9876543210', email: 'owner@example.com' },
  description: 'ZenxPOS yearly subscription', detail: '12 months of ZenxPOS service', taxable: 10000, gstPercent: 18, gstAmount: 1800, total: 11800, paymentMode: 'Bank / UPI / Online', reference: 'cf_order_1024' }
const letterheadInput = (body: unknown) => { const parsed = parseLetterhead(body); if (!parsed.success) throw new ApiError(422, parsed.error.issues[0]?.message ?? 'Invalid letterhead.'); return parsed.data }

export function createPlatformAdminRouter({ admins, store, settings, sessions, registrations, letterheads }: PlatformAdminDeps, secret: string, rawPath = '/admin') {
  const router = Router(), path = '/' + rawPath.replace(/^\/+|\/+$/g, '')
  const auth: RequestHandler = (request, response, next) => { void (async () => { const session = readAdminSession(cookieValue(request.headers.cookie, 'zenx_admin'), secret), admin = session && await admins.store.findAdminById(session.adminId); if (!session || !admin) throw new ApiError(401, 'Admin authentication required.'); response.locals.admin = admin as AdminIdentity; next() })().catch(next) }
  const actor = (response: Response) => response.locals.admin as AdminIdentity
  const tenant = async (raw: string | string[] | undefined) => { const id = clientId(raw), client = await store.client(id); if (!client) throw new ApiError(404, 'Client not found.'); return client }

  router.get(path + '/platform-settings', auth, wrap(async (_request, response) => { response.json({ success: true, data: await settings.list() }) }))
  router.post(path + '/platform-settings', auth, wrap(async (request, response) => {
    const values = parse(settingsSchema, request.body, 'Invalid settings.')
    await settings.update(Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)])), actor(response).id)
    response.json({ success: true, message: 'Settings saved.', data: await settings.list() })
  }))

  router.get(path + '/letterhead', auth, wrap(async (_request, response) => {
    const saved = await letterheads.get()
    response.json({ success: true, data: { design: saved?.design ?? DEFAULT_LETTERHEAD, updatedAt: saved?.updatedAt ?? null, isDefault: !saved } })
  }))
  router.post(path + '/letterhead', auth, wrap(async (request, response) => {
    const design = letterheadInput(request.body)
    await letterheads.save(design, actor(response).id)
    response.json({ success: true, message: 'Letterhead saved. New invoices and quotations use it right away.', data: { design, updatedAt: new Date(), isDefault: false } })
  }))
  // Unsaved preview: renders a sample invoice with the design being edited.
  router.post(path + '/letterhead/preview', auth, wrap(async (request, response) => {
    const pdf = await renderInvoicePdf(SAMPLE_INVOICE, letterheadInput(request.body))
    response.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="letterhead-preview.pdf"', 'Cache-Control': 'no-store' }).send(pdf)
  }))

  router.get(path + '/active-sessions', auth, wrap(async (_request, response) => {
    response.json({ success: true, data: { defaultDeviceLimit: await settings.maxDevicesPerUser(), clients: await store.sessionSummary() } })
  }))
  router.get(path + '/client/:id/sessions', auth, wrap(async (request, response) => {
    const client = await tenant(request.params.id)
    response.json({ success: true, data: { clientId: client.id, businessName: client.business_name, maxLoginDevices: client.max_login_devices, defaultDeviceLimit: await settings.maxDevicesPerUser(), sessions: await sessions.listActive(client.id) } })
  }))
  router.post(path + '/client/:id/sessions/revoke', auth, wrap(async (request, response) => {
    const client = await tenant(request.params.id), { sessionId } = parse(revokeSchema, request.body ?? {}, 'Invalid session.')
    if (sessionId) {
      if (!(await sessions.listActive(client.id)).some(row => row.sessionId === sessionId)) throw new ApiError(404, 'Session not found.')
      await sessions.revoke(sessionId, 'admin_signout')
      response.json({ success: true, message: 'Device signed out.', data: { revoked: 1 } })
    } else response.json({ success: true, message: 'All devices signed out.', data: { revoked: await sessions.revokeClient(client.id, 'admin_signout') } })
  }))
  router.post(path + '/client/:id/device-limit', auth, wrap(async (request, response) => {
    const client = await tenant(request.params.id), { maxLoginDevices } = parse(deviceLimitSchema, request.body, 'Device limit must be between 1 and 20, or empty for the platform default.')
    await store.setDeviceLimit(client.id, maxLoginDevices, actor(response).id)
    response.json({ success: true, message: 'Device limit saved.', data: { maxLoginDevices } })
  }))

  router.get(path + '/client/:id/day-close', auth, wrap(async (request, response) => {
    const client = await tenant(request.params.id)
    const [pending, closes] = await Promise.all([pendingDayCloses(store.prisma, client.id), recentDayCloses(store.prisma, client.id)])
    response.json({ success: true, data: { clientId: client.id, businessName: client.business_name, pendingDates: pending, closes } })
  }))
  router.post(path + '/client/:id/day-close', auth, wrap(async (request, response) => {
    const client = await tenant(request.params.id), input = parse(dayCloseSchema, request.body, 'Invalid day close request.')
    const userId = await store.primaryUserId(client.id)
    if (!userId) throw new ApiError(422, 'Client has no admin user to record the day close against.')
    const description = `Super admin ${actor(response).name} ${input.action === 'close' ? 'closed' : 'reopened'} ${input.date}`
    const target = businessDate(input.date), dayActor = { clientId: client.id, userId, auditDescription: description }
    const data = input.action === 'close' ? await closeBusinessDay(store.prisma, dayActor, target) : await reopenBusinessDay(store.prisma, dayActor, target)
    response.json({ success: true, message: input.action === 'close' ? `Day ${input.date} closed.` : `Day ${input.date} reopened.`, data })
  }))

  router.get(path + '/registrations', auth, wrap(async (request, response) => {
    const status = typeof request.query.status === 'string' && ['pending', 'approved', 'rejected'].includes(request.query.status) ? request.query.status : undefined
    const page = Math.max(1, Number(request.query.page) || 1), perPage = 25
    const result = await registrations.list(status, page, perPage)
    response.json({ success: true, data: result.rows, meta: { total: result.total, pageSize: perPage } })
  }))
  router.post(path + '/registrations/:id/review', auth, wrap(async (request, response) => {
    const id = clientId(request.params.id), input = parse(reviewSchema, request.body, 'Invalid review.')
    if (!await registrations.review(id, input.status, actor(response).id, input.note ?? null, input.clientId ? BigInt(input.clientId) : null)) throw new ApiError(404, 'Pending registration not found.')
    response.json({ success: true, message: input.status === 'approved' ? 'Registration approved.' : 'Registration rejected.' })
  }))

  router.use((error: unknown, _request: unknown, response: Response, next: (error: unknown) => void) => { if (error instanceof ApiError) { response.status(error.status).json({ errors: error.message }); return } next(error) })
  return router
}
