import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import type { Account } from '../../../models/auth/contracts.ts'
import type { CampaignContent, CampaignRow, CreateCampaignInput, Month, OutboundRow, PaymentResult, Template, TemplateInput, WhatsAppSettings, WhatsAppStore } from '../../../models/whatsapp/contracts.ts'
import { advances, monthRange, planSend } from '../../../models/whatsapp/plan.ts'
import { VedaloopWhatsAppProvider, verifyVedaloopSignature, type OutgoingMessage, type SendResult, type WhatsAppProvider } from '../../../models/whatsapp/provider.ts'
import { inputVariables, placeholders, render, validateValues } from '../../../models/whatsapp/templates.ts'
import { normalizeMobile, WhatsAppDispatcher, WhatsAppService } from '../service.ts'

const ACTIVE = ['queued', 'sending', 'accepted', 'sent', 'delivered', 'read']

type Message = { id: bigint; campaignId: bigint; clientId: bigint; customerId: bigint | null; customerName: string | null; mobile: string; body: string; charge: string; status: string; providerId: string | null; error: string | null; attempts: number; createdAt: Date; updatedAt: Date }
type Campaign = CampaignRow & { clientId: bigint; content: CampaignContent }

class MemoryStore implements WhatsAppStore {
  client: WhatsAppSettings = { enabled: true, monthlyQuota: 3, pricePaise: null, walletPaise: 0, businessName: 'Asha Stores', contactPerson: 'Asha', email: 'asha@example.com', mobile: '9876543210', timeZone: 'Asia/Kolkata' }
  defaultPrice = 120
  tmpl: Template[] = [
    { id: 1n, name: 'Special offer', category: 'marketing', body: 'Hi {{customer_name}}, {{store_name}} has {{offer_details}}. Valid till {{valid_till}}.', providerTemplate: 'zenxpos_special_offer', language: 'en', status: 1, sortOrder: 1, updatedAt: null },
    { id: 2n, name: 'Retired', category: 'marketing', body: 'Hi {{customer_name}}', providerTemplate: 'old', language: 'en', status: 0, sortOrder: 2, updatedAt: null },
  ]
  people = [{ id: 11n, name: 'Ravi Kumar', mobile: '9000000001' }, { id: 12n, name: null, mobile: '9000000002' }, { id: 13n, name: 'Bad', mobile: '12345' }]
  campaignsList: Campaign[] = []
  messages: Message[] = []
  wallet: Array<{ id: bigint; type: string; amountPaise: number; balanceAfterPaise: number; campaignId: bigint | null; orderId: string | null; note: string | null; createdAt: Date }> = []
  payments = new Map<string, { amountPaise: number; status: string }>()
  clock = () => new Date()

