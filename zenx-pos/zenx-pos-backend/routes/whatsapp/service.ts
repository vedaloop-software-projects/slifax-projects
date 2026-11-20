import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import type { Account } from '../../models/auth/contracts.ts'
import type { CampaignContent, Recipient, Template, WhatsAppStore } from '../../models/whatsapp/contracts.ts'
import { MAX_RECIPIENTS, monthRange, PAYMENT_HOLD_MINUTES, quote } from '../../models/whatsapp/plan.ts'
import { toInternational, verifyVedaloopSignature, type OutgoingMessage, type WhatsAppProvider } from '../../models/whatsapp/provider.ts'
import { displayName, inputVariables, placeholders, render, validateValues, variableLabel } from '../../models/whatsapp/templates.ts'
import { DEFAULT_TIME_ZONE, validTimeZone } from '../../models/system/business-time.ts'
import { ApiError } from '../auth/service.ts'
import { CashfreeGateway } from '../integrations/cashfree.ts'
import type { PlatformCashfreeConfig } from '../integrations/service.ts'

const MOBILE = /^[6-9]\d{9}$/
const ORDER_ID = /^WA[TC]_[A-Za-z0-9_-]{8,45}$/
export const TOPUP_MIN = 100
export const TOPUP_MAX = 50_000
export const MAX_ATTEMPTS = 5

const ids = z.array(z.coerce.number().int().positive().safe()).max(MAX_RECIPIENTS).default([])
const mobiles = z.array(z.union([z.string(), z.number()]).transform(String)).max(MAX_RECIPIENTS).default([])
const recipientsSchema = z.object({ customerIds: ids, mobiles })
const quoteSchema = recipientsSchema.extend({ templateId: z.coerce.number().int().positive().safe().optional() })
const sendSchema = recipientsSchema.extend({
  templateId: z.coerce.number().int().positive().safe(),
  values: z.record(z.string(), z.unknown()).default({}),
  paymentMode: z.enum(['wallet', 'online']).default('wallet'),
  expectedAmountPaise: z.coerce.number().int().min(0),
})
const topupSchema = z.object({ amount: z.coerce.number().int(`Enter a whole rupee amount.`).min(TOPUP_MIN, `Top up at least ₹${TOPUP_MIN}.`).max(TOPUP_MAX, `Top up at most ₹${TOPUP_MAX}.`) })
const verifySchema = z.object({ orderId: z.string().regex(ORDER_ID) })
const pageSchema = z.coerce.number().int().min(1).max(10_000).catch(1)

// Accepts 98765 43210, +91 98765 43210, 09876543210 and 919876543210.
export function normalizeMobile(raw: string) {
  let digits = raw.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  return MOBILE.test(digits) ? digits : null
}

const money = (paise: number) => Math.round(paise) / 100

export class WhatsAppService {
  readonly store: WhatsAppStore
  private readonly provider: WhatsAppProvider
  private readonly cashfreeConfig?: PlatformCashfreeConfig
  private readonly cashfree: CashfreeGateway
  private readonly webhookSecret?: string
  private readonly now: () => Date
  // Called after messages are queued so the dispatcher sends them right away.
  onQueued: () => void = () => {}

  constructor(store: WhatsAppStore, provider: WhatsAppProvider, options: { cashfreeConfig?: PlatformCashfreeConfig; cashfree?: CashfreeGateway; webhookSecret?: string; now?: () => Date } = {}) {
    this.store = store
    this.provider = provider
    if (options.cashfreeConfig) this.cashfreeConfig = options.cashfreeConfig
    this.cashfree = options.cashfree ?? new CashfreeGateway()
    if (options.webhookSecret) this.webhookSecret = options.webhookSecret
    this.now = options.now ?? (() => new Date())
  }

  private async settings(account: Account) {
    const settings = await this.store.settings(account.client.id)
    if (!settings) throw new ApiError(404, 'Store profile was not found.')
    return settings
  }

  private async enabledSettings(account: Account) {
    const settings = await this.settings(account)
    if (!settings.enabled) throw new ApiError(403, 'WhatsApp messaging is not enabled for your store. Contact ZenxPOS support to turn it on.')
    return settings
  }

  // Spending money (sending paid messages, topping up) is for the store's admins.
  private requireAdmin(account: Account) {
    if (account.user.isAdmin !== 1) throw new ApiError(403, 'Only a store admin can send WhatsApp messages or top up the wallet.')
  }

  private holdSince() { return new Date(this.now().getTime() - PAYMENT_HOLD_MINUTES * 60_000) }

