import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    try { return next(specifier + '.ts', context) } catch { /* original resolver reports errors */ }
  }
  return next(specifier, context)
} })

const { printerTextSpec, fontTestPrn, isPrinterFont, PRINTER_FONTS } = await import('../src/lib/printerFonts.ts')
const { renderPrn } = await import('../src/lib/prnRenderer.ts')
const { validateElements } = await import('../src/lib/freeLayout.ts')

test('each printer font maps to that language’s own resident font', () => {
  const cmd = (lang, font, mm = 3) => printerTextSpec(lang, font, 203).command(10, 20, 320, 'ABC', mm, 'left')
  assert.match(cmd('ZPL', 'standard'), /\^A0N,24,18/)
  assert.match(cmd('ZPL', 'smooth'), /\^A0N,24,18/)
  assert.match(cmd('ZPL', 'ocrb'), /\^AEN,28,15/, 'OCR-B = font E')
  assert.match(cmd('ZPL', 'ocra'), /\^AHN,21,13/, 'OCR-A = font H')
  assert.match(cmd('TSPL', 'standard'), /^TEXT 10,20,"3",0,1,1,"ABC"$/)
  assert.match(cmd('TSPL', 'smooth'), /^TEXT 10,20,"0",0,9,9,"ABC"$/, 'font 0 sized in points: 24 dots @203 dpi ≈ 9 pt')
  assert.match(cmd('TSPL', 'ocrb'), /"6",0,1,1/)
  assert.match(cmd('TSPL', 'ocrb', 3.5), /"7",0,1,1/)
  assert.match(cmd('TSPL', 'ocra'), /"8",0,1,1/)
  assert.match(printerTextSpec('ZPL', 'ocrb', 300).command(0, 0, 500, 'A', 3.5, 'left'), /\^AEN,42,20/, '300 dpi uses the larger base cell')
})

test('bitmap OCR fonts grow in whole steps', () => {
  const spec = printerTextSpec('ZPL', 'ocrb', 203)
  assert.equal(spec.lineDots(3), 28)
  assert.equal(spec.lineDots(7), 56) // 2×
})

const product = { id: 'p', globalId: 'g', productCode: '1001', eanCode: null, pluCode: null, name: 'TOOR DAL UNPOLISHED PREMIUM QUALITY 1KG', category: '', brand: '', mrp: 1, salePrice: 1, taxPercent: 0, unit: '', packedDate: '2026-10-01', expiryRule: 'NONE', shelfLifeMonths: null, expiryDate: null, shopId: 's', status: 'ACTIVE', createdAt: '', updatedAt: '' }
const tpl = (printerFont) => ({
  id: 't', name: 'T', widthMm: 50, heightMm: 25, columns: 1, gapMm: 2, rowGapMm: 2, orientation: 'LANDSCAPE', fields: { productName: true }, barcodeType: 'CODE128', createdAt: '', updatedAt: '',
  elements: [{ id: 'n', kind: 'productName', xMm: 2, yMm: 1, wMm: 40, hMm: 8, fontMm: 3, align: 'center', ...(printerFont ? { printerFont } : {}) }],
})
const data = { product, batch: null, shop: undefined, qrUrl: '', quantity: 1 }

test('PRN uses the chosen printer font and still keeps long text inside the box', () => {
  const tspl = renderPrn(tpl('ocrb'), { language: 'TSPL', dpi: 203 }, data)
  const lines = [...tspl.matchAll(/^TEXT (\d+),\d+,"(\d)",0,(\d),\d,"([^"]*)"/gm)]
  assert.ok(lines.length >= 1 && lines.every(([, , f]) => f === '6' || f === '7'))
  for (const [, x, f, m, t] of lines) {
    const w = t.length * { 6: 14, 7: 21 }[f] * Number(m)
    assert.ok(Number(x) >= 16 && Number(x) + w <= 16 + 320 + 1, `"${t}" outside the box`)
  }
  assert.match(renderPrn(tpl('ocra'), { language: 'ZPL', dpi: 203 }, data), /\^AHN/)
})

test('standard printer font output is exactly what it was before', () => {
  for (const language of ['TSPL', 'ZPL']) {
    assert.equal(renderPrn(tpl('standard'), { language, dpi: 203 }, data), renderPrn(tpl(), { language, dpi: 203 }, data))
  }
})

test('templates only accept known printer fonts', () => {
  assert.equal(isPrinterFont('ocrb'), true)
  assert.equal(isPrinterFont('helvetica'), false)
  assert.doesNotThrow(() => validateElements(tpl('smooth')))
  assert.throws(() => validateElements(tpl('helvetica')), /printer font/)
})

test('font test label prints one labelled line per printer font', () => {
  for (const language of ['TSPL', 'ZPL']) {
    const prn = fontTestPrn(language, 203, 50, 25)
    for (const f of PRINTER_FONTS) assert.ok(prn.includes(`${f.label.toUpperCase()} 0123456789`), `${language}: ${f.label}`)
    assert.ok(prn.endsWith('\r\n'))
  }
})
