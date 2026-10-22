import type { Prisma, PrismaClient } from '@prisma/client'
import type { CredentialField, IntegrationEnvironment, IntegrationStatus, IntegrationStore, TenantIntegrationView } from './contracts.ts'
import type { JsonCache } from '../cache/cache-aside.ts'
import { profileCacheKey } from '../cache/cache-aside.ts'

const schema = (value: Prisma.JsonValue): CredentialField[] => Array.isArray(value) ? value.filter((row): row is Prisma.JsonObject => Boolean(row && typeof row === 'object' && !Array.isArray(row))).map(row => ({ key: String(row.key ?? ''), label: String(row.label ?? ''), secret: row.secret === true, required: row.required === true })).filter(row => row.key) : []
const fields = (value: Prisma.JsonValue | null) => value && typeof value === 'object' && !Array.isArray(value) && Array.isArray(value.configuredFields) ? value.configuredFields.map(String) : []

export class PrismaIntegrationStore implements IntegrationStore {
  private readonly db: PrismaClient
  private readonly cache?: JsonCache
  constructor(db: PrismaClient, cache?: JsonCache) { this.db = db; this.cache = cache }

  async listForTenant(clientId: bigint): Promise<TenantIntegrationView[]> {
    const [providers, requests, integrations] = await Promise.all([
      this.db.integrationProviders.findMany({ where: { status: 1 }, orderBy: { name: 'asc' } }),
      this.db.tenantIntegrationRequests.findMany({ where: { client_id: clientId } }),
      this.db.tenantIntegrations.findMany({ where: { client_id: clientId } }),
    ])
    return providers.map(provider => {
      const request = requests.find(row => row.provider_id === provider.id)
      const integration = integrations.find(row => row.provider_id === provider.id)
      return { id: provider.id, code: provider.code, name: provider.name, category: provider.category, description: provider.description, credentialSchema: schema(provider.credential_schema), status: provider.status, requestId: request?.id ?? null, requestStatus: request?.status as IntegrationStatus ?? null, tenantNotes: request?.tenant_notes ?? null, adminNotes: request?.admin_notes ?? null, environment: integration?.environment as IntegrationEnvironment ?? null, integrationStatus: integration?.status ?? null, configuredFields: fields(integration?.public_config ?? null), publicConfig: integration?.public_config ?? null }
    })
  }

  async request(clientId: bigint, userId: bigint, providerCode: string, notes: string | null) {
    const provider = await this.db.integrationProviders.findFirst({ where: { code: providerCode, status: 1 } })
    if (!provider) return 'missing' as const
    const existing = await this.db.tenantIntegrationRequests.findUnique({ where: { client_id_provider_id: { client_id: clientId, provider_id: provider.id } } })
    const now = new Date()
    if (existing) {
      await this.db.tenantIntegrationRequests.update({ where: { id: existing.id }, data: { status: 'requested', tenant_notes: notes, admin_notes: null, requested_by: userId, handled_by: null, updated_at: now } })
      return 'updated' as const
    }
    await this.db.tenantIntegrationRequests.create({ data: { client_id: clientId, provider_id: provider.id, status: 'requested', tenant_notes: notes, requested_by: userId, created_at: now, updated_at: now } })
    return 'created' as const
  }

