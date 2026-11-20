import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { hash } from 'bcryptjs'
import { SignJWT } from 'jose'
import type { Account, AuthStore, PermissionRow, Profile } from '../../../models/auth/contracts.ts'
import type { AuthConfig } from '../../../models/auth/config.ts'
import { createAuthRouter } from '../router.ts'
import { AuthService } from '../service.ts'
import { createApp } from '../../system/app.ts'

const secret = new TextEncoder().encode('test-only-secret-with-more-than-32-bytes')
const config: AuthConfig = {
  jwtSecret: secret, jwtIssuer: 'test-issuer', jwtAudience: 'test-client', jwtLifetime: '1h', publicBaseUrl: '',
}

class MemoryStore implements AuthStore {
  account: Account
  permissions: PermissionRow[] = [{
    featureId: 10n, feature: 'Products', featurePriority: 2, subFeatureId: 11n,
    subFeature: 'Products list', subFeaturePriority: 1, view: 1, add: 1, edit: 0,
  }]
  audits: string[] = []
  profile: Profile = { id: 7, businessName: 'Demo Store' }

  constructor(passwordHash: string) {
    this.account = {
      user: { id: 3n, clientId: 7n, name: 'Praveen', mobile: '9876543210', email: 'p@example.com', passwordHash, roleId: 4, updatedAt: null },
      client: { id: 7n, businessTypeId: 2, businessName: 'Demo Store', logo: null, address: 'Chennai', city: 'Chennai', startDate: new Date('2025-01-01'), endDate: new Date('2030-12-31') },
      businessType: 'Retail', roleTitle: 'Admin',
    }
  }
  async findAccountByLogin(login: string) { return ['p@example.com', '9876543210'].includes(login) ? this.account : null }
  async findAccountByIdentity(userId: bigint, clientId: bigint) {
    return userId === this.account.user.id && clientId === this.account.user.clientId ? this.account : null
  }
  async listPermissions(clientId: bigint, roleId: number) {
    return clientId === this.account.user.clientId && roleId === this.account.user.roleId ? this.permissions : []
  }
  async getProfile(clientId: bigint) { return clientId === this.account.client.id ? this.profile : null }
  async recordAudit(_account: Account, type: string) { this.audits.push(type) }
  async setTimeZone(_clientId: bigint, timeZone: string) { this.account.client.timeZone = timeZone }
  async changePassword(_account: Account, expectedHash: string, passwordHash: string) {
    if (this.account.user.passwordHash !== expectedHash) throw new Error('PASSWORD_UPDATE_CONFLICT')
    const changedAt = new Date('2026-10-05T12:00:00.000Z')
    this.account.user.passwordHash = passwordHash
    this.account.user.updatedAt = changedAt
    this.audits.push('password_change')
    return changedAt
  }
}

async function withApi(store: MemoryStore, action: (base: string) => Promise<void>) {
  const service = new AuthService(store, config, () => new Date('2026-10-05T06:00:00.000Z'))
  const server = createServer(createApp(undefined, createAuthRouter(service)))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  try { await action(`http://127.0.0.1:${address.port}/api`) } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
}

async function json(response: Response) { return response.json() as Promise<Record<string, any>> }

