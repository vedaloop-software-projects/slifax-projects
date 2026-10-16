import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { test } from 'node:test'
import { createApp } from '../app.ts'
import { loadConfig } from '../../../models/system/config.ts'
import { resolve } from 'node:path'
import { normalizeLegacyInput } from '../../../middlewares/http/legacy-input.ts'
import { cors } from '../../../middlewares/http/cors.ts'

test('legacy JSON input keeps text identifiers while normalizing Laravel-style numeric values', () => {
  assert.deepEqual(normalizeLegacyInput({
    mobile: '9876543210', hsnCode: '001234', productCode: '123', categoryId: '7',
    status: '1', amount: '12.50', page: '', products: [{ variantId: '8', qty: '2.25', mrp: '25', allowRefund: '0', remarks: '' }],
  }), {
    mobile: '9876543210', hsnCode: '001234', productCode: '123', categoryId: 7,
    status: 1, amount: 12.5, page: null, products: [{ variantId: 8, qty: 2.25, mrp: 25, allowRefund: 0, remarks: null }],
  })
  assert.deepEqual(normalizeLegacyInput({ status: 'active', amount: '12x' }), { status: 'active', amount: '12x' })
  assert.deepEqual(normalizeLegacyInput({ transferInNumber: '12', transferOutNumber: '13', discountAmount: '4.50' }), {
    transferInNumber: 12, transferOutNumber: 13, discountAmount: 4.5,
  })
  assert.deepEqual(normalizeLegacyInput({ mobile: 9876543210, mobileEmail: 9876543210, hsnCode: 1234, searchStr: 8901234567890, upiId: '9876543210' }), {
    mobile: '9876543210', mobileEmail: '9876543210', hsnCode: '1234', searchStr: '8901234567890', upiId: '9876543210',
  })
  assert.deepEqual(normalizeLegacyInput({ mobile: 98765.5, amount: 12 }), { mobile: 98765.5, amount: 12 })
})
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

test('CORS permits configured barcode origins and rejects other preflights', async () => {
  const express = (await import('express')).default
  const app = express()
  app.use(cors('https://barcode.zenxpos.com'))
  app.post('/api/login', (_request, response) => { response.json({ success: true }) })
  const server = createServer(app)
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const address = server.address(); assert.ok(address && typeof address !== 'string')
  const url = `http://127.0.0.1:${address.port}/api/login`
  try {
    const allowed = await fetch(url, { method: 'OPTIONS', headers: { Origin: 'https://barcode.zenxpos.com', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } })
    assert.equal(allowed.status, 204)
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://barcode.zenxpos.com')
    assert.match(allowed.headers.get('access-control-allow-headers') ?? '', /Content-Type/)
    const denied = await fetch(url, { method: 'OPTIONS', headers: { Origin: 'https://attacker.example', 'Access-Control-Request-Method': 'POST' } })
    assert.equal(denied.status, 403)
    assert.equal(denied.headers.get('access-control-allow-origin'), null)
  } finally {
    server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
  assert.throws(() => cors('http://barcode.zenxpos.com'), /HTTPS origins/)
})

test('readiness distinguishes missing, healthy and failed databases without leaking errors', async () => {
  const cases = [
    { database: undefined, status: 503, body: { errors: 'Database is not configured.' } },
    { database: { check: async () => {} }, status: 200, body: { success: true, message: 'Database is ready.', data: { status: 'ok' } } },
    { database: { check: async () => { throw new Error('mysql://secret-user:secret-password@private-host') } }, status: 503, body: { errors: 'Database is unavailable.' } },
    { database: { check: async () => { throw Object.assign(new Error('missing table'), { name: 'PrismaClientKnownRequestError', code: 'P2021' }) } }, status: 503, body: { errors: 'Database schema is out of date.' } },
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

test('database request failures return a safe actionable 503 response', async () => {
  const router = (await import('express')).default.Router()
  router.get('/database-failure', () => { const error=Object.assign(new Error('mysql://secret@private-host'),{name:'PrismaClientKnownRequestError',code:'P2021'});throw error })
  const server=createServer(createApp(undefined,router));server.listen(0,'127.0.0.1');await once(server,'listening')
  const address=server.address();assert.ok(address&&typeof address!=='string')
  try { const response=await fetch(`http://127.0.0.1:${address.port}/api/database-failure`);assert.equal(response.status,503);assert.deepEqual(await response.json(),{errors:'Database schema is out of date.'}) }
  finally { server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close((error)=>error?reject(error):resolve())) }
})

test('Prisma query validation bugs are logged as programming failures instead of false database outages', async () => {
  const router = (await import('express')).default.Router()
  router.get('/query-bug', () => { throw Object.assign(new Error('Unknown argument min_amount.'), { name: 'PrismaClientValidationError' }) })
  const server=createServer(createApp(undefined,router));server.listen(0,'127.0.0.1');await once(server,'listening')
  const address=server.address();assert.ok(address&&typeof address!=='string')
  try { const response=await fetch(`http://127.0.0.1:${address.port}/api/query-bug`);assert.equal(response.status,500);assert.deepEqual(await response.json(),{errors:'Internal Server Error.'}) }
  finally { server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close((error)=>error?reject(error):resolve())) }
})

test('public assets are served while PHP diagnostics and dotfiles stay unreachable', async () => {
  const server = createServer(createApp(undefined, undefined, resolve('public')))
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const address = server.address(); assert.ok(address && typeof address !== 'string')
  const base = `http://127.0.0.1:${address.port}`
  try {
    const home = await fetch(base + '/'); assert.equal(home.status, 200); assert.match(await home.text(), /html/i)
    const css = await fetch(base + '/css/style.css'); assert.equal(css.status, 200); assert.match(css.headers.get('content-type') ?? '', /text\/css/)
    for (const path of ['/info.php', '/index.php', '/.htaccess']) assert.equal((await fetch(base + path)).status, 404)
  } finally {
    server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})
