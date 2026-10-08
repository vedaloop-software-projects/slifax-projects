import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { hash } from 'bcryptjs'
import type { AccessSave, AccessStore } from '../../../models/access/contracts.ts'
import type { AuthConfig } from '../../../models/auth/config.ts'
import type { Account, AuthStore, PermissionRow } from '../../../models/auth/contracts.ts'
import { AuthService } from '../../auth/service.ts'
import { createAuthRouter } from '../../auth/router.ts'
import { createApp } from '../../system/app.ts'
import { createAccessRouter } from '../router.ts'
import { AccessService } from '../service.ts'

const account: Account = { user: { id: 3n, clientId: 7n, name: 'Admin', mobile: '9876543210', email: 'admin@example.com', passwordHash: null, roleId: 4, updatedAt: null }, client: { id: 7n, businessTypeId: 2, businessName: 'Store', logo: null, address: 'Chennai', city: 'Chennai', startDate: new Date('2025-01-01'), endDate: new Date('2030-12-31') }, businessType: 'Retail', roleTitle: 'Admin' }
class MemoryAuth implements AuthStore {
  permissions: PermissionRow[] = [{ featureId: 1n, feature: 'Settings', featurePriority: 1, subFeatureId: 2n, subFeature: 'Access Levels', subFeaturePriority: 1, view: 1, add: 1, edit: 1 }]
  async findAccountByLogin(login: string) { return login === account.user.email ? account : null } async findAccountByIdentity(id: bigint, client: bigint) { return id === 3n && client === 7n ? account : null }
  async listPermissions() { return this.permissions } async getProfile() { return null } async recordAudit() {} async changePassword() { return new Date() }
}
class MemoryAccess implements AccessStore {
  client?: bigint; saved?: AccessSave; result: 'saved' | 'role_missing' | 'feature_invalid' | 'subfeature_invalid' = 'saved'
  async getRoleAccess(client: bigint, role: bigint) { this.client = client; return role === 9n ? { billingAccess: { allowDiscount: 1, allowPriceOverride: 0, allowRefund: 0 }, features: [{ featureId: 10n, featureName: 'Products', status: 1, isAdd: 1, isEdit: 0, isView: 1, subFeatures: [{ subFeatureId: 11n, subFeatureName: 'Catalogue', status: 1, isAdd: 1, isEdit: 0, isView: 1 }] }] } : null }
  async saveRoleAccess(received: Account, value: AccessSave) { this.client = received.client.id; this.saved = value; return this.result }
}
async function withApi(action: (base: string, token: string, store: MemoryAccess, auth: MemoryAuth) => Promise<void>) {
  const authStore = new MemoryAuth(), store = new MemoryAccess(); account.user.passwordHash = await hash('Valid1!', 4)
  const config: AuthConfig = { jwtSecret: new TextEncoder().encode('access-test-secret-with-at-least-32-bytes'), jwtIssuer: 'test', jwtAudience: 'test', jwtLifetime: '1h', publicBaseUrl: '' }
  const auth = new AuthService(authStore, config, () => new Date('2026-10-07')), server = createServer(createApp(undefined, [createAuthRouter(auth), createAccessRouter(auth, new AccessService(store, authStore))]))
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); const address = server.address(); assert.ok(address && typeof address !== 'string')
  try { const base = `http://127.0.0.1:${address.port}/api`, login = await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobileEmail: account.user.email, password: 'Valid1!' }) }), body = await login.json() as any; await action(base, body.data.user.token, store, authStore) } finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) }
}
const headers = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })
test('role access read preserves nested feature and billing contracts', async () => { await withApi(async (base, token, store) => { const response = await fetch(`${base}/getRoleAccessLevels`, { method: 'POST', headers: headers(token), body: JSON.stringify({ roleId: 9 }) }); assert.equal(response.status, 200); const body = await response.json() as any; assert.equal(body.data.features[0].subFeatures[0].subFeatureId, 11); assert.equal(body.data.billingAccess.allowDiscount, 1); assert.equal(store.client, 7n) }) })
test('access save validates exact grants, tenant entitlements and server permission', async () => { await withApi(async (base, token, store, auth) => { const payload = { roleId: 9, billingAccess: { allowDiscount: 1, allowPriceOverride: 0, allowRefund: 0 }, features: [{ featureId: 10, status: 1, isAdd: 1, isEdit: 0, isView: 1, subFeatures: [{ subFeatureId: 11, status: 1, isAdd: 1, isEdit: 0, isView: 1 }] }] }; assert.equal((await fetch(`${base}/saveRoleAccessLevels`, { method: 'POST', headers: headers(token), body: JSON.stringify(payload) })).status, 200); assert.equal(store.saved?.features[0].featureId, 10n); store.result = 'feature_invalid'; assert.equal((await fetch(`${base}/saveRoleAccessLevels`, { method: 'POST', headers: headers(token), body: JSON.stringify(payload) })).status, 422); auth.permissions = [{ ...auth.permissions[0], edit: 0 }]; assert.equal((await fetch(`${base}/saveRoleAccessLevels`, { method: 'POST', headers: headers(token), body: JSON.stringify(payload) })).status, 403) }) })