  private async usage(account: Account) {
    const month = monthRange(this.now())
    const settings = await this.settings(account)
    const [freeUsed, defaultPrice] = await Promise.all([this.store.freeUsed(account.client.id, month, this.holdSince()), this.store.defaultPricePaise()])
    return { settings, month, freeUsed, pricePaise: settings.pricePaise ?? defaultPrice }
  }

  async overview(account: Account) {
    const { settings, month, freeUsed, pricePaise } = await this.usage(account)
    return {
      enabled: settings.enabled, providerReady: this.provider.available, simulated: this.provider.simulated, canSend: account.user.isAdmin === 1,
      onlinePayment: Boolean(this.cashfreeConfig), month: month.label,
      quota: settings.monthlyQuota, freeUsed, freeRemaining: Math.max(0, settings.monthlyQuota - freeUsed),
      pricePaise, price: money(pricePaise), walletPaise: settings.walletPaise, wallet: money(settings.walletPaise),
      storeName: settings.businessName, topup: { min: TOPUP_MIN, max: TOPUP_MAX }, maxRecipients: MAX_RECIPIENTS,
    }
  }

  private templateView(template: Template) {
    return { id: Number(template.id), name: template.name, category: template.category, body: template.body, variables: inputVariables(template.body) }
  }

  async templates(account: Account) {
    await this.settings(account)
    return { templates: (await this.store.templates(true)).map(template => this.templateView(template)) }
  }

  // Customers first (their names fill {{customer_name}}), then typed numbers; one message per number.
  private async recipients(account: Account, customerIds: number[], typed: string[]) {
    const found = await this.store.customers(account.client.id, [...new Set(customerIds)].map(BigInt))
    const byId = new Map(found.map(customer => [customer.id.toString(), customer]))
    const seen = new Set<string>()
    const list: Array<{ customerId: bigint | null; name: string; mobile: string }> = []
    let invalid = 0, duplicate = 0, missing = 0
    for (const id of [...new Set(customerIds)]) {
      const customer = byId.get(String(id))
      if (!customer) { missing++; continue }
      const mobile = normalizeMobile(customer.mobile ?? '')
      if (!mobile) { invalid++; continue }
      if (seen.has(mobile)) { duplicate++; continue }
      seen.add(mobile); list.push({ customerId: customer.id, name: displayName(customer.name), mobile })
    }
    for (const raw of typed) {
      const mobile = normalizeMobile(raw)
      if (!mobile) { invalid++; continue }
      if (seen.has(mobile)) { duplicate++; continue }
      seen.add(mobile); list.push({ customerId: null, name: displayName(null), mobile })
    }
    if (list.length > MAX_RECIPIENTS) throw new ApiError(422, `Send to at most ${MAX_RECIPIENTS} numbers at a time.`)
    return { list, skipped: { invalid, duplicate, missing } }
  }

  async quote(account: Account, body: unknown) {
    const parsed = quoteSchema.safeParse(body)
    if (!parsed.success) throw new ApiError(422, 'Invalid recipients.')
    await this.enabledSettings(account)
    const { list, skipped } = await this.recipients(account, parsed.data.customerIds, parsed.data.mobiles)
    const { settings, freeUsed, pricePaise } = await this.usage(account)
    const result = quote(list.length, settings.monthlyQuota, freeUsed, pricePaise)
    return { ...result, amount: money(result.amountPaise), price: money(pricePaise), walletPaise: settings.walletPaise, wallet: money(settings.walletPaise), walletCovers: settings.walletPaise >= result.amountPaise, skipped }
  }