  async settings() { return { ...this.client } }
  async defaultPricePaise() { return this.defaultPrice }
  async freeUsed(_clientId: bigint, month: Month, holdSince: Date) {
    return this.messages.filter(m => m.charge === 'free' && m.createdAt >= month.gte && m.createdAt < month.lt && (ACTIVE.includes(m.status) || m.status === 'awaiting_payment' && m.createdAt >= holdSince)).length
  }
  async templates(activeOnly: boolean) { return this.tmpl.filter(t => !activeOnly || t.status === 1) }
  async template(id: bigint) { return this.tmpl.find(t => t.id === id) ?? null }
  async customers(_clientId: bigint, ids: bigint[]) { return this.people.filter(p => ids.includes(p.id)) }
  async createCampaign(input: CreateCampaignInput) {
    const freeUsed = await this.freeUsed(input.clientId, input.month, input.holdSince)
    const plan = planSend({ recipients: input.recipients.length, quota: this.client.monthlyQuota, freeUsed, pricePaise: this.client.pricePaise ?? input.defaultPricePaise, walletPaise: this.client.walletPaise, mode: input.mode, expectedAmountPaise: input.expectedAmountPaise })
    if (!plan.ok) return { plan, campaignId: null }
    const id = BigInt(this.campaignsList.length + 1), now = this.clock()
    this.campaignsList.push({ id, clientId: input.clientId, content: input.content, templateName: input.templateName, recipientCount: plan.quote.recipients, freeCount: plan.quote.free, paidCount: plan.quote.paid, pricePaise: plan.quote.pricePaise, amountPaise: plan.quote.amountPaise, paymentMode: plan.paymentMode, orderId: plan.paymentMode === 'online' ? input.orderId : null, status: plan.status, sentCount: 0, failedCount: 0, refundedPaise: 0, createdAt: now, paidAt: null, completedAt: null })
    input.recipients.forEach((r, index) => this.messages.push({ id: BigInt(this.messages.length + 1), campaignId: id, clientId: input.clientId, customerId: r.customerId, customerName: r.name, mobile: r.mobile, body: r.body, charge: index < plan.quote.free ? 'free' : 'paid', status: plan.status === 'queued' ? 'queued' : 'awaiting_payment', providerId: null, error: null, attempts: 0, createdAt: now, updatedAt: now }))
    if (plan.walletDebitPaise) this.move(-plan.walletDebitPaise, 'send', id, null)
    return { plan, campaignId: id }
  }
  private move(amountPaise: number, type: string, campaignId: bigint | null, orderId: string | null) {
    this.client.walletPaise += amountPaise
    this.wallet.push({ id: BigInt(this.wallet.length + 1), type, amountPaise, balanceAfterPaise: this.client.walletPaise, campaignId, orderId, note: null, createdAt: this.clock() })
  }
  async cancelCampaign(_clientId: bigint, campaignId: bigint) {
    const campaign = this.campaignsList.find(c => c.id === campaignId)
    if (campaign?.status === 'pending_payment') campaign.status = 'expired'
    for (const m of this.messages) if (m.campaignId === campaignId && m.status === 'awaiting_payment') m.status = 'cancelled'
  }
  async expireUnpaid(before: Date) { let n = 0; for (const c of this.campaignsList) if (c.status === 'pending_payment' && c.createdAt < before) { await this.cancelCampaign(c.clientId, c.id); n++ } return n }
  async recordCheckout(input: { orderId: string; amountPaise: number }) { this.payments.set(input.orderId, { amountPaise: input.amountPaise, status: 'created' }) }
  private claim(orderId: string, amountPaise: number) {
    const payment = this.payments.get(orderId)
    if (!payment) return 'missing'
    if (payment.amountPaise !== amountPaise) return 'amount_mismatch'
    if (payment.status === 'paid') return 'already'
    payment.status = 'paid'
    return 'claimed'
  }
  async completeTopup(input: { orderId: string; amountPaise: number }): Promise<PaymentResult> {
    const claim = this.claim(input.orderId, input.amountPaise)
    if (claim === 'missing' || claim === 'amount_mismatch') return { status: claim }
    if (claim === 'already') return { status: 'already', walletPaise: this.client.walletPaise }
    this.move(input.amountPaise, 'topup', null, input.orderId)
    return { status: 'credited', walletPaise: this.client.walletPaise }
  }
  async completeCampaignPayment(input: { orderId: string; amountPaise: number }): Promise<PaymentResult> {
    const campaign = this.campaignsList.find(c => c.orderId === input.orderId)
    if (!campaign) return { status: 'missing' }
    const claim = this.claim(input.orderId, input.amountPaise)
    if (claim === 'missing' || claim === 'amount_mismatch') return { status: claim }
    if (claim === 'already') return { status: 'already', campaignId: campaign.id }
    campaign.status = 'queued'
    for (const m of this.messages) if (m.campaignId === campaign.id && ['awaiting_payment', 'cancelled'].includes(m.status)) m.status = 'queued'
    return { status: 'queued', campaignId: campaign.id }
  }
  async claimQueued(limit: number) {
    const rows = this.messages.filter(m => m.status === 'queued').slice(0, limit)
    for (const m of rows) m.status = 'sending'
    return rows.map((m): OutboundRow => ({ id: m.id, campaignId: m.campaignId, clientId: m.clientId, mobile: m.mobile, customerName: m.customerName, attempts: m.attempts, content: this.campaignsList.find(c => c.id === m.campaignId)!.content }))
  }
  private msg(id: bigint) { return this.messages.find(m => m.id === id)! }
  async markAccepted(id: bigint, providerId: string, status: string) { const m = this.msg(id); m.status = advances('accepted', status) ? status : 'accepted'; m.providerId = providerId; this.campaignsList.find(c => c.id === m.campaignId)!.sentCount++ }
  async markRetry(id: bigint, error: string) { const m = this.msg(id); m.status = 'queued'; m.attempts++; m.error = error }
  async markFailed(id: bigint, error: string) {
    const m = this.msg(id)
    if (!advances(m.status, 'failed')) return
    const counted = !['queued', 'sending'].includes(m.status)
    m.status = 'failed'; m.error = error
    const c = this.campaignsList.find(x => x.id === m.campaignId)!
    c.failedCount++; if (counted) c.sentCount--
    if (m.charge === 'paid') { this.move(c.pricePaise, 'refund', c.id, null); c.refundedPaise += c.pricePaise }
  }
  async applyProviderStatus(providerId: string, status: string, error: string | null) {
    const m = this.messages.find(x => x.providerId === providerId)
    if (!m) return
    if (status === 'failed') return this.markFailed(m.id, error ?? 'failed')
    if (advances(m.status, status)) m.status = status
  }
  async failStuck() { return 0 }
  async completeCampaigns() { let n = 0; for (const c of this.campaignsList) if (c.status === 'queued' && !this.messages.some(m => m.campaignId === c.id && ['queued', 'sending', 'awaiting_payment'].includes(m.status))) { c.status = 'completed'; n++ } return n }
  async campaigns() { return { rows: [...this.campaignsList].reverse(), total: this.campaignsList.length } }
  async campaign(_clientId: bigint, id: bigint) { const c = this.campaignsList.find(x => x.id === id); return c ? { campaign: c, messages: this.messages.filter(m => m.campaignId === id).map(m => ({ id: m.id, customerName: m.customerName, mobile: m.mobile, body: m.body, charge: m.charge, status: m.status, error: m.error, sentAt: null })) } : null }
  async walletTransactions() { return { rows: [...this.wallet].reverse(), total: this.wallet.length } }
  async saveTemplate(_id: bigint | null, input: TemplateInput) { this.tmpl.push({ id: 99n, ...input, updatedAt: null }); return 99n }
  async setClientSettings(_clientId: bigint, input: { enabled: boolean; monthlyQuota: number; pricePaise: number | null }) { Object.assign(this.client, input); return true }
  async adjustWallet(_clientId: bigint, amountPaise: number) { if (this.client.walletPaise + amountPaise < 0) return null; this.move(amountPaise, 'adjustment', null, null); return this.client.walletPaise }
}

