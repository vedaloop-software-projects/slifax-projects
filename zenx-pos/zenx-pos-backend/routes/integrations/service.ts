import { z } from 'zod'
import type { Account } from '../../models/auth/contracts.ts'
import { CredentialVault } from '../../models/integrations/credential-vault.ts'
import type { IntegrationEnvironment, IntegrationStatus, IntegrationStore } from '../../models/integrations/contracts.ts'
import { ApiError } from '../auth/service.ts'
import { PineLabsGateway } from './pinelabs.ts'

const requestSchema = z.object({ notes: z.string().trim().max(1000).optional() })
const configurationSchema = z.object({
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
  credentials: z.record(z.string(), z.string().trim().min(1).max(2000)),
  publicConfig: z.record(z.string(), z.json()).default({}),
  notes: z.string().trim().max(1000).optional(),
})
const statusSchema = z.object({ status: z.enum(['in_review', 'rejected', 'disabled']), notes: z.string().trim().max(1000).optional() })
const checkoutSchema = z.object({ merchantOrderReference: z.string().trim().min(1).max(50).regex(/^[A-Za-z0-9_-]+$/), amountInPaise: z.number().int().positive().max(100_000_000), notes: z.string().trim().max(255).optional(), customer: z.object({ emailId: z.email().optional(), firstName: z.string().trim().max(100).optional(), lastName: z.string().trim().max(100).optional(), customerId: z.string().trim().max(100).optional(), mobileNumber: z.string().regex(/^\d{10,15}$/).optional() }).optional() })

export class IntegrationService {
  readonly store: IntegrationStore
  private readonly vault?: CredentialVault
  private readonly pineLabs: PineLabsGateway
  constructor(store: IntegrationStore, vault?: CredentialVault, pineLabs = new PineLabsGateway()) { this.store = store; this.vault = vault; this.pineLabs = pineLabs }

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
    if (!integration) throw new ApiError(409, 'This payment gateway is not configured for the tenant.')
    if (!this.vault) throw new ApiError(503, 'Integration credential encryption is not configured.')
    const credentials = this.vault.decrypt(integration.encryptedCredentials, account.client.id, providerCode)
    return { provider: providerCode, environment: integration.environment, initialized: true, configuredFields: Object.keys(credentials).sort(), publicConfig: integration.publicConfig }
  }

  async createPineLabsCheckout(account: Account, body: unknown) {
    const parsed = checkoutSchema.safeParse(body)
    if (!parsed.success) throw new ApiError(422, 'Invalid Pine Labs checkout request.')
    const integration = await this.store.findActive(account.client.id, 'pinelabs')
    if (!integration) throw new ApiError(409, 'Pine Labs is not configured for the tenant.')
    if (!this.vault) throw new ApiError(503, 'Integration credential encryption is not configured.')
    const credentials = this.vault.decrypt(integration.encryptedCredentials, account.client.id, 'pinelabs')
    const config = integration.publicConfig && typeof integration.publicConfig === 'object' && !Array.isArray(integration.publicConfig) ? integration.publicConfig : {}
    const callbackUrl = typeof config.callbackUrl === 'string' ? config.callbackUrl : ''
    if (!/^https:\/\//i.test(callbackUrl)) throw new ApiError(409, 'Pine Labs callback URL is not configured.')
    const supported = new Set(['CARD', 'UPI', 'POINTS', 'NETBANKING', 'WALLET', 'CREDIT_EMI', 'DEBIT_EMI', 'BNPL'])
    const methods = Array.isArray(config.allowedPaymentMethods) ? config.allowedPaymentMethods.map(String).filter(value => supported.has(value)) : ['CARD', 'UPI']
    try { const checkout = await this.pineLabs.checkout(integration.environment, credentials, { ...parsed.data, callbackUrl, allowedPaymentMethods: methods.length ? methods : ['CARD', 'UPI'] }); await this.store.recordCheckout({ clientId: account.client.id, userId: account.user.id, providerCode: 'pinelabs', merchantReference: parsed.data.merchantOrderReference, externalOrderId: checkout.orderId, amountInPaise: parsed.data.amountInPaise, redirectUrl: checkout.redirectUrl }); return checkout }
    catch (error) { throw new ApiError(502, error instanceof Error ? error.message : 'Pine Labs is unavailable.') }
  }
}