  async send(account: Account, body: unknown) {
    const parsed = sendSchema.safeParse(body)
    if (!parsed.success) throw new ApiError(422, parsed.error.issues[0]?.message ?? 'Invalid message details.')
    this.requireAdmin(account)
    const settings = await this.enabledSettings(account)
    if (!this.provider.available) throw new ApiError(503, 'WhatsApp sending is not set up yet. Contact ZenxPOS support.')
    const template = await this.store.template(BigInt(parsed.data.templateId))
    if (!template || template.status !== 1) throw new ApiError(404, 'This template is no longer available. Pick another one.')
    const checked = validateValues(template.body, parsed.data.values)
    if ('error' in checked) throw new ApiError(422, checked.error)
    const { list, skipped } = await this.recipients(account, parsed.data.customerIds, parsed.data.mobiles)
    if (!list.length) throw new ApiError(422, 'Add at least one customer or a valid 10-digit mobile number.')
    const values = { ...checked.values, store_name: settings.businessName }
    const content: CampaignContent = { providerTemplate: template.providerTemplate, language: template.language, keys: placeholders(template.body), values }
    const recipients: Recipient[] = list.map(recipient => ({ ...recipient, body: render(template.body, { ...values, customer_name: recipient.name }) }))
    if (parsed.data.paymentMode === 'online' && parsed.data.expectedAmountPaise > 0 && !this.cashfreeConfig) throw new ApiError(503, 'Online payment is not available. Pay from the WhatsApp wallet instead.')
    const orderId = `WAC_${account.client.id}_${Date.now()}_${randomUUID().slice(0, 8)}`.slice(0, 50)
    const { plan, campaignId } = await this.store.createCampaign({
      clientId: account.client.id, userId: account.user.id, templateId: template.id, templateName: template.name, content, recipients,
      month: monthRange(this.now()), holdSince: this.holdSince(), defaultPricePaise: await this.store.defaultPricePaise(),
      mode: parsed.data.paymentMode, expectedAmountPaise: parsed.data.expectedAmountPaise, orderId,
    })
    const priced = (q: typeof plan.quote) => ({ ...q, amount: money(q.amountPaise), price: money(q.pricePaise) })
    if (!plan.ok) {
      throw new ApiError(409, plan.reason === 'quote_changed'
        ? 'The price changed because your free messages or the rate was updated. Check the new amount and send again.'
        : `Your WhatsApp wallet has ₹${money(settings.walletPaise).toFixed(2)}, but this send needs ₹${money(plan.quote.amountPaise).toFixed(2)}. Top up or pay online.`,
      { code: plan.reason === 'quote_changed' ? 'QUOTE_CHANGED' : 'INSUFFICIENT_WALLET', quote: priced(plan.quote) })
    }
    const result = { campaignId: Number(campaignId), status: plan.status, paymentMode: plan.paymentMode, quote: priced(plan.quote), skipped }
    if (plan.status === 'queued') { this.onQueued(); return result }
    try {
      const checkout = await this.checkout(account, settings, orderId, plan.quote.amountPaise, `ZenxPOS WhatsApp: ${plan.quote.paid} messages`)
      return { ...result, payment: checkout }
    } catch (error) {
      await this.store.cancelCampaign(account.client.id, campaignId!)
      throw error
    }
  }

  private async checkout(account: Account, settings: { businessName: string; contactPerson: string | null; email: string | null; mobile: string }, orderId: string, amountPaise: number, note: string) {
    const config = this.cashfreeConfig
    if (!config) throw new ApiError(503, 'Online payment is not configured. Contact ZenxPOS support.')
    const returnUrl = config.returnUrl.replace('{order_id}', orderId)
    try {
      const order = await this.cashfree.createOrder(config.environment, { appId: config.appId, secretKey: config.secretKey }, { orderId, amount: money(amountPaise), customerId: account.client.id.toString(), customerName: settings.contactPerson || settings.businessName, customerEmail: settings.email, customerPhone: settings.mobile, returnUrl, note })
      await this.store.recordCheckout({ clientId: account.client.id, userId: account.user.id, orderId, amountPaise, redirectUrl: returnUrl })
      return { orderId: order.orderId, paymentSessionId: order.paymentSessionId, environment: config.environment, amount: money(amountPaise), amountPaise }
    } catch (error) {
      if (error instanceof ApiError) throw error
      throw new ApiError(502, error instanceof Error ? error.message : 'Cashfree is unavailable.')
    }
  }

  async topup(account: Account, body: unknown) {
    const parsed = topupSchema.safeParse(body)
    if (!parsed.success) throw new ApiError(422, parsed.error.issues[0]?.message ?? 'Invalid amount.')
    this.requireAdmin(account)
    const settings = await this.enabledSettings(account)
    const orderId = `WAT_${account.client.id}_${Date.now()}_${randomUUID().slice(0, 8)}`.slice(0, 50)
    return this.checkout(account, settings, orderId, parsed.data.amount * 100, 'ZenxPOS WhatsApp wallet top-up')
  }

