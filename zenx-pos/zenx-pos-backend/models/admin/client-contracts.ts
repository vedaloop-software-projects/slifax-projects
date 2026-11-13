import type { AdminIdentity } from './contracts.ts'
import type { LogoFile, LogoStorage } from '../account/contracts.ts'

export type { LogoFile, LogoStorage }

export type ClientInput = {
  businessName: string; businessTypeId: number; email: string; contactPerson: string; mobile: string; alternateMobile: string | null
  stateId: number; city: string; pincode: number; websiteUrl: string | null; address: string; gstNumber: string | null; gstCode: number | null
  panNumber: string | null; fssaiNumber: string | null; licenseNumber: string | null; amount: number; discountType: number
  discountValue: number; gst: number; startDate: Date; endDate: Date; subscriptionDuration: number; subscriptionAmount: number
  subscriptionDiscountType: number; subscriptionDiscountValue: number; subscriptionGst: number; status: number; maxUsers: number | null; password?: string
  // WhatsApp (left unchanged when undefined).
  whatsappEnabled?: number; whatsappMonthlyQuota?: number; whatsappPricePaise?: number | null
}
export type ClientListFilter = { search?: string; businessTypeId?: number; status?: number; subscriptionDuration?: number; page: number; take: number }
export type ClientListSummary = { total: number; active: number; expiring: number; expired: number }
export type PaymentInput = { clientId: bigint; amount: number; mode: number; reference: string | null; date: Date; type: number; extendContract: boolean }

export interface ClientAdminStore {
  prerequisites(): Promise<{ businessTypes: unknown[]; states: unknown[]; features: unknown[] }>
  list(filters: ClientListFilter): Promise<{ rows: Array<Record<string, unknown>>; total: number; summary?: ClientListSummary }>
  find(id: bigint): Promise<Record<string, unknown> | null>
  identityAvailable(email: string, mobile: string, excludeId?: bigint): Promise<boolean>
  validateReferences(input: ClientInput): Promise<boolean>
  create(input: ClientInput & { password: string }, actor: AdminIdentity, featureIds: bigint[], subFeatureIds: bigint[], logoPath?: string, initialPayments?: Omit<PaymentInput, 'clientId' | 'extendContract'>[]): Promise<bigint>
  update(id: bigint, input: ClientInput, actor: AdminIdentity, logoPath?: string, featureIds?: bigint[], subFeatureIds?: bigint[]): Promise<{ updated: boolean; oldLogo: string | null }>
  setStatus(id: bigint, status: number, actor: AdminIdentity): Promise<boolean>
  softDelete(id: bigint, actor: AdminIdentity): Promise<boolean>
  features(id: bigint): Promise<{ client: Record<string, unknown>; features: unknown[]; clientFeatures: unknown[] } | null>
  updateFeatures(id: bigint, featureIds: bigint[], subFeatureIds: bigint[], actor: AdminIdentity): Promise<boolean>
  payments(id: bigint): Promise<{ softwarePayments: unknown[]; mmcPayments: unknown[]; softwareTotal: number; softwareReceived: number; softwareBalance: number; amcTotal: number; amcReceived: number; amcBalance: number } | null>
  storePayment(input: PaymentInput, actor: AdminIdentity): Promise<boolean>
  collections(from: Date | undefined, to: Date | undefined, page: number, take: number): Promise<{ rows: unknown[]; total: number; today: number; week: number; month: number; year: number }>
}
