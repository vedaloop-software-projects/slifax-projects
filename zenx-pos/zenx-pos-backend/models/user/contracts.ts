import type { Account } from '../auth/contracts.ts'

export type ManagedUserInput = { roleId: bigint; name: string; email: string; mobile: string; passwordHash?: string; maxDiscountPercentage: number; status: number }
export type ManagedUserRow = { id: bigint; roleId: bigint; roleName: string; name: string; email: string; mobile: string; maxDiscountPercentage: number; status: number; isPrimaryAdmin?: boolean }
export type UserWriteResult = 'saved' | 'missing' | 'role_missing' | 'mobile_duplicate' | 'email_duplicate' | 'protected' | 'primary_required' | 'self_protected'
export interface UserStore {
  createUser(account: Account, value: ManagedUserInput): Promise<UserWriteResult>
  updateUser(account: Account, id: bigint, value: ManagedUserInput): Promise<UserWriteResult>
  getUser(clientId: bigint, id: bigint): Promise<ManagedUserRow | null>
  listUsers(clientId: bigint, filters: { search?: string; status?: number; page: number; perPage: number }): Promise<{ rows: ManagedUserRow[]; total: number }>
}
