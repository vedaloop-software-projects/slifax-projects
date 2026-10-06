import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { hash } from 'bcryptjs'
import type { AccountStore, AuditFilters, LogoFile, LogoStorage, ProfileUpdate, ProfileUpdateResult } from '../../../models/account/contracts.ts'
import type { Account, AuthStore, PermissionRow } from '../../../models/auth/contracts.ts'
import type { AuthConfig } from '../../../models/auth/config.ts'
import { AuthService } from '../../auth/service.ts'
import { createAuthRouter } from '../../auth/router.ts'
import { createApp } from '../../system/app.ts'
import { AccountService } from '../service.ts'
import { createAccountRouter } from '../router.ts'

const account: Account = {
  user: { id: 3n, clientId: 7n, name: 'Praveen', mobile: '9876543210', email: 'p@example.com', passwordHash: null, roleId: 4, updatedAt: null },
  client: { id: 7n, businessTypeId: 2, businessName: 'Demo Store', logo: null, address: 'Chennai', city: 'Chennai', startDate: new Date('2025-01-01'), endDate: new Date('2030-12-31') },
  businessType: 'Retail', roleTitle: 'Admin',
}

class MemoryAuthStore implements AuthStore {
  permissions: PermissionRow[] = [{ featureId: 1n, feature: 'Settings', featurePriority: 1, subFeatureId: null, subFeature: null, subFeaturePriority: null, view: 1, add: 0, edit: 1 }]
  async findAccountByLogin(login: string) { return login === account.user.email ? account : null }
  async findAccountByIdentity(userId: bigint, clientId: bigint) { return userId === 3n && clientId === 7n ? account : null }
  async listPermissions() { return this.permissions }
  async getProfile() { return null }
  async recordAudit() {}
  async changePassword() { return new Date() }
}

class MemoryAccountStore implements AccountStore {
  filters?: AuditFilters
  clientId?: bigint
  billFormat = '5'
  updateResult: 'updated' | 'settings_missing' | 'format_invalid' = 'updated'
  profileResult: ProfileUpdateResult = { status: 'updated', oldLogo: 'uploads/business_logos/old.png' }
  receivedProfile?: ProfileUpdate
  receivedLogo?: string
  async listAudits(clientId: bigint, filters: AuditFilters) {
    this.clientId = clientId
    this.filters = filters
    return { total: 2, rows: [
      { id: 9n, type: 'login', description: 'Praveen logged in', userId: 3n, userName: 'Praveen', createdAt: new Date('2026-10-01T04:00:00Z') },
      { id: 8n, type: 'update', description: 'Settings updated', userId: 3n, userName: 'Praveen', createdAt: new Date('2026-10-01T03:30:00Z') },
    ] }
  }
  async getBillFormatId(clientId: bigint) { this.clientId = clientId; return this.billFormat }
  async updateBillFormat(received: Account, _id: bigint) { this.clientId = received.client.id; return this.updateResult }
  async updateProfile(_account: Account, profile: ProfileUpdate, logo?: string) {
    this.receivedProfile = profile
    this.receivedLogo = logo
    return this.profileResult
  }
}

class MemoryLogoStorage implements LogoStorage {
  saved: LogoFile[] = []
  removed: string[] = []
  async save(file: LogoFile) { this.saved.push(file); return 'uploads/business_logos/new.png' }
  async remove(path: string) { this.removed.push(path) }
}

async function withApi(store: MemoryAccountStore, action: (base: string, token: string) => Promise<void>, logos?: LogoStorage) {
  const authStore = new MemoryAuthStore()
  account.user.passwordHash = await hash('Valid1!', 4)
  const config: AuthConfig = {
    jwtSecret: new TextEncoder().encode('account-test-secret-with-at-least-32-bytes'), jwtIssuer: 'test', jwtAudience: 'test', jwtLifetime: '1h', publicBaseUrl: '',
  }
  const auth = new AuthService(authStore, config, () => new Date('2026-10-06'))
  const server = createServer(createApp(undefined, [createAuthRouter(auth), createAccountRouter(auth, new AccountService(store, 2, logos))]))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const base = `http://127.0.0.1:${address.port}/api`
  try {
    const response = await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobileEmail: 'p@example.com', password: 'Valid1!' }) })
    const body = await response.json() as any
    await action(base, body.data.user.token)
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
}