test('auth routes preserve login/profile/permission contracts and accept Laravel bcrypt hashes', async () => {
  const laravelHash = (await hash('Valid1!', 4)).replace('$2b$', '$2y$')
  const store = new MemoryStore(laravelHash)
  await withApi(store, async (base) => {
    const login = await fetch(`${base}/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileEmail: 'p@example.com', password: 'Valid1!' }),
    })
    assert.equal(login.status, 200)
    const loginBody = await json(login)
    assert.equal(loginBody.data.user.businessName, 'Demo Store')
    assert.equal(loginBody.data.user.permissions[0].subFeatures[0].view, 1)
    assert.equal(store.audits[0], 'login')
    const authorization = { Authorization: `Bearer ${loginBody.data.user.token}` }

    const profile = await fetch(`${base}/getProfile`, { headers: authorization })
    assert.equal(profile.status, 200)
    // Authenticated responses carry the server clock and the store's zone for the app.
    assert.deepEqual([profile.headers.get('x-server-time'), profile.headers.get('x-time-zone')], ['2026-10-05T06:00:00.000Z', 'Asia/Kolkata'])
    assert.deepEqual((await json(profile)).data, store.profile)

    const permission = await fetch(`${base}/getPermission`, { headers: authorization })
    const permissionBody = await json(permission)
    assert.equal(permission.status, 200)
    assert.equal(permissionBody.data.user.permissions[0].featurePriority, 2)
    assert.equal(permissionBody.data.user.permissions[0].subFeatures[0].subfeaturePriority, 1)
  })
})

test('auth rejects ambiguous login failures, invalid content, missing tokens, and cross-client claims', async () => {
  const store = new MemoryStore(await hash('Valid1!', 4))
  await withApi(store, async (base) => {
    for (const input of [
      { mobileEmail: 'missing@example.com', password: 'Valid1!' },
      { mobileEmail: 'p@example.com', password: 'wrong' },
    ]) {
      const response = await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
      assert.equal(response.status, 422)
      assert.equal((await json(response)).errors, 'Invalid email/mobile or password.')
    }
    const noContentType = await fetch(`${base}/login`, { method: 'POST', body: '{}' })
    assert.equal(noContentType.status, 400)
    const noToken = await fetch(`${base}/getProfile`)
    assert.equal(noToken.status, 401)

    const wrongTenantToken = await new SignJWT({ cid: '8', pv: 'invalid' }).setProtectedHeader({ alg: 'HS256' })
      .setSubject('3').setIssuer(config.jwtIssuer).setAudience(config.jwtAudience).setExpirationTime('1h').sign(secret)
    const wrongTenant = await fetch(`${base}/getProfile`, { headers: { Authorization: `Bearer ${wrongTenantToken}` } })
    assert.equal(wrongTenant.status, 401)
  })
})

test('password change is audited and immediately revokes the old token', async () => {
  const store = new MemoryStore(await hash('Valid1!', 4))
  await withApi(store, async (base) => {
    const login = await fetch(`${base}/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileEmail: '9876543210', password: 'Valid1!' }),
    })
    const token = (await json(login)).data.user.token
    const changed = await fetch(`${base}/changePassword`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: 'Valid1!', newPassword: 'NewValid2@', confirmPassword: 'NewValid2@' }),
    })
    assert.equal(changed.status, 200)
    assert.deepEqual(store.audits, ['login', 'password_change'])
    const revoked = await fetch(`${base}/getProfile`, { headers: { Authorization: `Bearer ${token}` } })
    assert.equal(revoked.status, 401)
  })
})

test('expired contracts receive renewal-only access while missing permissions deny login', async () => {
  const store = new MemoryStore(await hash('Valid1!', 4))
  store.account.client.endDate = new Date('2026-10-04')
  const service = new AuthService(store, config, () => new Date('2026-10-05'))
  const login = await service.login({ mobileEmail: 'p@example.com', password: 'Valid1!' })
  assert.equal(login.user.renewalRequired, true)
  await assert.rejects(() => service.authenticate(`Bearer ${login.user.token}`), /contract expired/)
  assert.equal((await service.authenticateForRenewal(`Bearer ${login.user.token}`)).client.id, 7n)
  store.account.client.endDate = new Date('2030-01-01')
  store.permissions = []
  await assert.rejects(() => new AuthService(store, config).login({ mobileEmail: 'p@example.com', password: 'Valid1!' }), /No menu access/)
})

