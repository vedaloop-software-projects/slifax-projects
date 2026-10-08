import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

// The bundler resolves extensionless TS imports; mirror only that lookup.
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    try { return next(specifier + '.ts', context) } catch { /* original resolver reports errors */ }
  }
  return next(specifier, context)
} })

const { autoLayout, scaleElements, validateElements, elementText, labelFrame, fieldsFromElements, defaultElement, FIELD_ORDER } = await import('../src/lib/freeLayout.ts')
const { renderPrn, tsplFontFor } = await import('../src/lib/prnRenderer.ts')
const { snapMove, resizeElement } = await import('../src/pages/templates/canvasMath.ts')

const FIELDS = { shopName: true, address: false, productName: true, mrp: true, salePrice: true, barcode: true, productCode: true, packedDate: true, expiryDate: true, batchCode: false, qr: false }
const product = { id: 'p', globalId: 'prd_x', productCode: '10010415', eanCode: null, pluCode: null, name: 'TOOR DAL 1KG', category: '', brand: '', mrp: 195, salePrice: 168, taxPercent: 5, unit: 'KG', packedDate: '2026-10-01', expiryRule: 'MONTHS_6', shelfLifeMonths: null, expiryDate: '2027-04-01', shopId: 's', status: 'ACTIVE', createdAt: '', updatedAt: '' }
const shop = { id: 's', name: 'Vijaya Durga', address: '', location: 'Vijayawada' }
const inside = (els, frame) => els.every((e) => e.xMm >= 0 && e.yMm >= 0 && e.xMm + e.wMm <= frame.width + 1e-9 && e.yMm + e.hMm <= frame.height + 1e-9)

test('auto layout turns classic templates into elements that sit inside the label', () => {
  for (const orientation of ['LANDSCAPE', 'PORTRAIT']) {
    const tpl = { widthMm: 50, heightMm: 25, orientation, fields: { ...FIELDS, qr: true } }
    const els = autoLayout(tpl)
    const frame = labelFrame(tpl)
    assert.ok(inside(els, frame), orientation)
    // QR codes are switched off: even with fields.qr on, none is placed.
    assert.deepEqual(new Set(els.map((e) => e.kind)), new Set(['shopName', 'productName', 'mrp', 'salePrice', 'barcode', 'productCode', 'packedDate', 'expiryDate']))
    const barcode = els.find((e) => e.kind === 'barcode')
    assert.ok(barcode.hMm >= 4 && barcode.wMm > 15, `barcode is usable in ${orientation}`)
    assert.doesNotThrow(() => validateElements({ ...tpl, elements: els }))
  }
})

test('field switches follow what is on the canvas', () => {
  const fields = fieldsFromElements([{ kind: 'barcode' }, { kind: 'text' }], FIELDS)
  assert.equal(fields.barcode, true)
  assert.equal(fields.productName, false)
  assert.equal(fields.mrp, false)
})

test('changing the label size scales the whole design', () => {
  const el = { id: 'a', kind: 'productName', xMm: 2, yMm: 3, wMm: 20, hMm: 4, fontMm: 3 }
  const [big] = scaleElements([el], { width: 50, height: 25 }, { width: 100, height: 50 })
  assert.deepEqual([big.xMm, big.yMm, big.wMm, big.hMm, big.fontMm], [4, 6, 40, 8, 6])
})

test('elements outside the label or with odd sizes are rejected', () => {
  const tpl = { widthMm: 50, heightMm: 25, orientation: 'LANDSCAPE' }
  assert.throws(() => validateElements({ ...tpl, elements: [{ id: 'a', kind: 'productName', xMm: 45, yMm: 0, wMm: 10, hMm: 4, fontMm: 3 }] }), /sticks out/)
  assert.throws(() => validateElements({ ...tpl, elements: [{ id: 'a', kind: 'productName', xMm: 0, yMm: 0, wMm: 10, hMm: 4, fontMm: 0.2 }] }), /text size/)
  assert.throws(() => validateElements({ ...tpl, elements: [{ id: 'a', kind: 'text', xMm: 0, yMm: 0, wMm: 10, hMm: 4, fontMm: 3, text: 'x'.repeat(81) }] }), /80 characters/)
})

test('prefixes can be renamed or removed; missing data prints nothing', () => {
  const d = { product, batch: null, shop, qrUrl: '' }
  assert.equal(elementText({ kind: 'mrp' }, d), 'MRP ₹195')
  assert.equal(elementText({ kind: 'mrp', prefix: 'M.R.P.' }, d, 'Rs.'), 'M.R.P. Rs.195')
  assert.equal(elementText({ kind: 'salePrice', prefix: '' }, d), '₹168')
  assert.equal(elementText({ kind: 'batchCode' }, d), null)
  assert.equal(elementText({ kind: 'text', text: '  Best before 6 months ' }, d), 'Best before 6 months')
})

const tsplPrinter = { language: 'TSPL', dpi: 203 }
const zplPrinter = { language: 'ZPL', dpi: 203 }
const design = (elements) => ({ id: 't', name: 'T', widthMm: 50, heightMm: 25, columns: 2, gapMm: 2, rowGapMm: 2, orientation: 'LANDSCAPE', fields: fieldsFromElements(elements, FIELDS), elements, barcodeType: 'CODE128', createdAt: '', updatedAt: '' })
const data = { product, batch: null, shop, qrUrl: '', quantity: 2 }

