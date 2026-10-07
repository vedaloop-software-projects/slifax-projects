import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    try { return next(specifier + '.ts', context) } catch { /* original resolver reports errors */ }
  }
  return next(specifier, context)
} })

const { fitText, truncateToWidth, approxMeasure } = await import('../src/lib/textFit.ts')
const { renderPrn, tsplFontFor } = await import('../src/lib/prnRenderer.ts')
const { fieldsFromElements } = await import('../src/lib/freeLayout.ts')

const NAMES = {
  '70 chars': 'TATA SAMPANN UNPOLISHED TOOR DAL ARHAR DAL RICH IN PROTEIN PREMIUM 1KG',
  '120 chars': 'AASHIRVAAD SUPERIOR MP WHOLE WHEAT ATTA WITH MULTIGRAINS ZERO MAIDA HIGH FIBRE FAMILY PACK SPECIAL EDITION VALUE OFFER 5KG',
  '200 chars': 'X'.repeat(10) + ' ' + 'FORTUNE KACHI GHANI PURE MUSTARD OIL POUCH '.repeat(4) + 'COLD PRESSED EXTRA PUNGENT FOR COOKING AND PICKLES 1 LITRE MULTI PACK',
  'one 80-char word': 'Z'.repeat(80),
}
for (const [k, v] of Object.entries(NAMES)) assert.ok(v.length >= Number.parseInt(k) || k.startsWith('one'), k)

const measure = approxMeasure(0.55)

test('fitText: every line fits the box width and the lines fit its height', () => {
  for (const [label, name] of Object.entries(NAMES)) {
    for (const box of [{ w: 40, h: 4 }, { w: 40, h: 9 }, { w: 20, h: 3 }]) {
      const fit = fitText(name, { widthMm: box.w, heightMm: box.h, fontMm: 3.4, measure })
      assert.ok(fit.lines.length >= 1, label)
      for (const line of fit.lines) assert.ok(measure(line, fit.fontMm) <= box.w + 1e-9, `${label} ${box.w}x${box.h}: "${line}" too wide`)
      assert.ok(fit.lines.length === 1 || fit.lines.length * fit.fontMm * 1.15 <= box.h + 1e-6, `${label}: ${fit.lines.length} lines overflow ${box.h} mm`)
      assert.ok(fit.fontMm >= 3.4 * 0.6 - 1e-9, `${label}: never below 60% of the design size`)
    }
  }
})

test('fitText: short text is untouched, medium text shrinks before it wraps or cuts', () => {
  assert.deepEqual(fitText('TOOR DAL 1KG', { widthMm: 40, heightMm: 4, fontMm: 3.4, measure }), { fontMm: 3.4, lines: ['TOOR DAL 1KG'], truncated: false })
  const medium = fitText('TOOR DAL UNPOLISHED PREMIUM', { widthMm: 40, heightMm: 4, fontMm: 3.4, measure })
  assert.equal(medium.lines.length, 1)
  assert.ok(medium.fontMm < 3.4 && !medium.truncated)
  const tall = fitText(NAMES['70 chars'], { widthMm: 40, heightMm: 9, fontMm: 3.4, measure })
  assert.ok(tall.lines.length >= 2, 'a taller box wraps instead of cutting')
  const cut = fitText(NAMES['200 chars'], { widthMm: 40, heightMm: 4, fontMm: 3.4, measure })
  assert.ok(cut.truncated && cut.lines.at(-1).endsWith('..'))
})

test('truncateToWidth keeps as much as fits and marks the cut', () => {
  const t = truncateToWidth('ABCDEFGHIJ', 4 * 0.55 * 1 + 2 * 0.55 * 1, 1, measure)
  assert.equal(t, 'ABCD..')
  assert.equal(truncateToWidth('ABC', 10, 1, measure), 'ABC')
})

// ── PRN: nothing may print past its box or onto the next label ─────────────
const FIELDS = { shopName: false, address: false, productName: true, mrp: false, salePrice: false, barcode: false, productCode: false, packedDate: false, expiryDate: false, batchCode: false, qr: false }
const product = (name) => ({ id: 'p', globalId: 'g', productCode: '10010415', eanCode: null, pluCode: null, name, category: '', brand: '', mrp: 195, salePrice: 168, taxPercent: 5, unit: '', packedDate: '2026-10-01', expiryRule: 'NONE', shelfLifeMonths: null, expiryDate: null, shopId: 's', status: 'ACTIVE', createdAt: '', updatedAt: '' })
const shop = { id: 's', name: 'Shop', address: '', location: 'City' }
const designed = (h) => {
  const elements = [{ id: 'n', kind: 'productName', xMm: 2, yMm: 1, wMm: 40, hMm: h, fontMm: 3.4, bold: true, align: 'center' }]
  return { id: 't', name: 'T', widthMm: 50, heightMm: 25, columns: 2, gapMm: 2, rowGapMm: 2, orientation: 'LANDSCAPE', fields: fieldsFromElements(elements, FIELDS), elements, barcodeType: 'CODE128', createdAt: '', updatedAt: '' }
}

