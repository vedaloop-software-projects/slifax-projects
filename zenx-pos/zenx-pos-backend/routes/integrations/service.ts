import { z } from 'zod'
import type { Account } from '../../models/auth/contracts.ts'
import { CredentialVault } from '../../models/integrations/credential-vault.ts'
import type { IntegrationEnvironment, IntegrationStatus, IntegrationStore } from '../../models/integrations/contracts.ts'
import { ApiError } from '../auth/service.ts'
import { PineLabsGateway } from './pinelabs.ts'
import { CashfreeGateway } from './cashfree.ts'
import { randomUUID } from 'node:crypto'

const requestSchema = z.object({ notes: z.string().trim().max(1000).optional() })
const configurationSchema = z.object({
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
  credentials: z.record(z.string(), z.string().trim().min(1).max(2000)),
  publicConfig: z.record(z.string(), z.json()).default({}),
  notes: z.string().trim().max(1000).optional(),
})
const statusSchema = z.object({ status: z.enum(['in_review', 'rejected', 'disabled']), notes: z.string().trim().max(1000).optional() })
const checkoutSchema = z.object({ merchantOrderReference: z.string().trim().min(1).max(50).regex(/^[A-Za-z0-9_-]+$/), amountInPaise: z.number().int().positive().max(100_000_000), notes: z.string().trim().max(255).optional(), customer: z.object({ emailId: z.email().optional(), firstName: z.string().trim().max(100).optional(), lastName: z.string().trim().max(100).optional(), customerId: z.string().trim().max(100).optional(), mobileNumber: z.string().regex(/^\d{10,15}$/).optional() }).optional() })
const renewalVerifySchema = z.object({ orderId: z.string().trim().regex(/^REN_[A-Za-z0-9_-]{8,45}$/) }).strict()

export type PlatformCashfreeConfig = {
  appId: string
  secretKey: string
  environment: IntegrationEnvironment
  returnUrl: string
}

export class IntegrationService {
  readonly store: IntegrationStore
  private readonly vault?: CredentialVault
  private readonly pineLabs: PineLabsGateway
  private readonly cashfree: CashfreeGateway
  private readonly platformCashfree?: PlatformCashfreeConfig
  constructor(store: IntegrationStore, vault?: CredentialVault, pineLabs = new PineLabsGateway(), cashfree = new CashfreeGateway(), platformCashfree?: PlatformCashfreeConfig) { this.store = store; this.vault = vault; this.pineLabs = pineLabs; this.cashfree = cashfree; this.platformCashfree = platformCashfree }

  list(account: Account) { return this.store.listForTenant(account.client.id) }