class MemorySessions {
  rows: Array<{ sessionId: string; userId: bigint; deviceId: string; deviceName: string | null; location: string | null; revoked: boolean; reason?: string }> = []
  alerts: Array<{ id: bigint; userId: bigint; deviceName: string | null; location: string | null; seen: boolean }> = []
  limit?: number
  async open(_clientId: bigint, userId: bigint, sessionId: string, device: any, _expiresAt: Date, defaultLimit: number, takeOver = false) {
    const limit = this.limit ?? defaultLimit
    // Newest first, like last_seen_at desc.
    const active = this.rows.filter(row => row.userId === userId && !row.revoked).reverse()
    const others = active.filter(row => row.deviceId !== device.deviceId)
    const excess = [...new Set(others.map(row => row.deviceId))].slice(limit - 1)
    const signedOut = excess.map(id => others.find(row => row.deviceId === id)!).map(row => ({ sessionId: row.sessionId, deviceId: row.deviceId, deviceName: row.deviceName, platform: 'android', location: row.location, lastSeenAt: new Date(), createdAt: new Date() }))
    if (signedOut.length && !takeOver) return { opened: false as const, limit, blockedBy: signedOut[0]! }
    for (const row of others) if (excess.includes(row.deviceId)) { row.revoked = true; row.reason = 'signed_in_elsewhere' }
    for (const row of active) if (row.deviceId === device.deviceId) { row.revoked = true; row.reason = 'replaced' }
    const newDevice = !this.rows.some(row => row.deviceId === device.deviceId)
    this.rows.push({ sessionId, userId, deviceId: device.deviceId, deviceName: device.deviceName, location: device.location, revoked: false })
    return { opened: true as const, newDevice, signedOut }
  }
  async isActive(sessionId: string) { return this.rows.some(row => row.sessionId === sessionId && !row.revoked) }
  async endedReason(sessionId: string) { return this.rows.find(row => row.sessionId === sessionId)?.reason ?? null }
  async revoke(sessionId: string) { for (const row of this.rows) if (row.sessionId === sessionId) row.revoked = true }
  async revokeClient() { return 0 }
  async listActive() { return [] }
  async recordAlert(_clientId: bigint, userId: bigint, device: any) { this.alerts.push({ id: BigInt(this.alerts.length + 1), userId, deviceName: device.deviceName, location: device.location, seen: false }) }
  async pendingAlerts(userId: bigint) { return this.alerts.filter(alert => alert.userId === userId && !alert.seen).slice(-1).map(alert => ({ id: alert.id, deviceName: alert.deviceName, platform: 'android', location: alert.location, attemptedAt: new Date() })) }
  async respondAlert(userId: bigint, alertId: bigint) { const alert = this.alerts.find(row => row.id === alertId && row.userId === userId); if (!alert || alert.seen) return false; for (const row of this.alerts) if (row.userId === userId && row.id <= alertId) row.seen = true; return true }
}

test('single-device login blocks a second device, alerts the first, and frees the slot on logout', async () => {
  const store = new MemoryStore(await hash('Secret@123', 4)), sessions = new MemorySessions()
  const locator = { locate: async (ip: string | null) => ip === '49.0.0.1' ? 'Chennai, Tamil Nadu, IN' : 'Mumbai, Maharashtra, IN' }
  const service = new AuthService(store, config, () => new Date('2026-10-27T06:00:00Z'), { sessions, locator, settings: { renewalGraceDays: async () => 7, maxDevicesPerUser: async () => 1, list: async () => ({}), update: async () => {} } })
  const credentials = { mobileEmail: 'p@example.com', password: 'Secret@123' }
  const first = await service.login({ ...credentials, deviceId: 'phone-a', deviceName: 'Samsung SM-A515F', platform: 'android' }, { ip: '49.0.0.1' })
  const firstAccount = await service.authenticate(`Bearer ${first.user.token}`)
  await assert.rejects(() => service.login({ ...credentials, deviceId: 'phone-b', deviceName: 'Redmi Note 12', platform: 'android' }, { ip: '49.0.0.2' }), (error: any) =>
    error.status === 409 && /Samsung SM-A515F \(Chennai, Tamil Nadu, IN\)/.test(error.message) && error.details.activeDevice.location === 'Chennai, Tamil Nadu, IN')
  // Retrying on the second device must not queue up a second prompt.
  await assert.rejects(() => service.login({ ...credentials, deviceId: 'phone-b', deviceName: 'Redmi Note 12', platform: 'android' }, { ip: '49.0.0.2' }), (error: any) => error.status === 409)
  const { alerts } = await service.loginAlerts(firstAccount)
  assert.deepEqual(alerts.map(alert => [alert.deviceName, alert.location]), [['Redmi Note 12', 'Mumbai, Maharashtra, IN']])
  await service.respondLoginAlert(firstAccount, { alertId: alerts[0]!.id, response: 'dismissed' })
  assert.equal((await service.loginAlerts(firstAccount)).alerts.length, 0)
  await assert.rejects(() => service.respondLoginAlert(firstAccount, { alertId: alerts[0]!.id, response: 'snooze' }), (error: any) => error.status === 422)
  // Same device may log in again; it replaces its own previous session.
  const again = await service.login({ ...credentials, deviceId: 'phone-a', deviceName: 'Samsung SM-A515F', platform: 'android' }, { ip: '49.0.0.1' })
  await assert.rejects(() => service.authenticate(`Bearer ${first.user.token}`), (error: any) => error.status === 401 && error.details.code === 'SESSION_ENDED')
  await service.logout(await service.authenticate(`Bearer ${again.user.token}`))
  await service.login({ ...credentials, deviceId: 'phone-b', deviceName: 'Redmi Note 12', platform: 'android' }, { ip: '49.0.0.2' })
  // A per-client limit of two lets a second device in.
  sessions.limit = 2
  await service.login({ ...credentials, deviceId: 'tablet-c', deviceName: 'Galaxy Tab', platform: 'android' }, { ip: '49.0.0.2' })
})