test('audit endpoint applies tenant, date/time and bounded pagination filters', async () => {
  const store = new MemoryAccountStore()
  await withApi(store, async (base, token) => {
    const response = await fetch(`${base}/getAuditReports`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: 1, userId: 3, fromDate: '2026-10-01', toDate: '2026-10-01', fromTime: '09:00 AM', toTime: '05:00 PM' }),
    })
    assert.equal(response.status, 200)
    const body = await response.json() as any
    assert.equal(body.data.pagination.perPage, 2)
    assert.equal(body.data.auditReports[0].createdAt, '01-10-2026 09:30 AM')
    assert.equal(store.clientId, 7n)
    assert.equal(store.filters?.createdFrom?.toISOString(), '2026-10-01T03:30:00.000Z')
    assert.equal(store.filters?.createdTo?.toISOString(), '2026-10-01T11:30:59.999Z')
  })
})

test('audit endpoint rejects invalid filters and calendar dates', async () => {
  const store = new MemoryAccountStore()
  await withApi(store, async (base, token) => {
    for (const input of [
      { fromTime: '09:00 AM' },
      { fromDate: '2026-02-30', toDate: '2026-03-01' },
      { unexpected: true },
    ]) {
      const response = await fetch(`${base}/getAuditReports`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
      assert.equal(response.status, 422)
    }
  })
})

test('bill-format endpoints preserve contract and surface invalid selections', async () => {
  const store = new MemoryAccountStore()
  await withApi(store, async (base, token) => {
    const headers = { Authorization: `Bearer ${token}` }
    const current = await fetch(`${base}/getBillFormatId`, { headers })
    assert.deepEqual(await current.json(), { success: true, message: 'Bill format fetched successfully.', data: { billFormatId: '5' } })
    const updated = await fetch(`${base}/updateBillFormat`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 6 }) })
    assert.equal(updated.status, 200)
    store.updateResult = 'format_invalid'
    const invalid = await fetch(`${base}/updateBillFormat`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 999 }) })
    assert.equal(invalid.status, 404)
    assert.deepEqual(await invalid.json(), { errors: 'Invalid bill format.' })
  })
})

test('profile update validates multipart data, stores the logo and keeps the session valid', async () => {
  const store = new MemoryAccountStore()
  const logos = new MemoryLogoStorage()
  await withApi(store, async (base, token) => {
    const data = {
      mobile: '9876543210', email: 'shop@example.com', businessName: 'Updated Store', businessTypeId: 2,
      contactPerson: 'Praveen', alternateMobile: null, stateId: 31, city: 'Chennai', address: 'Anna Nagar',
      pincode: 600001, websiteUrl: 'https://example.com', gstNumber: null, gstCode: null, panNumber: null,
      fssaiNumber: null, upiId: 'shop@upi', tradeLicenseNumber: null,
    }
    const form = new FormData()
    form.set('data', JSON.stringify(data))
    form.set('logo', new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0])], { type: 'image/png' }), 'logo.png')
    const response = await fetch(`${base}/updateProfile`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
    assert.equal(response.status, 200)
    assert.equal(store.receivedProfile?.businessName, 'Updated Store')
    assert.equal(store.receivedLogo, 'uploads/business_logos/new.png')
    assert.deepEqual(logos.removed, ['uploads/business_logos/old.png'])
    const stillValid = await fetch(`${base}/getBillFormatId`, { headers: { Authorization: `Bearer ${token}` } })
    assert.equal(stillValid.status, 200)
  }, logos)
})

test('profile update rejects malformed data and removes a new logo when persistence is rejected', async () => {
  const store = new MemoryAccountStore()
  const logos = new MemoryLogoStorage()
  store.profileResult = { status: 'email_duplicate' }
  await withApi(store, async (base, token) => {
    const invalid = new FormData()
    invalid.set('data', '{')
    const malformed = await fetch(`${base}/updateProfile`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: invalid })
    assert.equal(malformed.status, 400)

    const duplicate = new FormData()
    duplicate.set('data', JSON.stringify({
      mobile: '9876543210', email: 'duplicate@example.com', businessName: 'Store', businessTypeId: 2,
      contactPerson: 'Praveen', stateId: 31, city: 'Chennai', address: 'Anna Nagar', pincode: 600001,
    }))
    duplicate.set('logo', new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' }), 'logo.png')
    const response = await fetch(`${base}/updateProfile`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: duplicate })
    assert.equal(response.status, 400)
    assert.deepEqual(logos.removed, ['uploads/business_logos/new.png'])
  }, logos)
})
