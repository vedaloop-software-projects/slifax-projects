import type { Account } from '../auth/contracts.ts'

export type AuditFilters = {
  page: number
  perPage: number
  userId?: bigint
  createdFrom?: Date
  createdTo?: Date
}

export type AuditReport = {
  id: bigint
  type: string
  description: string
  userId: bigint
  userName: string | null
  createdAt: Date | null
}

export type AuditPage = { rows: AuditReport[]; total: number }

export type ProfileUpdate = {
  mobile: string
  email: string
  businessName: string
  businessTypeId: number
  contactPerson: string
  alternateMobile: string | null
  stateId: number
  city: string
  pincode: number
  websiteUrl: string | null
  address: string
  gstNumber: string | null
  gstCode: number | null
  panNumber: string | null
  fssaiNumber: string | null
  upiId: string | null
  tradeLicenseNumber: string | null
}

export type ProfileUpdateResult =
  | { status: 'updated'; oldLogo: string | null }
  | { status: 'profile_missing' | 'business_type_invalid' | 'state_invalid' | 'email_duplicate' | 'mobile_duplicate' }

export type LogoFile = { buffer: Buffer; mimeType: string }
export interface LogoStorage {
  save(file: LogoFile): Promise<string>
  remove(path: string): Promise<void>
}

export interface AccountStore {
  listAudits(clientId: bigint, filters: AuditFilters): Promise<AuditPage>
  getBillFormatId(clientId: bigint): Promise<string | null>
  updateBillFormat(account: Account, billFormatId: bigint): Promise<'updated' | 'settings_missing' | 'format_invalid'>
  updateProfile(account: Account, profile: ProfileUpdate, logoPath?: string): Promise<ProfileUpdateResult>
}