class FakeProvider implements WhatsAppProvider {
  available = true
  simulated = false
  sent: OutgoingMessage[][] = []
  respond: (message: OutgoingMessage, index: number) => SendResult = (message, index) => ({ idempotencyKey: message.idempotencyKey, ok: true, providerId: `vl_${message.idempotencyKey}_${index}`, status: 'queued' })
  async sendBatch(messages: OutgoingMessage[]) { this.sent.push(messages); return messages.map((m, i) => this.respond(m, i)) }
  async templates() { return [] }
}

class FakeCashfree {
  orders = new Map<string, { amount: number; status: string }>()
  async createOrder(_env: string, _credentials: unknown, input: { orderId: string; amount: number }) { this.orders.set(input.orderId, { amount: input.amount, status: 'ACTIVE' }); return { orderId: input.orderId, paymentSessionId: `session_${input.orderId}`, orderStatus: 'ACTIVE' } }
  async getOrder(_env: string, _credentials: unknown, orderId: string) { const order = this.orders.get(orderId)!; return { orderId, amount: order.amount, currency: 'INR', status: order.status, gatewayReference: `cf_${orderId}` } }
}

const admin: Account = { user: { id: 5n, clientId: 7n, name: 'Asha', mobile: '9876543210', email: null, passwordHash: null, roleId: 1, isAdmin: 1, updatedAt: null }, client: { id: 7n, businessTypeId: 1, businessName: 'Asha Stores', logo: null, address: '', city: '', startDate: null, endDate: null }, businessType: null, roleTitle: null }
const staff: Account = { ...admin, user: { ...admin.user, id: 6n, isAdmin: 0 } }
const cashfreeConfig = { appId: 'app', secretKey: 'secret', environment: 'sandbox' as const, returnUrl: 'https://api.example.com/return?order_id={order_id}' }

function setup(now = new Date('2026-11-13T06:00:00Z')) {
  const store = new MemoryStore(), provider = new FakeProvider(), cashfree = new FakeCashfree()
  let clock = now
  store.clock = () => clock
  const service = new WhatsAppService(store, provider, { cashfreeConfig, cashfree: cashfree as never, webhookSecret: 'whsec', now: () => clock })
  const dispatcher = new WhatsAppDispatcher(store, provider, undefined, () => clock)
  return { store, provider, cashfree, service, dispatcher, tick: (minutes: number) => { clock = new Date(clock.getTime() + minutes * 60_000) } }
}
const offer = { offer_details: '20% off on sarees', valid_till: '30 Nov' }

