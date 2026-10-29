export type Account = {
  user: {
    id: bigint
    clientId: bigint
    name: string | null
    mobile: string | null
    email: string | null
    passwordHash: string | null
    roleId: number
    isAdmin?: number
    updatedAt: Date | null
  }
  client: {
    id: bigint
    businessTypeId: number
    businessName: string
    logo: string | null
    address: string
    city: string
    startDate: Date | null
    endDate: Date | null
    // IANA zone of the store (users.time_zone); null means Asia/Kolkata.
    timeZone?: string | null
  }
  businessType: string | null
  roleTitle: string | null
  // Set when the request's token belongs to a tracked single-device session.
  sessionId?: string
}

export type PermissionRow = {
  featureId: bigint
  feature: string
  featurePriority: number
  subFeatureId: bigint | null
  subFeature: string | null
  subFeaturePriority: number | null
  view: number
  add: number
  edit: number
}

export type Profile = Record<string, string | number | null>

export interface AuthStore {
  findAccountByLogin(login: string): Promise<Account | null>
  findAccountByIdentity(userId: bigint, clientId: bigint): Promise<Account | null>
  listPermissions(clientId: bigint, roleId: number): Promise<PermissionRow[]>
  getProfile(clientId: bigint): Promise<Profile | null>
  recordAudit(account: Account, type: string, description: string): Promise<void>
  changePassword(account: Account, expectedHash: string, passwordHash: string): Promise<Date>
  setTimeZone?(clientId: bigint, timeZone: string): Promise<void>
}