  async request(account: Account, providerCode: string, body: unknown) {
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success || !/^[a-z0-9_-]{2,50}$/.test(providerCode)) throw new ApiError(422, 'Invalid integration request.')
    const result = await this.store.request(account.client.id, account.user.id, providerCode, parsed.data.notes ?? null)
    if (result === 'missing') throw new ApiError(404, 'Integration provider is not available.')
    return result
  }

  adminList(status?: string) { return this.store.listForAdmin(status) }

  async configure(requestId: bigint, adminId: bigint, body: unknown) {
    if (!this.vault) throw new ApiError(503, 'Integration credential encryption is not configured.')
    const parsed = configurationSchema.safeParse(body)
    if (!parsed.success) throw new ApiError(422, 'Invalid integration configuration.')
    const requests = await this.store.listForAdmin()
    const request = requests.find(row => row.requestId === requestId)
    if (!request) throw new ApiError(404, 'Integration request not found.')
    const allowed = new Set(request.credentialSchema.map(field => field.key))
    if (Object.keys(parsed.data.credentials).some(key => !allowed.has(key))) throw new ApiError(422, 'Configuration contains an unsupported credential field.')
    const missing = request.credentialSchema.filter(field => field.required && !parsed.data.credentials[field.key]).map(field => field.label)
    if (missing.length) throw new ApiError(422, `Missing required credentials: ${missing.join(', ')}.`)
    const encryptedCredentials = this.vault.encrypt(parsed.data.credentials, request.clientId, request.code)
    const result = await this.store.configure({ requestId, adminId, environment: parsed.data.environment as IntegrationEnvironment, encryptedCredentials, configuredFields: Object.keys(parsed.data.credentials).sort(), publicConfig: parsed.data.publicConfig, notes: parsed.data.notes ?? null })
    if (result === 'missing') throw new ApiError(404, 'Integration request not found.')
  }

  async updateStatus(requestId: bigint, adminId: bigint, body: unknown) {
    const parsed = statusSchema.safeParse(body)
    if (!parsed.success) throw new ApiError(422, 'Invalid integration status update.')
    const result = await this.store.updateRequest({ requestId, adminId, status: parsed.data.status as IntegrationStatus, notes: parsed.data.notes ?? null })
    if (result === 'missing') throw new ApiError(404, 'Integration request not found.')
  }

  async initialize(account: Account, providerCode: string) {
    const integration = await this.store.findActive(account.client.id, providerCode)
    const label = providerCode === 'pinelabs' ? 'Pine Labs' : providerCode === 'cashfree' ? 'Cashfree' : providerCode
    if (!integration) throw new ApiError(409, `${label} is not configured for this tenant. Open Settings > Integrations, request ${label}, and ask the technical team to add the required API credentials.`)
    if (!this.vault) throw new ApiError(503, 'Payment integration security is not configured on the server. Contact technical support.')
    const credentials = this.vault.decrypt(integration.encryptedCredentials, account.client.id, providerCode)
    return { provider: providerCode, environment: integration.environment, initialized: true, configuredFields: Object.keys(credentials).sort(), publicConfig: integration.publicConfig }
  }

  async createPineLabsCheckout(account: Account, body: unknown) {
    const parsed = checkoutSchema.safeParse(body)
    if (!parsed.success) throw new ApiError(422, 'Pine Labs payment details are incomplete. Verify the bill reference, amount, and customer details.')
    const integration = await this.store.findActive(account.client.id, 'pinelabs')
    if (!integration) throw new ApiError(409, 'Pine Labs is not configured for this tenant. Open Settings > Integrations, request Pine Labs, and ask the technical team to add the required API credentials.')
    if (!this.vault) throw new ApiError(503, 'Payment integration security is not configured on the server. Contact technical support.')
    const credentials = this.vault.decrypt(integration.encryptedCredentials, account.client.id, 'pinelabs')
    const config = integration.publicConfig && typeof integration.publicConfig === 'object' && !Array.isArray(integration.publicConfig) ? integration.publicConfig : {}
    const callbackUrl = typeof config.callbackUrl === 'string' ? config.callbackUrl : ''
    if (!/^https:\/\//i.test(callbackUrl)) throw new ApiError(409, 'Pine Labs callback URL is not configured.')
    const supported = new Set(['CARD', 'UPI', 'POINTS', 'NETBANKING', 'WALLET', 'CREDIT_EMI', 'DEBIT_EMI', 'BNPL'])
    const methods = Array.isArray(config.allowedPaymentMethods) ? config.allowedPaymentMethods.map(String).filter(value => supported.has(value)) : ['CARD', 'UPI']
    try { const checkout = await this.pineLabs.checkout(integration.environment, credentials, { ...parsed.data, callbackUrl, allowedPaymentMethods: methods.length ? methods : ['CARD', 'UPI'] }); await this.store.recordCheckout({ clientId: account.client.id, userId: account.user.id, providerCode: 'pinelabs', merchantReference: parsed.data.merchantOrderReference, externalOrderId: checkout.orderId, amountInPaise: parsed.data.amountInPaise, redirectUrl: checkout.redirectUrl }); return checkout }
    catch (error) { throw new ApiError(502, error instanceof Error ? error.message : 'Pine Labs is unavailable.') }
  }

  async renewalQuote(account: Account) {
    const quote = await this.store.renewalQuote(account.client.id)
    if (!quote) throw new ApiError(404, 'Subscription profile was not found.')
    if (!Number.isFinite(quote.amount) || quote.amount <= 0 || ![1, 2, 3].includes(quote.duration)) throw new ApiError(409, 'Subscription pricing is not configured. Contact the ZenxPOS technical team.')
    return { amount: quote.amount, amountInPaise: Math.round(quote.amount * 100), duration: quote.duration, durationLabel: ({ 1: 'Quarterly', 2: 'Half yearly', 3: 'Yearly' } as Record<number, string>)[quote.duration], currentExpiry: quote.endDate, cashfreeConfigured: Boolean(this.platformCashfree) }
  }

  async createCashfreeRenewal(account: Account) {
    const quote = await this.store.renewalQuote(account.client.id)
    if (!quote || quote.amount <= 0 || ![1, 2, 3].includes(quote.duration)) throw new ApiError(409, 'Subscription pricing is not configured. Contact the ZenxPOS technical team.')
    const config = this.platformCashfree
    if (!config) throw new ApiError(503, 'ZenxPOS Cashfree renewal payments are not configured. Contact the ZenxPOS technical team.')
    const orderId = `REN_${account.client.id}_${Date.now()}_${randomUUID().slice(0, 8)}`.slice(0, 50)
    try {
      const credentials = { appId: config.appId, secretKey: config.secretKey }
      const returnUrl = config.returnUrl.replace('{order_id}', orderId)
      const checkout = await this.cashfree.createOrder(config.environment, credentials, { orderId, amount: quote.amount, customerId: account.client.id.toString(), customerName: quote.contactPerson || quote.businessName, customerEmail: quote.email, customerPhone: quote.mobile, returnUrl })
      await this.store.recordCheckout({ clientId: account.client.id, userId: account.user.id, providerCode: 'cashfree', merchantReference: orderId, externalOrderId: checkout.orderId, amountInPaise: Math.round(quote.amount * 100), redirectUrl: returnUrl })
      return { ...checkout, amount: quote.amount, environment: config.environment }
    } catch (error) { throw new ApiError(502, error instanceof Error ? error.message : 'Cashfree is unavailable.') }
  }

  async verifyCashfreeRenewal(account: Account, body: unknown) {
    const parsed = renewalVerifySchema.safeParse(body)
    if (!parsed.success) throw new ApiError(422, 'Invalid Cashfree renewal order.')
    const config = this.platformCashfree
    if (!config) throw new ApiError(503, 'ZenxPOS Cashfree renewal payments are not configured. Contact the ZenxPOS technical team.')
    try {
      const credentials = { appId: config.appId, secretKey: config.secretKey }
      const order = await this.cashfree.getOrder(config.environment, credentials, parsed.data.orderId)
      if (order.status !== 'PAID') return { paid: false, status: order.status ?? 'UNKNOWN' }
      const amountInPaise = Math.round(order.amount * 100)
      const result = await this.store.completeRenewal({ clientId: account.client.id, userId: account.user.id, providerCode: 'cashfree', orderId: order.orderId, gatewayReference: order.gatewayReference, amountInPaise, paidAt: new Date() })
      if (result.status === 'missing') throw new ApiError(404, 'Renewal transaction was not found.')
      if (result.status === 'amount_mismatch') throw new ApiError(409, 'Cashfree payment amount does not match the subscription amount.')
      return { paid: true, status: 'PAID', serviceResumed: true, invoice: result.invoice }
    } catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(502, error instanceof Error ? error.message : 'Cashfree verification failed.') }
  }
}