  async verifyPayment(account: Account, body: unknown) {
    const parsed = verifySchema.safeParse(body)
    if (!parsed.success) throw new ApiError(422, 'Invalid payment order.')
    const config = this.cashfreeConfig
    if (!config) throw new ApiError(503, 'Online payment is not configured. Contact ZenxPOS support.')
    const orderId = parsed.data.orderId
    // The order id carries the client id; another store's order is never looked up.
    if (!orderId.startsWith(`WAT_${account.client.id}_`) && !orderId.startsWith(`WAC_${account.client.id}_`)) throw new ApiError(404, 'Payment was not found.')
    let order: Awaited<ReturnType<CashfreeGateway['getOrder']>>
    try { order = await this.cashfree.getOrder(config.environment, { appId: config.appId, secretKey: config.secretKey }, orderId) }
    catch (error) { throw new ApiError(502, error instanceof Error ? error.message : 'Cashfree verification failed.') }
    if (order.status !== 'PAID') return { paid: false, status: order.status ?? 'UNKNOWN' }
    const amountPaise = Math.round(order.amount * 100)
    const result = orderId.startsWith('WAT_')
      ? await this.store.completeTopup({ clientId: account.client.id, userId: account.user.id, orderId, amountPaise })
      : await this.store.completeCampaignPayment({ clientId: account.client.id, orderId, amountPaise })
    if (result.status === 'missing') throw new ApiError(404, 'Payment was not found.')
    if (result.status === 'amount_mismatch') throw new ApiError(409, 'The paid amount does not match this order. Contact ZenxPOS support.')
    if ('campaignId' in result) { this.onQueued(); return { paid: true, status: 'PAID', kind: 'campaign', campaignId: Number(result.campaignId) } }
    const walletPaise = 'walletPaise' in result ? result.walletPaise : 0
    return { paid: true, status: 'PAID', kind: 'topup', walletPaise, wallet: money(walletPaise) }
  }

  async campaigns(account: Account, page: unknown) {
    const current = pageSchema.parse(page), perPage = 20
    const { rows, total } = await this.store.campaigns(account.client.id, current, perPage)
    return { campaigns: rows.map(row => ({ ...row, id: Number(row.id), amount: money(row.amountPaise), price: money(row.pricePaise), refunded: money(row.refundedPaise) })), pagination: { page: current, perPage, total, lastPage: Math.max(1, Math.ceil(total / perPage)) } }
  }

  async campaign(account: Account, rawId: unknown) {
    const id = z.coerce.number().int().positive().safe().safeParse(rawId)
    if (!id.success) throw new ApiError(422, 'Invalid campaign.')
    const found = await this.store.campaign(account.client.id, BigInt(id.data))
    if (!found) throw new ApiError(404, 'Campaign not found.')
    return { campaign: { ...found.campaign, id: Number(found.campaign.id), amount: money(found.campaign.amountPaise), price: money(found.campaign.pricePaise), refunded: money(found.campaign.refundedPaise) }, messages: found.messages.map(message => ({ ...message, id: Number(message.id) })) }
  }

  async wallet(account: Account, page: unknown) {
    const current = pageSchema.parse(page), perPage = 20
    const settings = await this.settings(account)
    const { rows, total } = await this.store.walletTransactions(account.client.id, current, perPage)
    return { walletPaise: settings.walletPaise, wallet: money(settings.walletPaise), transactions: rows.map(row => ({ ...row, id: Number(row.id), campaignId: row.campaignId === null ? null : Number(row.campaignId), amount: money(row.amountPaise), balanceAfter: money(row.balanceAfterPaise) })), pagination: { page: current, perPage, total, lastPage: Math.max(1, Math.ceil(total / perPage)) } }
  }

  // VedaLoop delivery reports. Returns false when the signature is wrong.
  async webhook(rawBody: Buffer | undefined, headers: { timestamp?: string; signature?: string; event?: string }) {
    if (!this.webhookSecret || !rawBody) return false
    if (!verifyVedaloopSignature(rawBody, headers.timestamp, headers.signature, this.webhookSecret, this.now().getTime())) return false
    let event: { event?: string; data?: { id?: string; status?: string; error?: unknown } }
    try { event = JSON.parse(rawBody.toString('utf8')) } catch { return true }
    if ((event.event ?? headers.event) !== 'message.status' || typeof event.data?.id !== 'string' || typeof event.data.status !== 'string') return true
    const error = typeof event.data.error === 'string' ? event.data.error : (event.data.error as { message?: string } | null)?.message ?? null
    await this.store.applyProviderStatus(event.data.id, event.data.status, error)
    return true
  }

