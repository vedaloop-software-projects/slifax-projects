import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    try { return next(specifier + '.ts', context) } catch { /* original resolver reports errors */ }
  }
  return next(specifier, context)
} })

const { LABEL_FONTS, DEFAULT_FONT_ID, fontCss, isLabelFont } = await import('../src/lib/fonts.ts')
const { validateElements } = await import('../src/lib/freeLayout.ts')
const { renderPrn } = await import('../src/lib/prnRenderer.ts')

test('a small library of common fonts, Arial by default', () => {
  assert.ok(LABEL_FONTS.length >= 3 && LABEL_FONTS.length <= 5)
  assert.equal(DEFAULT_FONT_ID, 'arial')
  assert.match(fontCss(), /^Arial/)
  assert.match(fontCss('courier'), /Courier New/)
  assert.match(fontCss('removed-font'), /^Arial/, 'unknown ids fall back instead of breaking the label')
  assert.equal(isLabelFont('verdana'), true)
  assert.equal(isLabelFont('Comic Sans'), false)
})

const tpl = (fontFamily) => ({
  id: 't', name: 'T', widthMm: 50, heightMm: 25, columns: 1, gapMm: 2, rowGapMm: 2, orientation: 'LANDSCAPE',
  fields: { productName: true }, barcodeType: 'CODE128', createdAt: '', updatedAt: '',
  elements: [{ id: 'n', kind: 'productName', xMm: 1, yMm: 1, wMm: 40, hMm: 4, fontMm: 3, ...(fontFamily ? { fontFamily } : {}) }],
})

test('saving a template only accepts fonts from the library', () => {
  assert.doesNotThrow(() => validateElements(tpl('times')))
  assert.throws(() => validateElements(tpl('Comic Sans')), /choose one of/)
})

test('PRN keeps the printer font whatever font is chosen on screen', () => {
  const product = { id: 'p', globalId: 'g', productCode: '1001', eanCode: null, pluCode: null, name: 'TOOR DAL', category: '', brand: '', mrp: 1, salePrice: 1, taxPercent: 0, unit: '', packedDate: '2026-10-01', expiryRule: 'NONE', shelfLifeMonths: null, expiryDate: null, shopId: 's', status: 'ACTIVE', createdAt: '', updatedAt: '' }
  const data = { product, batch: null, shop: undefined, qrUrl: '', quantity: 1 }
  for (const language of ['TSPL', 'ZPL']) {
    assert.equal(renderPrn(tpl('courier'), { language, dpi: 203 }, data), renderPrn(tpl(), { language, dpi: 203 }, data))
  }
})