  async listForAdmin(status?: string) {
    const requests = await this.db.tenantIntegrationRequests.findMany({ where: status ? { status } : undefined, orderBy: { updated_at: 'desc' } })
    const providerIds = [...new Set(requests.map(row => row.provider_id))], clientIds = [...new Set(requests.map(row => row.client_id))]
    const [providers, clients, integrations] = await Promise.all([
      this.db.integrationProviders.findMany({ where: { id: { in: providerIds } } }),
      this.db.users.findMany({ where: { id: { in: clientIds } }, select: { id: true, business_name: true } }),
      this.db.tenantIntegrations.findMany({ where: { client_id: { in: clientIds }, provider_id: { in: providerIds } } }),
    ])
    return requests.map(request => {
      const provider = providers.find(row => row.id === request.provider_id)!, client = clients.find(row => row.id === request.client_id)!, integration = integrations.find(row => row.client_id === request.client_id && row.provider_id === request.provider_id)
      return { id: provider.id, code: provider.code, name: provider.name, category: provider.category, description: provider.description, credentialSchema: schema(provider.credential_schema), status: provider.status, requestId: request.id, requestStatus: request.status as IntegrationStatus, tenantNotes: request.tenant_notes, adminNotes: request.admin_notes, environment: integration?.environment as IntegrationEnvironment ?? null, integrationStatus: integration?.status ?? null, configuredFields: fields(integration?.public_config ?? null), publicConfig: integration?.public_config ?? null, clientId: request.client_id, clientName: client?.business_name ?? 'Unknown client' }
    })
  }

  async configure(input: { requestId: bigint; adminId: bigint; environment: IntegrationEnvironment; encryptedCredentials: string; configuredFields: string[]; publicConfig: Prisma.InputJsonValue; notes: string | null }) {
    const request = await this.db.tenantIntegrationRequests.findUnique({ where: { id: input.requestId } })
    if (!request) return 'missing' as const
    const now = new Date(), publicConfig = { ...(input.publicConfig as Prisma.JsonObject), configuredFields: input.configuredFields }
    await this.db.$transaction([
      this.db.tenantIntegrations.upsert({ where: { client_id_provider_id: { client_id: request.client_id, provider_id: request.provider_id } }, create: { client_id: request.client_id, provider_id: request.provider_id, environment: input.environment, encrypted_credentials: input.encryptedCredentials, public_config: publicConfig, status: 'active', configured_by: input.adminId, created_at: now, updated_at: now }, update: { environment: input.environment, encrypted_credentials: input.encryptedCredentials, public_config: publicConfig, status: 'active', configured_by: input.adminId, updated_at: now } }),
      this.db.tenantIntegrationRequests.update({ where: { id: request.id }, data: { status: 'configured', admin_notes: input.notes, handled_by: input.adminId, updated_at: now } }),
    ])
    return 'configured' as const
  }

  async updateRequest(input: { requestId: bigint; adminId: bigint; status: IntegrationStatus; notes: string | null }) {
    const request = await this.db.tenantIntegrationRequests.findUnique({ where: { id: input.requestId } })
    if (!request) return 'missing' as const
    const now = new Date()
    await this.db.$transaction(async tx => {
      await tx.tenantIntegrationRequests.update({ where: { id: request.id }, data: { status: input.status, admin_notes: input.notes, handled_by: input.adminId, updated_at: now } })
      if (input.status === 'disabled') await tx.tenantIntegrations.updateMany({ where: { client_id: request.client_id, provider_id: request.provider_id }, data: { status: 'disabled', configured_by: input.adminId, updated_at: now } })
    })
    return 'updated' as const
  }

  async findActive(clientId: bigint, providerCode: string) {
    const provider = await this.db.integrationProviders.findUnique({ where: { code: providerCode } })
    if (!provider) return null
    const row = await this.db.tenantIntegrations.findFirst({ where: { client_id: clientId, provider_id: provider.id, status: 'active' } })
    return row ? { environment: row.environment as IntegrationEnvironment, encryptedCredentials: row.encrypted_credentials, publicConfig: row.public_config } : null
  }

  async recordCheckout(input: { clientId: bigint; userId: bigint; providerCode: string; merchantReference: string; externalOrderId: string; amountInPaise: number; redirectUrl: string }) {
    const provider = await this.db.integrationProviders.findUnique({ where: { code: input.providerCode } })
    if (!provider) throw new Error('Integration provider is unavailable.')
    const now = new Date()
    await this.db.paymentGatewayTransactions.upsert({ where: { client_id_provider_id_merchant_reference: { client_id: input.clientId, provider_id: provider.id, merchant_reference: input.merchantReference } }, create: { client_id: input.clientId, provider_id: provider.id, merchant_reference: input.merchantReference, external_order_id: input.externalOrderId, amount_in_paise: BigInt(input.amountInPaise), currency: 'INR', status: 'created', redirect_url: input.redirectUrl, created_by: input.userId, created_at: now, updated_at: now }, update: { external_order_id: input.externalOrderId, amount_in_paise: BigInt(input.amountInPaise), status: 'created', redirect_url: input.redirectUrl, updated_at: now } })
  }