test('templates: placeholders in body order, store-typed fields, rendering and value checks', () => {
  const body = 'Hi {{customer_name}}, {{store_name}} has {{offer_details}}. Valid till {{ valid_till }}. {{offer_details}}'
  assert.deepEqual(placeholders(body), ['customer_name', 'store_name', 'offer_details', 'valid_till'])
  assert.deepEqual(inputVariables(body), [{ key: 'offer_details', label: 'Offer details' }, { key: 'valid_till', label: 'Valid till' }])
  assert.equal(render('Hi {{customer_name}} from {{store_name}}', { customer_name: 'Ravi', store_name: 'Asha Stores' }), 'Hi Ravi from Asha Stores')
  assert.deepEqual(validateValues(body, { offer_details: '20%\noff  now', valid_till: '30 Nov' }), { values: { offer_details: '20% off now', valid_till: '30 Nov' } })
  assert.deepEqual(validateValues(body, { offer_details: 'x' }), { error: 'Fill in "Valid till".' })
})

test('quota month follows the store calendar, not UTC', () => {
  // 19:00 UTC on 31 Oct is already 1 Nov 00:30 in India.
  const month = monthRange(new Date('2026-10-31T19:00:00Z'), 'Asia/Kolkata')
  assert.equal(month.label, 'November 2026')
  assert.equal(month.gte.toISOString(), '2026-10-31T18:30:00.000Z')
  assert.equal(month.lt.toISOString(), '2026-11-30T18:30:00.000Z')
})

test('planSend: free first, then wallet or online; refuses a stale price', () => {
  const base = { quota: 10, freeUsed: 8, pricePaise: 120, walletPaise: 500, mode: 'wallet' as const }
  assert.deepEqual(planSend({ ...base, recipients: 2, expectedAmountPaise: 0 }), { ok: true, quote: { recipients: 2, quota: 10, freeUsed: 8, freeRemaining: 2, free: 2, paid: 0, pricePaise: 120, amountPaise: 0 }, status: 'queued', paymentMode: 'free', walletDebitPaise: 0 })
  const mixed = planSend({ ...base, recipients: 5, expectedAmountPaise: 360 })
  assert.ok(mixed.ok && mixed.paymentMode === 'wallet' && mixed.walletDebitPaise === 360 && mixed.quote.free === 2 && mixed.quote.paid === 3)
  assert.equal((planSend({ ...base, recipients: 7, expectedAmountPaise: 600 }) as { reason: string }).reason, 'insufficient_wallet')
  assert.equal((planSend({ ...base, recipients: 5, expectedAmountPaise: 300 }) as { reason: string }).reason, 'quote_changed')
  const online = planSend({ ...base, mode: 'online', recipients: 7, expectedAmountPaise: 600 })
  assert.ok(online.ok && online.status === 'pending_payment' && online.paymentMode === 'online')
  assert.equal(advances('delivered', 'sent'), false)
  assert.equal(advances('sent', 'read'), true)
  assert.equal(advances('read', 'failed'), false)
})

test('mobile numbers are normalised to 10 Indian digits', () => {
  assert.equal(normalizeMobile('+91 98765 43210'), '9876543210')
  assert.equal(normalizeMobile('09876543210'), '9876543210')
  assert.equal(normalizeMobile('919876543210'), '9876543210')
  assert.equal(normalizeMobile('5876543210'), null)
})

