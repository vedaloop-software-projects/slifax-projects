import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { test } from 'node:test'
import type { RegistrationInput, RegistrationStore } from '../../../models/platform/contracts.ts'
import { createApp } from '../../system/app.ts'
import { createRegistrationRouter } from '../router.ts'

class MemoryRegistrations implements RegistrationStore {
  saved: RegistrationInput[] = []
  async create(input: RegistrationInput) { if (this.saved.some(row => row.mobile === input.mobile)) return 'duplicate' as const; this.saved.push(input); return 'saved' as const }
  async list() { return { rows: [], total: 0 } }
  async review() { return true }
  async businessTypes() { return [{ id: 2n, name: 'Retail' }] }
}

test('public registration validates, rejects duplicates and throttles by IP', async () => {
  const store = new MemoryRegistrations(), server = createServer(createApp(undefined, createRegistrationRouter(store, 3)))
  server.listen(0); await once(server, 'listening')
  const { port } = server.address() as { port: number }, base = `http://127.0.0.1:${port}/api`
  const post = (body: unknown) => fetch(`${base}/registerBusiness`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  try {
    const valid = { businessName: 'Sri Stores', contactPersonName: 'Lakshmi', mobile: '9876543210', email: 'Owner@Example.com', businessTypeId: '2', city: 'Madurai' }
    assert.deepEqual(await (await fetch(`${base}/registrationBusinessTypes`)).json(), { success: true, message: 'Business types fetched successfully.', data: [{ id: 2, name: 'Retail' }] })
    assert.equal((await post({ ...valid, mobile: '12345' })).status, 422)
    assert.equal((await post(valid)).status, 201)
    assert.equal(store.saved[0]?.email, 'owner@example.com'); assert.equal(store.saved[0]?.businessTypeId, 2n)
    assert.equal((await post(valid)).status, 409)
    assert.equal((await post(valid)).status, 429)
  } finally { server.close() }
})
