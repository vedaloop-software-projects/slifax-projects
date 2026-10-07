import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    try { return next(specifier + '.ts', context) } catch { /* original resolver reports errors */ }
  }
  return next(specifier, context)
} })

const memory = new Map()
globalThis.localStorage = { getItem: (k) => (memory.has(k) ? memory.get(k) : null), setItem: (k, v) => memory.set(k, String(v)), removeItem: (k) => memory.delete(k) }

const { logPrints, pendingPrintLogs, syncPrintLogs, hasPreviousDayLogs } = await import('../src/lib/printLog.ts')
const { withExpiryOverride } = await import('../src/lib/labelData.ts')
const { renderPrn } = await import('../src/lib/prnRenderer.ts')

const signIn = (id) => memory.set('sl-user', JSON.stringify({ id, clientId: '10', role: 'USER' }))
const entry = (over = {}) => ({ method: 'PRN', status: 'SPOOLED', printer: 'TVS', templateId: 't', templateName: 'T', productId: 'p1', productCode: '1001', productName: 'Toor Dal', quantity: 2, expiryDate: null, ...over })

beforeEach(() => memory.clear())

test('prints are kept locally with the signed-in user, no network involved', () => {
  signIn('15')
  logPrints([entry(), entry({ productId: 'p2', quantity: 0 })])
  const pending = pendingPrintLogs('15')
  assert.equal(pending.length, 1, 'zero-quantity lines are not logged')
  assert.equal(pending[0].userId, '15')
  assert.equal(pending[0].clientId, '10')
  assert.match(pending[0].id, /[\w-]{8,}/)
})

test('logout sync sends only this user’s records and removes them once accepted', async () => {
  signIn('15')
  logPrints([entry(), entry()])
  signIn('16')
  logPrints([entry()])
  const sent = []
  const n = await syncPrintLogs(async (batch) => { sent.push(...batch) })
  assert.equal(n, 1)
  assert.ok(sent.every((e) => e.userId === '16'))
  assert.equal(pendingPrintLogs('16').length, 0)
  assert.equal(pendingPrintLogs('15').length, 2, 'the other user’s prints wait for their own sync')
})

test('a failed send keeps everything for the next attempt', async () => {
  signIn('15')
  logPrints([entry(), entry()])
  await assert.rejects(syncPrintLogs(async () => { throw new Error('offline') }))
  assert.equal(pendingPrintLogs('15').length, 2)
})

test('end-of-day sync sends earlier days and leaves today for logout', async () => {
  signIn('15')
  logPrints([entry({ productId: 'old' })], new Date('2026-10-06T10:00:00'))
  logPrints([entry({ productId: 'today' })], new Date('2026-10-07T09:00:00'))
  const now = new Date('2026-10-07T12:00:00')
  assert.equal(hasPreviousDayLogs('15', now), true)
  const sent = []
  await syncPrintLogs(async (b) => { sent.push(...b) }, { onlyBeforeToday: true, now })
  assert.deepEqual(sent.map((e) => e.productId), ['old'])
  assert.deepEqual(pendingPrintLogs('15').map((e) => e.productId), ['today'])
  assert.equal(hasPreviousDayLogs('15', now), false)
})

test('unticking expiry removes it from the printed label', () => {
  const product = { id: 'p', globalId: 'g', productCode: '10010415', eanCode: null, pluCode: null, name: 'TOOR DAL', category: '', brand: '', mrp: 195, salePrice: 168, taxPercent: 5, unit: '', packedDate: '2026-10-01', expiryRule: 'MONTHS_6', shelfLifeMonths: null, expiryDate: '2027-04-01', shopId: 's', status: 'ACTIVE', createdAt: '', updatedAt: '' }
  const elements = [{ id: 'e', kind: 'expiryDate', xMm: 1, yMm: 1, wMm: 40, hMm: 3, fontMm: 2.4 }, { id: 'n', kind: 'productName', xMm: 1, yMm: 5, wMm: 40, hMm: 3, fontMm: 2.4 }]
  const tpl = { id: 't', name: 'T', widthMm: 50, heightMm: 25, columns: 1, gapMm: 2, rowGapMm: 2, orientation: 'LANDSCAPE', fields: { expiryDate: true, productName: true }, elements, barcodeType: 'CODE128', createdAt: '', updatedAt: '' }
  const shown = withExpiryOverride(product, null, undefined, true)
  const hidden = withExpiryOverride(product, null, undefined, false)
  const prn = (d) => renderPrn(tpl, { language: 'TSPL', dpi: 203 }, { product: d.product, batch: d.batch, shop: undefined, qrUrl: '', quantity: 1 })
  assert.match(prn(shown), /Expiry: 01-04-27/)
  assert.doesNotMatch(prn(hidden), /Expiry/)
  assert.match(prn(hidden), /TOOR DAL/, 'the rest of the label still prints')
  assert.equal(product.expiryDate, '2027-04-01', 'the product itself is unchanged')
})
