import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { compare } from 'bcryptjs'
import type { ResetChallenge, ResetStore, ResetUser, StoredChallenge, OtpDelivery } from '../../../models/reset/contracts.ts'
import type { ResetConfig } from '../../../models/reset/config.ts'
import { createApp } from '../../system/app.ts'
import { createResetRouter } from '../router.ts'
import { ResetService } from '../service.ts'

class MemoryResetStore implements ResetStore {
  user: ResetUser | null = { id: 3n, clientId: 7n, name: 'Praveen', mobile: '9876543210' }
  records = new Map<string, string>()
  passwordHash?: string
  audits = 0
  async findActiveUser(mobile: string) { return this.user?.mobile === mobile ? this.user : null }
  async putChallenge(key: string, challenge: ResetChallenge) { this.records.set(key, JSON.stringify(challenge)) }
  async getChallenge(key: string): Promise<StoredChallenge | null> {
    const value = this.records.get(key)
    return value ? { value, challenge: JSON.parse(value) as ResetChallenge } : null
  }
  async compareAndSetChallenge(key: string, expected: string, challenge: ResetChallenge) {
    if (this.records.get(key) !== expected) return false
    this.records.set(key, JSON.stringify(challenge)); return true
  }
  async deleteChallenge(key: string) { this.records.delete(key) }
  async consumeReset(key: string, expected: string, user: ResetUser, passwordHash: string) {
    if (this.records.get(key) !== expected || user.id !== this.user?.id) return false
    this.records.delete(key); this.passwordHash = passwordHash; this.audits++; return true
  }
}

class MemoryDelivery implements OtpDelivery {
  readonly available = true
  sent: { mobile: string; otp: string; minutes: number }[] = []
  async sendPasswordResetOtp(mobile: string, otp: string, minutes: number) { this.sent.push({ mobile, otp, minutes }) }
}

const config: ResetConfig = {
  secret: new TextEncoder().encode('reset-test-secret-with-more-than-32-bytes'), otpLifetimeMinutes: 10,
  resetLifetimeMinutes: 10, resendCooldownSeconds: 60, maxAttempts: 5,
}

async function withApi(store: MemoryResetStore, delivery: OtpDelivery, action: (base: string) => Promise<void>) {
  let now = new Date('2026-10-06T06:00:00Z')
  const service = new ResetService(store, delivery, config, () => now)
  const server = createServer(createApp(undefined, createResetRouter(service)))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  try { await action(`http://127.0.0.1:${address.port}/api`) } finally {
    now = new Date(now.getTime() + 1)
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
}

async function post(base: string, path: string, body: unknown) {
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return { response, body: await response.json() as any }
}

test('secure reset lifecycle hides OTP, returns one-time reset token, hashes password and audits', async () => {
  const store = new MemoryResetStore()
  const delivery = new MemoryDelivery()
  await withApi(store, delivery, async (base) => {
    const forgot = await post(base, '/forgotPassword', { mobile: '9876543210' })
    assert.equal(forgot.response.status, 200)
    assert.deepEqual(forgot.body, { success: true, message: 'If the account exists, an OTP has been sent.', data: null })
    assert.match(delivery.sent[0].otp, /^\d{6}$/)
    assert.equal(JSON.stringify([...store.records.values()]).includes(delivery.sent[0].otp), false)

    const verified = await post(base, '/verifyOtp', { mobile: '9876543210', otp: delivery.sent[0].otp })
    assert.equal(verified.response.status, 200)
    assert.match(verified.body.data.resetToken, /^[A-Za-z0-9_-]{40,}$/)

    const reset = await post(base, '/resetPassword', {
      mobile: '9876543210', resetToken: verified.body.data.resetToken,
      newPassword: 'Changed2@', confirmPassword: 'Changed2@',
    })
    assert.equal(reset.response.status, 200)
    assert.equal(store.audits, 1)
    assert.ok(store.passwordHash && await compare('Changed2@', store.passwordHash))
    assert.equal(store.records.size, 0)

    const reused = await post(base, '/resetPassword', {
      mobile: '9876543210', resetToken: verified.body.data.resetToken,
      newPassword: 'Another3@', confirmPassword: 'Another3@',
    })
    assert.equal(reused.response.status, 400)
  })
})

test('forgot response does not reveal whether a mobile exists and enforces resend cooldown', async () => {
  const existingStore = new MemoryResetStore()
  const existingDelivery = new MemoryDelivery()
  await withApi(existingStore, existingDelivery, async (base) => {
    const first = await post(base, '/forgotPassword', { mobile: '9876543210' })
    const second = await post(base, '/forgotPassword', { mobile: '9876543210' })
    assert.equal(first.response.status, 200)
    assert.equal(second.response.status, 429)
  })
  const missingStore = new MemoryResetStore()
  missingStore.user = null
  const missingDelivery = new MemoryDelivery()
  await withApi(missingStore, missingDelivery, async (base) => {
    const first = await post(base, '/forgotPassword', { mobile: '9123456789' })
    const second = await post(base, '/forgotPassword', { mobile: '9123456789' })
    assert.equal(first.response.status, 200)
    assert.equal(first.body.message, 'If the account exists, an OTP has been sent.')
    assert.equal(second.response.status, 429)
    assert.equal(missingDelivery.sent.length, 0)
  })
})

test('OTP expires after bounded attempts and no reset token is issued', async () => {
  const store = new MemoryResetStore()
  const delivery = new MemoryDelivery()
  await withApi(store, delivery, async (base) => {
    await post(base, '/forgotPassword', { mobile: '9876543210' })
    for (let attempt = 1; attempt <= 5; attempt++) {
      const result = await post(base, '/verifyOtp', { mobile: '9876543210', otp: '111111' })
      assert.equal(result.response.status, 400)
      assert.equal(result.body.errors, 'OTP is invalid or expired.')
    }
    assert.equal(store.records.size, 0)
  })
})

test('reset routes reject unavailable delivery, malformed inputs and unverified tokens', async () => {
  const unavailable: OtpDelivery = { available: false, async sendPasswordResetOtp() {} }
  await withApi(new MemoryResetStore(), unavailable, async (base) => {
    assert.equal((await post(base, '/forgotPassword', { mobile: '9876543210' })).response.status, 503)
    assert.equal((await post(base, '/verifyOtp', { mobile: 'bad', otp: '123456' })).response.status, 422)
    assert.equal((await post(base, '/verifyOtp', { mobile: '9876543210', otp: '0123' })).response.status, 400)
    assert.equal((await post(base, '/resetPassword', { mobile: '9876543210', resetToken: 'x'.repeat(32), newPassword: 'Changed2@', confirmPassword: 'Changed2@' })).response.status, 400)
  })
})