  async renewalQuote(clientId: bigint) {
    const client = await this.db.users.findFirst({ where: { id: clientId, trash: 0 } })
    if (!client) return null
    return { businessName: client.business_name, contactPerson: client.contact_person, email: client.email || null, mobile: client.mobile, amount: Number(client.subscription_final_amount), duration: client.subscription_duration, endDate: client.end_date }
  }

  async completeRenewal(input: { clientId: bigint; userId: bigint; providerCode: string; orderId: string; gatewayReference: string; amountInPaise: number; paidAt: Date }) {
    const provider = await this.db.integrationProviders.findUnique({ where: { code: input.providerCode } })
    if (!provider) return { status: 'missing' as const }
    const result = await this.db.$transaction(async tx => {
      const payment = await tx.paymentGatewayTransactions.findFirst({ where: { client_id: input.clientId, provider_id: provider.id, external_order_id: input.orderId } })
      const client = await tx.users.findFirst({ where: { id: input.clientId, trash: 0 } })
      if (!payment || !client) return { status: 'missing' as const }
      if (payment.amount_in_paise !== BigInt(input.amountInPaise)) return { status: 'amount_mismatch' as const }
      const months = ({ 1: 3, 2: 6, 3: 12 } as Record<number, number>)[client.subscription_duration]
      if (!months) return { status: 'missing' as const }
      const previousExpiry = client.end_date
      const base = previousExpiry && previousExpiry > input.paidAt ? new Date(previousExpiry) : new Date(input.paidAt)
      const renewedUntil = new Date(base); renewedUntil.setUTCMonth(renewedUntil.getUTCMonth() + months)
      let collection = await tx.clientPayments.findFirst({ where: { client_id: input.clientId, reference_number: input.gatewayReference, payment_type: 2 } })
      const completed = payment.status === 'paid'
      if (!completed) {
        collection = await tx.clientPayments.create({ data: { client_id: input.clientId, paid_amount: input.amountInPaise / 100, payment_mode: 2, reference_number: input.gatewayReference, payment_date: input.paidAt, payment_type: 2, subscription_duration: client.subscription_duration, created_by: Number(input.userId), updated_by: Number(input.userId), created_at: input.paidAt, updated_at: input.paidAt } })
        await tx.users.update({ where: { id: input.clientId }, data: { paid_amount: input.amountInPaise / 100, end_date: renewedUntil, status: 1, updated_by: Number(input.userId), updated_at: input.paidAt } })
        await tx.paymentGatewayTransactions.update({ where: { id: payment.id }, data: { status: 'paid', updated_at: input.paidAt } })
        await tx.audits.create({ data: { client_id: input.clientId, user_id: input.userId, type: 'renewal', description: `Subscription renewed through Cashfree until ${renewedUntil.toISOString().slice(0, 10)}`, created_at: input.paidAt, updated_at: input.paidAt } })
      }
      if (!collection) return { status: 'missing' as const }
      return { status: completed ? 'already_completed' as const : 'completed' as const, invoice: { invoiceNumber: `REN-${collection.id}`, businessName: client.business_name, amount: input.amountInPaise / 100, paidAt: collection.payment_date ?? input.paidAt, previousExpiry, renewedUntil: completed ? (client.end_date ?? renewedUntil) : renewedUntil, duration: client.subscription_duration, gateway: 'Cashfree', reference: input.gatewayReference } }
    }, { isolationLevel: 'Serializable' })
    if (result.status === 'completed') await this.cache?.delete(profileCacheKey(input.clientId))
    return result
  }
}
