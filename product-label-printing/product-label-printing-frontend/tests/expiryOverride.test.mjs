import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    try { return next(specifier + '.ts', context) } catch { /* original resolver reports errors */ }
  }
  return next(specifier, context)
} })

const { withExpiryOverride, defaultExpiry, isIsoDate } = await import('../src/lib/labelData.ts')
const { renderPrn } = await import('../src/lib/prnRenderer.ts')

const product = { id: 'p', globalId: 'g', productCode: '10010415', eanCode: null, pluCode: null, name: 'TOOR DAL', category: '', brand: '', mrp: 195, salePrice: 168, taxPercent: 5, unit: '', packedDate: '2026-10-01', expiryRule: 'MONTHS_6', shelfLifeMonths: null, expiryDate: '2027-04-01', shopId: 's', status: 'ACTIVE', createdAt: '', updatedAt: '' }
const batch = { id: 'b', productId: 'p', batchCode: 'B1', packedDate: '2026-10-01', expiryDate: '2027-03-01', quantity: 10, createdAt: '' }

test('the queue expiry wins over the product and the batch, and nothing else changes', () => {
  assert.equal(defaultExpiry(product, null), '2027-04-01')
  assert.equal(defaultExpiry(product, batch), '2027-03-01')
  const plain = withExpiryOverride(product, batch, undefined)
  assert.equal(plain.product, product, 'no override: same objects')
  const o = withExpiryOverride(product, batch, '2026-12-31')
  assert.equal(o.product.expiryDate, '2026-12-31')
  assert.equal(o.batch.expiryDate, '2026-12-31')
  assert.equal(o.product.name, 'TOOR DAL')
  assert.equal(product.expiryDate, '2027-04-01', 'stored product is not modified')
})

test('the chosen expiry is what the printer receives', () => {
  const elements = [{ id: 'e', kind: 'expiryDate', xMm: 1, yMm: 1, wMm: 40, hMm: 3, fontMm: 2.4 }]
  const tpl = { id: 't', name: 'T', widthMm: 50, heightMm: 25, columns: 1, gapMm: 2, rowGapMm: 2, orientation: 'LANDSCAPE', fields: { expiryDate: true }, elements, barcodeType: 'CODE128', createdAt: '', updatedAt: '' }
  const { product: p, batch: b } = withExpiryOverride(product, batch, '2026-12-31')
  const prn = renderPrn(tpl, { language: 'TSPL', dpi: 203 }, { product: p, batch: b, shop: undefined, qrUrl: '', quantity: 1 })
  assert.match(prn, /"Expiry: 31-12-26"/)
})

test('only real yyyy-mm-dd dates are accepted', () => {
  assert.equal(isIsoDate('2026-12-31'), true)
  assert.equal(isIsoDate('31-12-2026'), false)
  assert.equal(isIsoDate('2026-13-45'), false)
  assert.equal(isIsoDate(null), false)
})

test('queue expiry options: 3 / 6 months from the packed date, or a picked date', async () => {
  const { expiryForChoice, packedDateFor } = await import('../src/lib/labelData.ts')
  assert.equal(expiryForChoice('MONTHS_3', '2026-10-08'), '2027-01-08')
  assert.equal(expiryForChoice('MONTHS_6', '2026-10-08'), '2027-04-08')
  assert.equal(expiryForChoice('MONTHS_6', '2026-08-31'), '2027-02-28', 'month-end stays inside the month')
  assert.equal(expiryForChoice('CUSTOM', '2026-10-08', '2026-12-25'), '2026-12-25')
  assert.equal(expiryForChoice('CUSTOM', '2026-10-08', 'not a date'), undefined)
  assert.equal(expiryForChoice('PRODUCT', '2026-10-08'), undefined, 'falls back to the product’s own expiry')
  assert.equal(packedDateFor(product, batch), '2026-10-01', 'batch packed date first')
  assert.equal(packedDateFor({ ...product, packedDate: '2026-09-15' }, null), '2026-09-15')
})
