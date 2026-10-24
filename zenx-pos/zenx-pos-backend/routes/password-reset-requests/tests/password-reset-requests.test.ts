import assert from 'node:assert/strict'
import test from 'node:test'
import { compare } from 'bcryptjs'
import type { Account } from '../../../models/auth/contracts.ts'
import type { PasswordResetRequester, PasswordResetRequestRow, PasswordResetRequestStore } from '../../../models/password-reset/contracts.ts'
import { PasswordResetRequestService } from '../service.ts'

class MemoryStore implements PasswordResetRequestStore {
  requester: PasswordResetRequester | null = null
  assigned?: string
  tenantReset?: { requestId: bigint; clientId: bigint; actorId: bigint; passwordHash: string }
  superReset?: { requestId: bigint; actorId: bigint; passwordHash: string }
  async findRequester() { return this.requester }
  async createOrRefresh(_requester: PasswordResetRequester, assigned: 'tenant_admin' | 'super_admin') { this.assigned = assigned }
  async listTenant() { return [] as PasswordResetRequestRow[] }
  async listSuperAdmin() { return [] as PasswordResetRequestRow[] }
  async resetTenantRequest(requestId: bigint, clientId: bigint, actorId: bigint, passwordHash: string) { this.tenantReset = { requestId, clientId, actorId, passwordHash }; return true }
  async resetSuperAdminRequest(requestId: bigint, actorId: bigint, passwordHash: string) { this.superReset = { requestId, actorId, passwordHash }; return true }
}

const account = (isAdmin: number): Account => ({ user: { id: 4n, clientId: 7n, name: 'Store Admin', mobile: '9876543210', email: null, passwordHash: null, roleId: 1, isAdmin, updatedAt: null }, client: { id: 7n, businessTypeId: 1, businessName: 'Store', logo: null, address: '', city: '', startDate: null, endDate: null }, businessType: 'Retail', roleTitle: 'Admin' })

test('routes ordinary users to tenant admins and tenant admins to super admins', async () => {
  const store = new MemoryStore(), service = new PasswordResetRequestService(store)
  store.requester = { type: 'client_user', id: 10n, clientId: 7n, name: 'Cashier', mobile: '9876543210', isAdmin: false }
  await service.request({ mobile: '9876543210' }); assert.equal(store.assigned, 'tenant_admin')
  store.requester = { ...store.requester, isAdmin: true }
  await service.request({ mobile: '9876543210' }); assert.equal(store.assigned, 'super_admin')
})

test('returns normally for unknown valid mobile numbers to prevent account discovery', async () => {
  await new PasswordResetRequestService(new MemoryStore()).request({ mobile: '9876543210' })
})

test('only a tenant admin can resolve tenant requests and the password is hashed', async () => {
  const store = new MemoryStore(), service = new PasswordResetRequestService(store)
  await assert.rejects(() => service.tenantReset(account(0), { requestId: 2, newPassword: 'Valid1!x', confirmPassword: 'Valid1!x' }), /Only the primary admin/)
  await service.tenantReset(account(1), { requestId: 2, newPassword: 'Valid1!x', confirmPassword: 'Valid1!x' })
  assert.equal(store.tenantReset?.clientId, 7n)
  assert.equal(await compare('Valid1!x', store.tenantReset!.passwordHash), true)
})