test('"Sign out on <device>" signs the unavailable device out once the password matches', async () => {
  const store = new MemoryStore(await hash('Secret@123', 4)), sessions = new MemorySessions()
  const service = new AuthService(store, config, () => new Date('2026-10-27T06:00:00Z'), { sessions, locator: { locate: async () => 'Chennai, Tamil Nadu, IN' }, settings: { renewalGraceDays: async () => 7, maxDevicesPerUser: async () => 1, list: async () => ({}), update: async () => {} } })
  const credentials = { mobileEmail: 'p@example.com', password: 'Secret@123' }
  const unavailable = await service.login({ ...credentials, deviceId: 'phone-a', deviceName: 'Samsung SM-A515F', platform: 'android' })
  // The blocked login tells the app it may offer the button.
  await assert.rejects(() => service.login({ ...credentials, deviceId: 'phone-b', deviceName: 'Redmi Note 12', platform: 'android' }), (error: any) =>
    error.status === 409 && error.details.canSignOutOtherDevice === true && error.details.activeDevice.deviceName === 'Samsung SM-A515F')
  // A wrong password never signs anyone out.
  await assert.rejects(() => service.login({ ...credentials, password: 'Wrong@123', deviceId: 'phone-b', signOutOtherDevice: true }), (error: any) => error.status === 422)
  await service.authenticate(`Bearer ${unavailable.user.token}`)
  const here = await service.login({ ...credentials, deviceId: 'phone-b', deviceName: 'Redmi Note 12', platform: 'android', signOutOtherDevice: true })
  await service.authenticate(`Bearer ${here.user.token}`)
  await assert.rejects(() => service.authenticate(`Bearer ${unavailable.user.token}`), (error: any) =>
    error.status === 401 && error.details.code === 'SESSION_ENDED' && error.details.reason === 'signed_in_elsewhere' && /signed in on another device/.test(error.message))
  assert.deepEqual(store.audits.slice(-2), ['login_takeover', 'login'])
  // With a limit of two, only the least recently active device makes room.
  sessions.limit = 2
  await service.login({ ...credentials, deviceId: 'tablet-c', deviceName: 'Galaxy Tab', platform: 'android' })
  await assert.rejects(() => service.login({ ...credentials, deviceId: 'till-d', deviceName: 'Till', platform: 'android' }), (error: any) => error.details.activeDevice.deviceName === 'Redmi Note 12')
  await service.login({ ...credentials, deviceId: 'till-d', deviceName: 'Till', platform: 'android', signOutOtherDevice: true })
  assert.deepEqual(sessions.rows.filter(row => !row.revoked).map(row => row.deviceId), ['tablet-c', 'till-d'])
})

