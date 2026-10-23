export type PasswordResetRequester = {
  type: 'client_user' | 'admin'
  id: bigint
  clientId: bigint | null
  clientName?: string | null
  name: string
  mobile: string
  isAdmin: boolean
}

export type PasswordResetRequestRow = PasswordResetRequester & {
  requestId: bigint
  assignedLevel: 'tenant_admin' | 'super_admin'
  requestedAt: Date
}

export interface PasswordResetRequestStore {
  findRequester(mobile: string): Promise<PasswordResetRequester | null>
  createOrRefresh(requester: PasswordResetRequester, assignedLevel: 'tenant_admin' | 'super_admin', now: Date): Promise<void>
  listTenant(clientId: bigint): Promise<PasswordResetRequestRow[]>
  listSuperAdmin(): Promise<PasswordResetRequestRow[]>
  resetTenantRequest(requestId: bigint, clientId: bigint, actorId: bigint, passwordHash: string, now: Date): Promise<boolean>
  resetSuperAdminRequest(requestId: bigint, actorId: bigint, passwordHash: string, now: Date): Promise<boolean>
}