test('VedaLoop: batch request shape, per-item errors, retryable outages, webhook signatures', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = []
  let reply: () => Response = () => new Response(JSON.stringify({ accepted: 1, results: [{ index: 0, id: 'vl_1', status: 'queued' }, { index: 1, error: { code: 'OPTED_OUT', message: 'This person wrote STOP' } }] }), { status: 200 })
  const provider = new VedaloopWhatsAppProvider('vlk_test', 'https://api.vedaloop.in/v1/api/whatsapp/', (async (url: string, init: RequestInit) => { calls.push({ url, init }); return reply() }) as never)
  const messages = [{ idempotencyKey: 'zenxpos-wa-1', to: '919000000001', template: 'zenxpos_special_offer', language: 'en', variables: ['Ravi', 'Asha Stores'] }, { idempotencyKey: 'zenxpos-wa-2', to: '919000000002', template: 'zenxpos_special_offer', language: 'en', variables: ['Customer', 'Asha Stores'] }]
  const results = await provider.sendBatch(messages)
  assert.equal(calls[0]!.url, 'https://api.vedaloop.in/v1/api/whatsapp/messages/batch')
  assert.equal((calls[0]!.init.headers as Record<string, string>).Authorization, 'Bearer vlk_test')
  assert.deepEqual(JSON.parse(String(calls[0]!.init.body)).messages[0], { to: '919000000001', idempotencyKey: 'zenxpos-wa-1', template: { name: 'zenxpos_special_offer', language: 'en', variables: ['Ravi', 'Asha Stores'] } })
  assert.deepEqual(results, [{ idempotencyKey: 'zenxpos-wa-1', ok: true, providerId: 'vl_1', status: 'queued' }, { idempotencyKey: 'zenxpos-wa-2', ok: false, code: 'OPTED_OUT', error: 'This person wrote STOP', retryable: false }])
  reply = () => new Response(JSON.stringify({ code: 'INTERNAL', message: 'down' }), { status: 503 })
  assert.equal(((await provider.sendBatch(messages.slice(0, 1)))[0] as { retryable: boolean }).retryable, true)

  const body = Buffer.from('{"event":"message.status"}'), ts = '1763020000'
  const signature = `sha256=${createHmac('sha256', 'whsec').update(`${ts}.`).update(body).digest('hex')}`
  assert.equal(verifyVedaloopSignature(body, ts, signature, 'whsec', 1763020000_000), true)
  assert.equal(verifyVedaloopSignature(body, ts, signature, 'other', 1763020000_000), false)
  assert.equal(verifyVedaloopSignature(body, ts, signature, 'whsec', 1763020000_000 + 301_000), false)
})

test('free messages go out first; the rest are paid from the wallet; failures are refunded', async () => {
  const { store, provider, service, dispatcher } = setup()
  store.client.walletPaise = 1000
  const recipients = { customerIds: [11, 12, 13, 99], mobiles: ['+91 90000 00001', '9000000003', '9000000004', '12'] }
  const quote = await service.quote(admin, { templateId: 1, ...recipients })
  // 11 and 12 are customers; 13 has a bad number, 99 is not this store's; 90000 00001 repeats customer 11.
  assert.deepEqual([quote.recipients, quote.free, quote.paid, quote.pricePaise, quote.amountPaise, quote.walletCovers], [4, 3, 1, 120, 120, true])
  assert.deepEqual(quote.skipped, { invalid: 2, duplicate: 1, missing: 1 })
  const sent = await service.send(admin, { templateId: 1, values: offer, ...recipients, paymentMode: 'wallet', expectedAmountPaise: 120 })
  assert.equal(sent.status, 'queued')
  assert.equal(store.client.walletPaise, 880)
  assert.equal(store.messages[0]!.body, 'Hi Ravi Kumar, Asha Stores has 20% off on sarees. Valid till 30 Nov.')
  assert.equal(store.messages[1]!.body, 'Hi Customer, Asha Stores has 20% off on sarees. Valid till 30 Nov.')
  // The paid (4th) recipient opted out at WhatsApp.
  provider.respond = (message, index) => index === 3 ? { idempotencyKey: message.idempotencyKey, ok: false, code: 'OPTED_OUT', error: 'STOP', retryable: false } : { idempotencyKey: message.idempotencyKey, ok: true, providerId: `vl_${index}`, status: 'queued' }
  await dispatcher.run()
  assert.deepEqual(provider.sent[0]!.map(m => [m.to, m.variables]), [
    ['919000000001', ['Ravi Kumar', 'Asha Stores', '20% off on sarees', '30 Nov']], ['919000000002', ['Customer', 'Asha Stores', '20% off on sarees', '30 Nov']],
    ['919000000003', ['Customer', 'Asha Stores', '20% off on sarees', '30 Nov']], ['919000000004', ['Customer', 'Asha Stores', '20% off on sarees', '30 Nov']],
  ])
  assert.equal(store.client.walletPaise, 1000)
  assert.equal(store.messages[3]!.error, 'Customer has opted out of offers (replied STOP).')
  assert.equal(store.campaignsList[0]!.status, 'completed')
  assert.deepEqual([store.campaignsList[0]!.sentCount, store.campaignsList[0]!.failedCount, store.campaignsList[0]!.refundedPaise], [3, 1, 120])
  // Quota used: 3 free this month, so the next message is paid.
  const next = await service.quote(admin, { mobiles: ['9000000009'] })
  assert.deepEqual([next.freeUsed, next.free, next.paid], [3, 0, 1])
})