test('PRN puts each element where it was designed, in printer dots (8 per mm)', () => {
  const tpl = design([
    { id: 'n', kind: 'productName', xMm: 2, yMm: 1, wMm: 40, hMm: 4, fontMm: 3, bold: true },
    { id: 'b', kind: 'barcode', xMm: 5, yMm: 10, wMm: 40, hMm: 8 },
  ])
  const tspl = renderPrn(tpl, tsplPrinter, data)
  assert.match(tspl, /SIZE 102 mm, 25 mm/)
  // Bold = printed twice, one dot apart; second column starts at (50 + 2) mm = 416 dots.
  assert.match(tspl, /TEXT 16,8,"3",0,1,1,"TOOR DAL 1KG"/)
  assert.match(tspl, /TEXT 17,8,"3",0,1,1,"TOOR DAL 1KG"/)
  assert.match(tspl, /TEXT 432,8,"3",0,1,1,"TOOR DAL 1KG"/)
  const bars = [...tspl.matchAll(/^BAR (\d+),(\d+),(\d+),(\d+)/gm)].map((m) => m.slice(1).map(Number)).filter(([x]) => x < 416)
  assert.ok(bars.length > 10)
  assert.ok(bars.every(([x, y, w, h]) => x >= 40 && x + w <= 360 && y === 80 && h === 64), 'bars stay inside the 40×8 mm box at (5,10) mm')
})

test('centred and right-aligned text: ZPL field blocks, TSPL measured offsets', () => {
  const tpl = design([{ id: 'c', kind: 'text', text: 'HELLO', xMm: 0, yMm: 0, wMm: 50, hMm: 4, fontMm: 3, align: 'center' }])
  const zpl = renderPrn(tpl, zplPrinter, data)
  assert.match(zpl, /\^FO0,0\^A0N,24,18\^FB400,1,0,C,0\^FDHELLO\^FS/)
  const tspl = renderPrn(tpl, tsplPrinter, data)
  // Font 3 is 16 dots wide: 5 chars = 80 dots, centred in 400 → x = 160.
  assert.match(tspl, /TEXT 160,0,"3",0,1,1,"HELLO"/)
})

test('custom text with printer command characters is refused', () => {
  const tpl = design([{ id: 'c', kind: 'text', text: 'A^B', xMm: 0, yMm: 0, wMm: 20, hMm: 4, fontMm: 3 }])
  assert.throws(() => renderPrn(tpl, zplPrinter, data), /command characters/)
})

test('TSPL picks the largest resident font that fits the designed height', () => {
  assert.deepEqual([tsplFontFor(24).font.id, tsplFontFor(24).mult], ['3', 1])
  assert.deepEqual([tsplFontFor(40).font.id, tsplFontFor(40).mult, tsplFontFor(40).height], ['2', 2, 40]) // font 2 at 2×
  assert.equal(tsplFontFor(5).font.id, '1') // nothing fits: smallest font
})

test('dragging snaps to the label centre; text corners scale the font', () => {
  const frame = { width: 50, height: 25 }
  const el = { id: 'a', kind: 'productName', xMm: 14.6, yMm: 2, wMm: 20, hMm: 4, fontMm: 3 }
  const { el: snapped, guides } = snapMove(el, [], frame, false)
  assert.equal(snapped.xMm, 15) // centre (15 + 10) lands on 25 mm
  assert.ok(guides.some((g) => g.axis === 'x' && g.mm === 25))
  assert.equal(snapMove(el, [], frame, true).el.xMm, 14.6) // Alt: no snapping

  const bigger = resizeElement(el, 'se', 4, 4, frame, false)
  assert.equal(bigger.hMm, 8)
  assert.equal(bigger.fontMm, 6)
  const wider = resizeElement(el, 'e', 6, 0, frame, false)
  assert.equal(wider.wMm, 26)
  assert.equal(wider.fontMm, 3)
  const qr = resizeElement({ id: 'q', kind: 'qr', xMm: 30, yMm: 5, wMm: 10, hMm: 10 }, 'se', 5, 1, frame, false)
  assert.equal(qr.wMm, qr.hMm)
})

test('new elements dropped on the label stay inside it', () => {
  const frame = { width: 50, height: 25 }
  const el = defaultElement('barcode', frame, { xMm: 49, yMm: 24 })
  assert.ok(inside([el], frame))
})

test('QR codes are switched off: not offered, and never printed even if a template has one', () => {
  assert.ok(!FIELD_ORDER.includes('qr'), 'not in the designer palette')
  const tpl = design([{ id: 'q', kind: 'qr', xMm: 30, yMm: 2, wMm: 15, hMm: 15 }, { id: 'n', kind: 'productName', xMm: 1, yMm: 1, wMm: 25, hMm: 4, fontMm: 3 }])
  for (const language of ['TSPL', 'ZPL']) {
    const prn = renderPrn(tpl, { language, dpi: 203 }, { ...data, qrUrl: 'https://example.com/q/1' })
    assert.doesNotMatch(prn, /QRCODE|\^BQN/, language)
    assert.match(prn, /TOOR DAL/)
  }
})