test('PRN canvas layouts: TSPL text stays inside its 40 mm box in both columns', () => {
  for (const [label, name] of Object.entries(NAMES)) {
    for (const h of [4, 9]) {
      const prn = renderPrn(designed(h), { language: 'TSPL', dpi: 203 }, { product: product(name), batch: null, shop, qrUrl: '', quantity: 2 })
      const lines = [...prn.matchAll(/^TEXT (\d+),(\d+),"(\d)",0,(\d),\d,"([^"]*)"/gm)]
      assert.ok(lines.length, label)
      for (const [, xs, ys, font, mult, text] of lines) {
        const x = Number(xs)
        const width = text.length * { 1: 8, 2: 12, 3: 16, 4: 24, 5: 32 }[font] * Number(mult)
        const col = x >= 416 ? 1 : 0 // second label starts at (50 + 2) mm × 8
        const boxLeft = col * 416 + 16
        const boxRight = boxLeft + 320
        assert.ok(x >= boxLeft - 1 && x + width <= boxRight + 1, `${label} h=${h}: "${text}" spans ${x}–${x + width}, box ${boxLeft}–${boxRight}`)
        assert.ok(Number(ys) + tsplFontFor(24).height <= (1 + h) * 8 + 24, `${label} h=${h}: line below the box`)
      }
    }
  }
})

test('PRN canvas layouts: ZPL lines are boxed to the element width', () => {
  for (const name of Object.values(NAMES)) {
    const prn = renderPrn(designed(9), { language: 'ZPL', dpi: 203 }, { product: product(name), batch: null, shop, qrUrl: '', quantity: 2 })
    const fields = [...prn.matchAll(/\^FO(\d+),\d+\^A0N,(\d+),\d+\^FB(\d+),1,0,[LCR],0\^FD([^^]*)\^FS/g)]
    assert.ok(fields.length)
    for (const [, , h, w, text] of fields) {
      assert.equal(Number(w), 320)
      assert.ok(text.length * Number(h) * 0.58 <= 320 + 1, `"${text}" estimated wider than its block`)
    }
  }
})

const classic = (extra = {}) => ({ id: 'c', name: 'C', widthMm: 50, heightMm: 25, columns: 2, gapMm: 2, rowGapMm: 2, orientation: 'LANDSCAPE', fields: { ...FIELDS, mrp: true, barcode: true, productCode: true }, barcodeType: 'CODE128', createdAt: '', updatedAt: '', ...extra })

test('PRN classic layouts: long names no longer fail the print job, and stay on the label', () => {
  for (const name of Object.values(NAMES)) {
    const data = { product: product(name), batch: null, shop, qrUrl: '', quantity: 2 }
    // With margins this used to throw "Text does not fit inside the margins for PRN".
    const margins = renderPrn(classic({ marginsMm: { top: 1, right: 1, bottom: 1, left: 1 } }), { language: 'TSPL', dpi: 203 }, data)
    for (const [, x, font, text] of margins.matchAll(/^TEXT (\d+),\d+,"(\d)",0,1,1,"([^"]*)"/gm)) {
      const col = Number(x) >= 416 ? 1 : 0
      assert.ok(Number(x) + text.length * { 1: 8, 2: 12, 3: 16 }[font] <= col * 416 + 8 + 384 + 1, `margins: "${text}" past the label`)
    }
    for (const lang of ['TSPL', 'ZPL']) assert.doesNotThrow(() => renderPrn(classic(), { language: lang, dpi: 203 }, data))
    const tspl = renderPrn(classic(), { language: 'TSPL', dpi: 203 }, data)
    for (const [, x, font, text] of tspl.matchAll(/^TEXT (\d+),\d+,"(\d)",0,1,1,"([^"]*)"/gm)) {
      const col = Number(x) >= 416 ? 1 : 0
      assert.ok(Number(x) + text.length * { 1: 8, 2: 12, 3: 16 }[font] <= col * 416 + 12 + 376 + 1, `classic: "${text}" past the label`)
    }
  }
})