test('delivery reports: furthest status wins; a failed free message gives the quota back', async () => {
  const { store, service, dispatcher } = setup()
  await service.send(admin, { templateId: 1, values: offer, mobiles: ['9000000003'], paymentMode: 'wallet', expectedAmountPaise: 0 })
  await dispatcher.run()
  const deliver = async (status: string, error: unknown = null, secret = 'whsec') => {
    const body = Buffer.from(JSON.stringify({ id: 'evt', event: 'message.status', data: { id: store.messages[0]!.providerId, status, error } }))
    const timestamp = String(Math.floor(new Date('2026-11-13T06:00:00Z').getTime() / 1000))
    return service.webhook(body, { timestamp, signature: `sha256=${createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest('hex')}` })
  }
  assert.equal(await deliver('delivered', null, 'wrong'), false)
  assert.equal(await deliver('read'), true)
  await deliver('delivered')
  assert.equal(store.messages[0]!.status, 'read')
  await service.send(admin, { templateId: 1, values: offer, mobiles: ['9000000005'], paymentMode: 'wallet', expectedAmountPaise: 0 })
  await dispatcher.run()
  store.messages[0] = store.messages[1]!
  assert.equal((await service.quote(admin, { mobiles: ['9000000006'] })).freeUsed, 2)
  await deliver('failed', { message: 'Number is not on WhatsApp' })
  assert.equal(store.messages[1]!.status, 'failed')
})

test('online payment: free messages are held 30 minutes; paying queues the send once', async () => {
  const { store, cashfree, service, dispatcher, tick } = setup()
  store.client.monthlyQuota = 1
  const sent = await service.send(admin, { templateId: 1, values: offer, mobiles: ['9000000003', '9000000004', '9000000005'], paymentMode: 'online', expectedAmountPaise: 240 })
  assert.equal(sent.status, 'pending_payment')
  const payment = (sent as { payment: { orderId: string; paymentSessionId: string; amount: number } }).payment
  assert.match(payment.orderId, /^WAC_7_/)
  assert.equal(payment.amount, 2.4)
  // The held free message counts while the checkout is open.
  assert.equal((await service.quote(admin, { mobiles: ['9000000009'] })).free, 0)
  assert.deepEqual(await service.verifyPayment(admin, { orderId: payment.orderId }), { paid: false, status: 'ACTIVE' })
  cashfree.orders.get(payment.orderId)!.status = 'PAID'
  assert.deepEqual(await service.verifyPayment(admin, { orderId: payment.orderId }), { paid: true, status: 'PAID', kind: 'campaign', campaignId: 1 })
  await service.verifyPayment(admin, { orderId: payment.orderId })
  await dispatcher.run()
  assert.equal(store.messages.filter(m => m.status === 'queued' || m.status === 'awaiting_payment').length, 0)
  assert.equal(store.campaignsList[0]!.sentCount, 3)
  // An abandoned checkout expires after 30 minutes and releases its free message.
  store.client.monthlyQuota = 2
  await service.send(admin, { templateId: 1, values: offer, mobiles: ['9000000006', '9000000007'], paymentMode: 'online', expectedAmountPaise: 120 })
  assert.equal((await service.quote(admin, { mobiles: ['9000000009'] })).free, 0)
  tick(31)
  await dispatcher.run()
  assert.equal(store.campaignsList[1]!.status, 'expired')
  assert.equal((await service.quote(admin, { mobiles: ['9000000009'] })).free, 1)
  // Another store's order id is never looked up.
  await assert.rejects(() => service.verifyPayment(admin, { orderId: 'WAC_8_1763020000000_abcdefgh' }), (error: { status: number }) => error.status === 404)
})