  // ---- Super admin ----
  async clientSettings(clientId: bigint) {
    const settings = await this.store.settings(clientId)
    if (!settings) throw new ApiError(404, 'Client not found.')
    const zone = validTimeZone(settings.timeZone) ?? DEFAULT_TIME_ZONE
    const month = monthRange(this.now(), zone)
    const [freeUsed, defaultPricePaise, recent] = await Promise.all([
      this.store.freeUsed(clientId, month, this.holdSince()), this.store.defaultPricePaise(), this.store.walletTransactions(clientId, 1, 10),
    ])
    return {
      enabled: settings.enabled, monthlyQuota: settings.monthlyQuota, pricePaise: settings.pricePaise, price: settings.pricePaise === null ? null : money(settings.pricePaise),
      defaultPrice: money(defaultPricePaise), effectivePrice: money(settings.pricePaise ?? defaultPricePaise), month: month.label, freeUsed,
      walletPaise: settings.walletPaise, wallet: money(settings.walletPaise),
      transactions: recent.rows.map(row => ({ ...row, id: Number(row.id), campaignId: row.campaignId === null ? null : Number(row.campaignId), amount: money(row.amountPaise), balanceAfter: money(row.balanceAfterPaise) })),
    }
  }

  async setClientSettings(clientId: bigint, body: unknown, adminId: bigint) {
    const parsed = clientSettingsSchema.safeParse(body)
    if (!parsed.success) throw new ApiError(422, parsed.error.issues[0]?.message ?? 'Invalid WhatsApp settings.')
    const { enabled, monthlyQuota, price } = parsed.data
    if (!await this.store.setClientSettings(clientId, { enabled, monthlyQuota, pricePaise: price === null ? null : Math.round(price * 100) }, adminId)) throw new ApiError(404, 'Client not found.')
    return this.clientSettings(clientId)
  }

  async adjustWallet(clientId: bigint, body: unknown, adminId: bigint) {
    const parsed = walletAdjustmentSchema.safeParse(body)
    if (!parsed.success) throw new ApiError(422, parsed.error.issues[0]?.message ?? 'Invalid wallet adjustment.')
    const balance = await this.store.adjustWallet(clientId, Math.round(parsed.data.amount * 100), parsed.data.note, adminId)
    if (balance === null) throw new ApiError(422, 'The wallet cannot go below ₹0, or the client was not found.')
    return this.clientSettings(clientId)
  }

  async adminTemplates() {
    return { templates: (await this.store.templates(false)).map(template => ({ ...this.templateView(template), providerTemplate: template.providerTemplate, language: template.language, status: template.status, sortOrder: template.sortOrder, updatedAt: template.updatedAt })) }
  }

  async providerTemplates() {
    if (!this.provider.available || this.provider.simulated) return { available: false, templates: [] }
    try { return { available: true, templates: await this.provider.templates() } }
    catch (error) { throw new ApiError(502, error instanceof Error ? error.message : 'Could not load templates from the WhatsApp provider.') }
  }

  async saveTemplate(id: bigint | null, body: unknown, adminId: bigint) {
    const parsed = templateSchema.safeParse(body)
    if (!parsed.success) throw new ApiError(422, parsed.error.issues[0]?.message ?? 'Invalid template.')
    const keys = placeholders(parsed.data.body)
    if (/\{\{(?!\s*[a-z][a-z0-9_]{0,39}\s*\}\})/.test(parsed.data.body)) throw new ApiError(422, 'Placeholders look like {{customer_name}}: lowercase letters, numbers and underscores.')
    if (keys.length > 10) throw new ApiError(422, 'A template can have at most 10 placeholders.')
    if (id && !await this.store.template(id)) throw new ApiError(404, 'Template not found.')
    const saved = await this.store.saveTemplate(id, parsed.data, adminId)
    return { id: Number(saved), variables: keys.map(key => ({ key, label: variableLabel(key) })) }
  }
}

const blankToNull = (value: unknown) => value === '' || value === undefined ? null : value
const flag = z.preprocess(value => value === true || value === 1 || value === '1' || value === 'true', z.boolean())
const clientSettingsSchema = z.object({
  enabled: flag,
  monthlyQuota: z.coerce.number().int('Free messages must be a whole number.').min(0, 'Free messages cannot be negative.').max(1_000_000, 'At most 10,00,000 free messages a month.'),
  // Rupees per paid message; blank uses the platform default.
  price: z.preprocess(blankToNull, z.coerce.number().min(0.01, 'Price must be at least ₹0.01.').max(100, 'Price can be at most ₹100.').refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, 'Use at most two decimals, such as 1.20.').nullable()),
})
const walletAdjustmentSchema = z.object({
  amount: z.coerce.number().refine(value => value !== 0, 'Enter an amount other than 0.').refine(value => Math.abs(value) <= 100_000, 'At most ₹1,00,000 at a time.').refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, 'Use at most two decimals.'),
  note: z.string().trim().min(3, 'Add a short reason.').max(255),
})