test('expired contracts keep full access for the configured grace period, then become renewal only', async () => {
  const store = new MemoryStore(await hash('Secret@123', 4))
  store.account.client.endDate = new Date('2026-10-20')
  const settings = { renewalGraceDays: async () => 7, maxDevicesPerUser: async () => 1, list: async () => ({}), update: async () => {} }
  const inGrace = new AuthService(store, config, () => new Date('2026-10-27T06:00:00Z'), { settings })
  const login = await inGrace.login({ mobileEmail: 'p@example.com', password: 'Secret@123' })
  assert.equal(login.user.renewalRequired, false)
  assert.deepEqual(login.user.contract, { endDate: '2026-10-20', inGrace: true, graceEndsOn: '2026-10-27', graceDaysLeft: 0, daysLeft: -7 })
  await inGrace.authenticate(`Bearer ${login.user.token}`)
  const after = new AuthService(store, config, () => new Date('2026-10-28T06:00:00Z'), { settings })
  assert.equal((await after.login({ mobileEmail: 'p@example.com', password: 'Secret@123' })).user.renewalRequired, true)
  await assert.rejects(() => after.authenticate(`Bearer ${login.user.token}`), (error: any) => error.status === 422 && error.details.code === 'CONTRACT_EXPIRED')
})

test('the store timezone is detected once and no later device can change it', async () => {
  const store = new MemoryStore(await hash('Secret@123', 4)), sessions = new MemorySessions()
  const locator = { locate: async () => null, timeZone: async () => 'Asia/Dubai' }
  const settings = { renewalGraceDays: async () => 0, maxDevicesPerUser: async () => 5, list: async () => ({}), update: async () => {} }
  const service = new AuthService(store, config, () => new Date('2026-10-28T20:00:00Z'), { sessions, locator, settings })
  const credentials = { mobileEmail: 'p@example.com', password: 'Secret@123' }
  // The first login takes the zone from the IP lookup, not the device's setting.
  await service.login({ ...credentials, deviceId: 'till-1', timeZone: 'Europe/London' })
  assert.equal(store.account.client.timeZone, 'Asia/Dubai')
  // Later logins never change it.
  await service.login({ ...credentials, deviceId: 'till-1', timeZone: 'Europe/London' })
  assert.equal(store.account.client.timeZone, 'Asia/Dubai')
  // A new device set to another zone (an emulator defaulting to US Pacific) keeps it too.
  await service.login({ ...credentials, deviceId: 'emulator', timeZone: 'America/Los_Angeles' })
  assert.equal(store.account.client.timeZone, 'Asia/Dubai')
})

test('a device timezone is never used, even for a store without a zone', async () => {
  const store = new MemoryStore(await hash('Secret@123', 4)), sessions = new MemorySessions()
  const locator = { locate: async () => null, timeZone: async () => null }
  const settings = { renewalGraceDays: async () => 0, maxDevicesPerUser: async () => 5, list: async () => ({}), update: async () => {} }
  const service = new AuthService(store, config, () => new Date('2026-10-28T20:00:00Z'), { sessions, locator, settings })
  const login = await service.login({ mobileEmail: 'p@example.com', password: 'Secret@123', deviceId: 'emulator', timeZone: 'America/Los_Angeles' })
  assert.equal(store.account.client.timeZone ?? null, null)
  // No IP result either: the store runs on the default zone. 20:00 UTC is already the 29th in India.
  assert.deepEqual([login.user.timeZone, login.user.serverTime, login.user.businessDate], ['Asia/Kolkata', '2026-10-28T20:00:00.000Z', '29-10-2026'])
})

test('contract days are counted on the store calendar from the server clock', async () => {
  const store = new MemoryStore(await hash('Secret@123', 4))
  store.account.client.endDate = new Date('2026-10-28')
  // 20:00 UTC on 28 Oct: still the 28th in New York, already the 29th in India.
  const service = new AuthService(store, config, () => new Date('2026-10-28T20:00:00Z'))
  store.account.client.timeZone = 'America/New_York'
  assert.deepEqual((await service.login({ mobileEmail: 'p@example.com', password: 'Secret@123' })).user.contract, { endDate: '2026-10-28', inGrace: false, graceEndsOn: '2026-10-28', graceDaysLeft: 0, daysLeft: 0 })
  store.account.client.timeZone = 'Asia/Kolkata'
  const login = await service.login({ mobileEmail: 'p@example.com', password: 'Secret@123' })
  assert.equal(login.user.renewalRequired, true)
  assert.equal(login.user.contract.daysLeft, -1)
})