test('wallet top-up credits once; the send refuses a stale price or a short wallet', async () => {
  const { store, cashfree, service } = setup()
  const order = await service.topup(admin, { amount: 200 })
  cashfree.orders.get(order.orderId)!.status = 'PAID'
  const first = await service.verifyPayment(admin, { orderId: order.orderId })
  const again = await service.verifyPayment(admin, { orderId: order.orderId })
  assert.deepEqual([first, again].map(result => (result as { walletPaise: number }).walletPaise), [20000, 20000])
  assert.equal(store.wallet.filter(row => row.type === 'topup').length, 1)
  await assert.rejects(() => service.topup(admin, { amount: 50 }), (error: { status: number; message: string }) => error.status === 422 && /at least ₹100/.test(error.message))
  store.client.monthlyQuota = 0
  store.client.walletPaise = 100
  await assert.rejects(() => service.send(admin, { templateId: 1, values: offer, mobiles: ['9000000003'], paymentMode: 'wallet', expectedAmountPaise: 100 }), (error: { status: number; details: { code: string; quote: { amountPaise: number } } }) => error.status === 409 && error.details.code === 'QUOTE_CHANGED' && error.details.quote.amountPaise === 120)
  await assert.rejects(() => service.send(admin, { templateId: 1, values: offer, mobiles: ['9000000003'], paymentMode: 'wallet', expectedAmountPaise: 120 }), (error: { details: { code: string } }) => error.details.code === 'INSUFFICIENT_WALLET')
  assert.equal(store.messages.length, 0)
})

test('who can send: store admins of an enabled store, with a live template and filled values', async () => {
  const { store, provider, service } = setup()
  const send = (account: Account, extra: Record<string, unknown> = {}) => service.send(account, { templateId: 1, values: offer, mobiles: ['9000000003'], paymentMode: 'wallet', expectedAmountPaise: 0, ...extra })
  await assert.rejects(() => send(staff), (error: { status: number }) => error.status === 403)
  await assert.rejects(() => send(admin, { templateId: 2 }), (error: { status: number }) => error.status === 404)
  await assert.rejects(() => send(admin, { values: { offer_details: 'x' } }), (error: { message: string }) => error.message === 'Fill in "Valid till".')
  await assert.rejects(() => send(admin, { mobiles: ['123'] }), (error: { status: number }) => error.status === 422)
  provider.available = false
  await assert.rejects(() => send(admin), (error: { status: number }) => error.status === 503)
  provider.available = true
  store.client.enabled = false
  await assert.rejects(() => send(admin), (error: { status: number; message: string }) => error.status === 403 && /not enabled/.test(error.message))
  // Staff can still see the screen.
  const overview = await service.overview(staff)
  assert.deepEqual([overview.enabled, overview.canSend, overview.price, overview.quota], [false, false, 1.2, 3])
})

test('super admin: per-client quota and price, wallet adjustments, template rules', async () => {
  const { store, service } = setup()
  const saved = await service.setClientSettings(7n, { enabled: '1', monthlyQuota: '500', price: '1.20' }, 1n)
  assert.deepEqual([saved.enabled, saved.monthlyQuota, saved.pricePaise, saved.effectivePrice, saved.month], [true, 500, 120, 1.2, 'November 2026'])
  assert.equal((await service.setClientSettings(7n, { enabled: 'true', monthlyQuota: 0, price: '' }, 1n)).effectivePrice, 1.2)
  assert.equal(store.client.pricePaise, null)
  await assert.rejects(() => service.setClientSettings(7n, { enabled: 1, monthlyQuota: 10, price: '1.205' }, 1n), (error: { status: number }) => error.status === 422)
  assert.equal((await service.adjustWallet(7n, { amount: 50, note: 'Launch credit' }, 1n)).wallet, 50)
  await assert.rejects(() => service.adjustWallet(7n, { amount: -60, note: 'Correction' }, 1n), (error: { status: number }) => error.status === 422)
  await assert.rejects(() => service.saveTemplate(null, { name: 'Bad', body: 'Hi {{Customer Name}}', providerTemplate: 'bad' }, 1n), (error: { status: number }) => error.status === 422)
  await assert.rejects(() => service.saveTemplate(null, { name: 'Bad', body: 'Hi there friend', providerTemplate: 'Has Spaces' }, 1n), (error: { status: number }) => error.status === 422)
  assert.deepEqual(await service.saveTemplate(null, { name: 'Diwali', body: 'Happy {{festival}}, {{customer_name}}!', providerTemplate: 'zenxpos_diwali' }, 1n), { id: 99, variables: [{ key: 'festival', label: 'Festival' }, { key: 'customer_name', label: 'Customer name' }] })
})