const templateSchema = z.object({
  name: z.string().trim().min(2, 'Give the template a name.').max(100),
  category: z.enum(['marketing', 'utility']).default('marketing'),
  body: z.string().trim().min(5, 'Write the message text.').max(1024, 'WhatsApp messages can be at most 1024 characters.'),
  providerTemplate: z.string().trim().regex(/^[a-z0-9_]{1,255}$/, 'Provider template name uses lowercase letters, numbers and underscores, exactly as approved.'),
  language: z.string().trim().regex(/^[a-z]{2,3}(_[A-Z]{2})?$/, 'Language code such as en or en_US.').default('en'),
  status: z.coerce.number().int().min(0).max(1).default(1),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
})

// Hands queued messages to the provider in batches. Runs inside the API process.
export class WhatsAppDispatcher {
  private readonly store: WhatsAppStore
  private readonly provider: WhatsAppProvider
  private readonly log: (message: string, error?: unknown) => void
  private running = false
  private again = false
  private timer?: ReturnType<typeof setInterval>
  private readonly now: () => Date

  constructor(store: WhatsAppStore, provider: WhatsAppProvider, log: (message: string, error?: unknown) => void = () => {}, now: () => Date = () => new Date()) {
    this.store = store; this.provider = provider; this.log = log; this.now = now
  }

  start(intervalMs = 15_000) {
    if (this.timer) return
    this.timer = setInterval(() => this.kick(), intervalMs)
    this.timer.unref?.()
    this.kick()
  }

  stop() { if (this.timer) clearInterval(this.timer); this.timer = undefined }

  kick() {
    if (this.running) { this.again = true; return }
    void this.run().catch(error => this.log('WhatsApp dispatch failed', error))
  }

  async run() {
    this.running = true
    try {
      do {
        this.again = false
        const now = this.now().getTime()
        await this.store.failStuck(new Date(now - 10 * 60_000))
        await this.store.expireUnpaid(new Date(now - PAYMENT_HOLD_MINUTES * 60_000))
        if (this.provider.available) {
          for (let round = 0; round < 50; round++) {
            const batch = await this.store.claimQueued(200)
            if (!batch.length) break
            await this.deliver(batch)
          }
        }
        await this.store.completeCampaigns()
      } while (this.again)
    } finally { this.running = false }
  }

  private async deliver(batch: Awaited<ReturnType<WhatsAppStore['claimQueued']>>) {
    const outgoing: OutgoingMessage[] = batch.map(row => ({
      idempotencyKey: `zenxpos-wa-${row.id}`, to: toInternational(row.mobile), template: row.content.providerTemplate, language: row.content.language,
      variables: row.content.keys.map(key => key === 'customer_name' ? displayName(row.customerName) : row.content.values[key] ?? ''),
    }))
    let results: Awaited<ReturnType<WhatsAppProvider['sendBatch']>>
    try { results = await this.provider.sendBatch(outgoing) }
    catch (error) { results = outgoing.map(message => ({ idempotencyKey: message.idempotencyKey, ok: false as const, code: 'ERROR', error: error instanceof Error ? error.message : 'Send failed.', retryable: true })) }
    const byKey = new Map(results.map(result => [result.idempotencyKey, result]))
    for (const row of batch) {
      const result = byKey.get(`zenxpos-wa-${row.id}`)
      if (result?.ok) await this.store.markAccepted(row.id, result.providerId, result.status)
      else if (result && result.retryable && row.attempts + 1 < MAX_ATTEMPTS) await this.store.markRetry(row.id, `${result.code}: ${result.error}`)
      else await this.store.markFailed(row.id, result ? friendlyError(result.code, result.error) : 'No response from the WhatsApp provider.')
    }
  }
}

function friendlyError(code: string, error: string) {
  if (code === 'OPTED_OUT') return 'Customer has opted out of offers (replied STOP).'
  if (code === 'TEMPLATE_NOT_APPROVED') return 'Template is not approved at WhatsApp yet.'
  if (code === 'TEMPLATE_VALUES') return 'Template values were rejected by WhatsApp.'
  if (code === 'WHATSAPP_NOT_CONNECTED') return 'ZenxPOS WhatsApp number is not connected.'
  return error.slice(0, 255)
}
