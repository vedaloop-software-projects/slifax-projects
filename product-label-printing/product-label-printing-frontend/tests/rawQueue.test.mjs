import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

// Production bundler resolves extensionless TS imports; mirror only that lookup.
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    try { return next(specifier + '.ts', context) } catch { /* original resolver reports errors */ }
  }
  return next(specifier, context)
} })

test('queue submits real PRN and never records spool acceptance as physically printed', async () => {
  const memory = new Map()
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const originalFetch = globalThis.fetch
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k) => memory.get(k), setItem: (k, v) => memory.set(k, v) } })
  try {
    const { getDb, setDb } = await import('../src/mock/db.ts')
    const { printing } = await import('../src/api/index.ts')
    const { saveAgentSettings } = await import('../src/print/localAgent.ts')
    const db = getDb()
    const printer = { id: 'test-printer', name: 'TVS queue', manufacturer: 'TVS', model: 'LP46', language: 'TSPL', connectionType: 'USB', address: 'USB001', dpi: 203, templateId: db.templates[0].id, status: 'CONNECTED', lastSeenAt: '', shopId: db.shops[0].id }
    const product = db.products.find((p) => p.status === 'ACTIVE')
    // A regular USER (prints only) signed in through the backend.
    memory.set('sl-user', JSON.stringify({ id: '42', name: 'Ravi', email: 'ravi@shop.in', role: 'USER', active: true, password: '' }))
    saveAgentSettings({ token: 'test-key', printers: { [printer.id]: 'TVS queue' } })
    const entry = { id: 'entry-test', productId: product.id, batchId: null, quantity: 3 }
    setDb((d) => ({ ...d, printers: [printer], queue: [entry] }))
    let calls = 0
    globalThis.fetch = async (_url, options) => {
      calls++
      const body = JSON.parse(options.body)
      assert.equal(body.printer, 'TVS queue')
      assert.match(Buffer.from(body.data, 'base64').toString(), /SIZE /)
      return new Response(JSON.stringify({ id: body.id, state: 'spooled', spoolJobId: 24 }))
    }
    const eventCount = getDb().printEvents.length
    const job = await printing.printQueue(printer.id, printer.templateId)
    assert.equal(calls, 1)
    assert.equal(job.delivery, 'RAW')
    assert.equal(job.spoolJobId, 24)
    assert.equal(job.items[0].state, 'SENT_TO_PRINTER')
    assert.equal(job.items[0].printed, 0)
    assert.equal(getDb().queue.length, 0)
    assert.equal(getDb().printEvents.length, eventCount)
    await assert.rejects(printing.printQueue(printer.id, printer.templateId), /empty/)
    setDb((d) => ({ ...d, queue: [entry] }))
    globalThis.fetch = async () => { calls++; throw new Error('response lost') }
    const failed = await printing.printQueue(printer.id, printer.templateId)
    assert.match(failed.submissionError, /may already be queued/)
    assert.equal(failed.items[0].printed, 0)
    assert.equal(calls, 2)
    await assert.rejects(printing.retryFailed(failed.id), /Check the Windows queue before reprinting/)
    assert.equal(calls, 2)
    // Let the store's debounce finish before restoring the browser shim.
    await new Promise((resolve) => setTimeout(resolve, 300))
  } finally {
    globalThis.fetch = originalFetch
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
    else delete globalThis.localStorage
    hooks.deregister()
  }
})
