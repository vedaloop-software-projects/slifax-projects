import type { Prisma } from '@prisma/client'

export type IntegrationEnvironment = 'sandbox' | 'production'
export type IntegrationStatus = 'requested' | 'in_review' | 'configured' | 'rejected' | 'disabled'

export type CredentialField = {
  key: string
  label: string
  secret: boolean
  required: boolean
}

export type IntegrationProviderView = {
  id: bigint
  code: string
  name: string
  category: string
  description: string | null
  credentialSchema: CredentialField[]
  status: number
}

export type TenantIntegrationView = IntegrationProviderView & {
  requestId: bigint | null
  requestStatus: IntegrationStatus | null
  tenantNotes: string | null
  adminNotes: string | null
  environment: IntegrationEnvironment | null
  integrationStatus: string | null
  configuredFields: string[]
  publicConfig: Prisma.JsonValue | null
}

export interface IntegrationStore {
  listForTenant(clientId: bigint): Promise<TenantIntegrationView[]>
  request(clientId: bigint, userId: bigint, providerCode: string, notes: string | null): Promise<'created' | 'updated' | 'missing'>
  listForAdmin(status?: string): Promise<Array<TenantIntegrationView & { clientId: bigint; clientName: string }>>
  configure(input: { requestId: bigint; adminId: bigint; environment: IntegrationEnvironment; encryptedCredentials: string; configuredFields: string[]; publicConfig: Prisma.InputJsonValue; notes: string | null }): Promise<'configured' | 'missing'>
  updateRequest(input: { requestId: bigint; adminId: bigint; status: IntegrationStatus; notes: string | null }): Promise<'updated' | 'missing'>
  findActive(clientId: bigint, providerCode: string): Promise<{ environment: IntegrationEnvironment; encryptedCredentials: string; publicConfig: Prisma.JsonValue | null } | null>
  recordCheckout(input: { clientId: bigint; userId: bigint; providerCode: string; merchantReference: string; externalOrderId: string; amountInPaise: number; redirectUrl: string }): Promise<void>
  renewalQuote(clientId: bigint): Promise<{ businessName: string; contactPerson: string; email: string | null; mobile: string; amount: number; duration: number; endDate: Date | null } | null>
  completeRenewal(input: { clientId: bigint; userId: bigint; providerCode: string; orderId: string; gatewayReference: string; amountInPaise: number; paidAt: Date }): Promise<{ status: 'completed' | 'already_completed' | 'missing' | 'amount_mismatch'; invoice?: RenewalInvoice }>
}

export type RenewalInvoice = { invoiceNumber: string; businessName: string; amount: number; paidAt: Date; previousExpiry: Date | null; renewedUntil: Date; duration: number; gateway: string; reference: string }
