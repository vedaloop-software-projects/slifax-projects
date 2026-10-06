import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { test } from 'node:test'
import { createApp } from '../app.ts'
import { loadConfig } from '../../../models/system/config.ts'

test('HTTP foundation: liveness, missing routes, malformed and oversized bodies', async () => {
  const server = createServer(createApp())
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const base = `http://127.0.0.1:${address.port}`
  try {
    for (const path of ['/up', '/api/health']) {
      const response = await fetch(base + path)
      assert.equal(response.status, 200)
      assert.equal(response.headers.get('x-powered-by'), null)
      assert.match(response.headers.get('x-request-id') ?? '', /^[0-9a-f-]{36}$/)
      assert.deepEqual(await response.json(), { success: true, message: 'ZenxPOS API is running.', data: { status: 'ok' } })
    }
    const missing = await fetch(base + '/api/login', { method: 'POST' })
    assert.equal(missing.status, 404, 'Unmigrated endpoints must not appear implemented')
    assert.deepEqual(await missing.json(), { errors: 'Route not found.' })
    const malformed = await fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })
    assert.equal(malformed.status, 400)
    assert.deepEqual(await malformed.json(), { errors: 'Invalid JSON body.' })
    const oversized = await fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'x'.repeat(1024 * 1024) }) })
    assert.equal(oversized.status, 413)
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})

test('configuration rejects invalid ports and defaults to a local development listener', () => {
  assert.deepEqual(loadConfig({}), { host: '127.0.0.1', port: 5100 })
  assert.deepEqual(loadConfig({ HOST: '0.0.0.0', PORT: '8080' }), { host: '0.0.0.0', port: 8080 })
  for (const port of ['', '0', '-1', '65536', '1.5', 'abc']) {
    assert.throws(() => loadConfig({ PORT: port }), /PORT must/)
  }
})

test('readiness distinguishes missing, healthy and failed databases without leaking errors', async () => {
  const cases = [
    { database: undefined, status: 503, body: { errors: 'Database is not configured.' } },
    { database: { check: async () => {} }, status: 200, body: { success: true, message: 'Database is ready.', data: { status: 'ok' } } },
    { database: { check: async () => { throw new Error('mysql://secret-user:secret-password@private-host') } }, status: 503, body: { errors: 'Database is unavailable.' } },
  ]
  for (const scenario of cases) {
    const server = createServer(createApp(scenario.database))
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/ready`)
      assert.equal(response.status, scenario.status)
      assert.deepEqual(await response.json(), scenario.body)
      const alive = await fetch(`http://127.0.0.1:${address.port}/up`)
      assert.equal(alive.status, 200)
    } finally {
      server.closeAllConnections()
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    }
  }
})
