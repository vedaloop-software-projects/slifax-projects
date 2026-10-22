// PRN rendering layer (§9): Product data → Label template → Printer profile → PRN.
// Data stays printer-independent; each printer language gets its own renderer.

import type { LabelTemplate, Printer, Product, ProductBatch, Shop } from '../types'
import { barcodeBars } from './barcodeLayout'
import { labelContentBox } from './labelLayout'
import { fmtDate } from './dates'
import { QR_ENABLED, barcodeValue, elementText, labelFrame, shapeOf } from './freeLayout'
import { fitText, truncateToWidth } from './textFit'
import { printerTextSpec } from './printerFonts'

type PrnPrinter = Pick<Printer, 'language' | 'dpi'>

export interface LabelData {
  product: Product
  batch: ProductBatch | null
  shop: Shop | undefined
  qrUrl: string
  quantity: number
}

const dotsPerMm = (p: PrnPrinter) => (p.dpi === 300 ? 12 : 8)
const rupee = (n: number) => `Rs.${n}` // printers rarely ship a ₹ glyph in resident fonts

function fieldsFor(tpl: LabelTemplate, d: LabelData) {
  const f = tpl.fields
  const packed = d.batch?.packedDate ?? d.product.packedDate
  const expiry = d.batch?.expiryDate ?? d.product.expiryDate
  return {
    shopName: f.shopName ? d.shop?.name ?? '' : null,
    address: f.address ? d.shop?.location ?? '' : null,
    productName: f.productName ? d.product.name : null,
    mrp: f.mrp ? `MRP ${rupee(d.product.mrp)}` : null,
    salePrice: f.salePrice ? `SALE ${rupee(d.product.salePrice)}` : null,
    barcode: f.barcode ? barcodeValue(tpl, d.product) : null,
    productCode: f.productCode ? d.product.productCode : null,
    packed: f.packedDate ? `Packed: ${fmtDate(packed, true)}` : null,
    expiry: f.expiryDate && expiry ? `Expiry: ${fmtDate(expiry, true)}` : null,
    batch: f.batchCode && d.batch ? `Batch: ${d.batch.batchCode}` : null,
    qr: f.qr && QR_ENABLED ? d.qrUrl : null,
  }
}

function fullWidthBarcode(language: 'ZPL' | 'TSPL', value: string, format: 'CODE128' | 'EAN13', x: number, y: number, width: number, height: number): string[] {
  return barcodeBars(value, format, width).map((bar) => language === 'ZPL'
    ? `^FO${x + bar.x},${y}^GB${bar.width},${height},${height},B,0^FS`
    : `BAR ${x + bar.x},${y},${bar.width},${height}`)
}

function renderZpl(tpl: LabelTemplate, p: PrnPrinter, row: LabelData[], copies: number): string {
  const k = dotsPerMm(p)
  const w = tpl.widthMm * k
  const h = tpl.heightMm * k
  const out: string[] = ['^XA', `^PW${Math.round(w * tpl.columns + (tpl.gapMm ?? 0) * k * (tpl.columns - 1))}`, `^LL${h}`, '^CI28']
  for (let c = 0; c < row.length; c++) {
    const d = row[c]
    const x = fieldsFor(tpl, d)
    const ox = Math.round(c * (w + (tpl.gapMm ?? 0) * k)) + 12
    let y = 10
    const room = Math.floor(w - 24 - (x.qr ? 110 : 0))
    const line = (text: string | null, size = 22) => {
      if (!text) return
      // Font 0 at width = height averages ~0.77 × height per character.
      const fitted = truncateToWidth(text, room, size, (t, f) => t.length * f * 0.77)
      out.push(`^FO${ox},${y}^A0N,${size},${size}^FD${fitted}^FS`)
      y += size + 4
    }
    line(x.shopName, 20)
    line(x.address, 16)
    line(x.productName, 26)
    if (x.mrp || x.salePrice) line([x.mrp, x.salePrice].filter(Boolean).join('  '), 22)
    if (x.barcode) {
      out.push(...fullWidthBarcode('ZPL', x.barcode, tpl.barcodeType === 'EAN13' && d.product.eanCode ? 'EAN13' : 'CODE128', ox, y, Math.floor(w - 24 - (x.qr ? 110 : 0)), 40))
      if (tpl.fields.productCode) out.push(`^FO${ox},${y + 42}^A0N,16,10^FD${x.barcode}^FS`)
      y += 64
    }
    line(x.packed, 18)
    line(x.expiry, 18)
    line(x.batch, 18)
    if (x.qr) out.push(`^FO${ox + w - 110},${10}^BQN,2,3^FDQA,${x.qr}^FS`)
  }
  out.push(`^PQ${copies},0,1,Y`, '^XZ')
  return out.join('\n')
}

function renderTspl(tpl: LabelTemplate, p: PrnPrinter, row: LabelData[], copies: number): string {
  const k = dotsPerMm(p)
  const w = tpl.widthMm * k
  const out: string[] = [
    `SIZE ${tpl.widthMm * tpl.columns + (tpl.gapMm ?? 0) * (tpl.columns - 1)} mm, ${tpl.heightMm} mm`,
    `GAP ${tpl.mediaMode === 'CONTINUOUS' ? 0 : tpl.rowGapMm ?? 2} mm, 0 mm`,
    'DIRECTION 1',
    'REFERENCE 0,0',
    'CLS',
  ]
  for (let c = 0; c < row.length; c++) {
    const d = row[c]
    const x = fieldsFor(tpl, d)
    const ox = Math.round(c * (w + (tpl.gapMm ?? 0) * k)) + 12
    let y = 10
    const room = Math.floor(w - 24 - (x.qr ? 110 : 0))
    const text = (t: string | null, font = '2', step = 26) => {
      if (!t) return
      const charW = { '1': 8, '2': 12, '3': 16 }[font] ?? 12
      const fitted = truncateToWidth(t.replaceAll('"', "'"), room, charW, (s, f) => s.length * f)
      out.push(`TEXT ${ox},${y},"${font}",0,1,1,"${fitted}"`)
      y += step
    }
    text(x.shopName, '2', 22)
    text(x.address, '1', 18)
    text(x.productName, '3', 30)
    if (x.mrp || x.salePrice) text([x.mrp, x.salePrice].filter(Boolean).join('  '), '2', 26)
    if (x.barcode) {
      out.push(...fullWidthBarcode('TSPL', x.barcode, tpl.barcodeType === 'EAN13' && d.product.eanCode ? 'EAN13' : 'CODE128', ox, y, Math.floor(w - 24 - (x.qr ? 110 : 0)), 40))
      if (tpl.fields.productCode) out.push(`TEXT ${ox},${y + 42},"1",0,1,1,"${x.barcode}"`)
      y += 66
    }
    text(x.packed, '1', 20)
    text(x.expiry, '1', 20)
    text(x.batch, '1', 20)
    if (x.qr) out.push(`QRCODE ${ox + w - 110},10,M,3,A,0,"${x.qr}"`)
  }
  out.push(`PRINT ${copies},1`)
  return out.join('\n')
}

function renderEscPos(tpl: LabelTemplate, _p: PrnPrinter, d: LabelData): string {
  const x = fieldsFor(tpl, d)
  const lines: string[] = ['ESC @            ; initialise', 'ESC a 1          ; centre']
  const body = [x.shopName, x.address, x.productName, [x.mrp, x.salePrice].filter(Boolean).join('  ') || null]
  body.forEach((t) => t && lines.push(`TXT "${t}"`, 'LF'))
  if (x.barcode) lines.push('GS h 60', 'GS H 2', `GS k 73 {B${x.barcode}}`)
  if (x.qr) lines.push('GS ( k  ; QR model 2, size 4', `QR "${x.qr}"`)
  ;[x.packed, x.expiry, x.batch].forEach((t) => t && lines.push(`TXT "${t}"`, 'LF'))
  lines.push(`; repeat × ${d.quantity}`, 'GS V 66 0        ; cut')
  return lines.join('\n')
}

/** Explicit margin layouts stay inside a per-label content box, including on partial rows. */
function renderWithMargins(tpl: LabelTemplate, p: PrnPrinter, row: LabelData[], copies: number): string {
  const box = labelContentBox(tpl)
  const k = dotsPerMm(p)
  const dot = (mm: number) => Math.round(mm * k)
  const scale = k / 8
  const gap = tpl.gapMm ?? 2
  if (!Number.isFinite(gap) || gap < 0) throw new Error('Invalid gap between labels.')
  const width = dot(box.width * tpl.columns + gap * (tpl.columns - 1))
  const height = dot(box.height)
  const zpl = p.language === 'ZPL'
  const out = zpl ? ['^XA', `^PW${width}`, `^LL${height}`, '^CI28'] : [
    `SIZE ${box.width * tpl.columns + gap * (tpl.columns - 1)} mm, ${box.height} mm`,
    `GAP ${tpl.mediaMode === 'CONTINUOUS' ? 0 : tpl.rowGapMm ?? 2} mm, 0 mm`, 'DIRECTION 1', 'REFERENCE 0,0', 'CLS',
  ]
  for (let c = 0; c < row.length; c++) {
    const d = row[c]
    const x = fieldsFor(tpl, d)
    const rows = [
      { text: x.shopName, size: 20 }, { text: x.address, size: 12 },
      { text: x.productName, size: 24 },
      { text: [x.mrp, x.salePrice].filter(Boolean).join('  '), size: 20 },
      { text: x.barcode, size: 0, barcode: true },
      { text: !x.barcode ? x.productCode : null, size: 12 },
      { text: x.packed, size: 12 }, { text: x.expiry, size: 12 }, { text: x.batch, size: 12 },
    ].filter((line) => !!line.text)
    const extraGap = dot(box.gap)
    const barcodeHeight = Math.round(40 * scale)
    const barcodeRowHeight = Math.round((tpl.fields.productCode ? 64 : 44) * scale)
    // Byte-mode capacity at medium error correction, versions 1 through 10.
    // A conservative reservation also covers printers which optimise numeric/alphanumeric data.
    const qrBytes = new TextEncoder().encode(x.qr ?? '').length
    const qrVersion = [14, 26, 42, 62, 84, 106, 122, 152, 180, 213].findIndex((capacity) => qrBytes <= capacity) + 1
    if (x.qr && !qrVersion) throw new Error('QR data is too long for this margin layout. Use a shorter QR URL.')
    const qrModules = 17 + 4 * qrVersion
    const qrModule = Math.min(3, Math.floor(Math.min(dot(box.contentWidth) * 0.4, dot(box.contentHeight)) / (qrModules + 8)))
    if (x.qr && qrModule < 1) throw new Error('QR code does not fit inside the margins.')
    const qrSide = x.qr ? (qrModules + 8) * qrModule : 0
    const availableWidth = dot(box.contentWidth) - qrSide
    const fonts = [{ id: '1', height: 12, width: 8 }, { id: '2', height: 20, width: 12 }, { id: '3', height: 24, width: 16 }]
    for (const line of rows) {
      if (line.barcode || !line.text) continue
      line.text = truncateToWidth(line.text, availableWidth, fonts[0].width * scale, (t, f) => Math.ceil(t.length * f))
    }
    const chooseFont = (text: string, size: number) => {
      const font = [...fonts].reverse().find((f) => f.height <= size && Math.ceil(text.length * f.width * scale) <= availableWidth)
      if (!font) throw new Error('The label is too narrow for any printer font. Reduce side margins or use a wider label.')
      return font
    }
    let compact = false
    const rowHeight = (line: typeof rows[number]) => line.barcode ? barcodeRowHeight : Math.round((chooseFont(line.text!, compact ? 12 : line.size).height + 2) * scale)
    const totalHeight = () => rows.reduce((sum, line) => sum + rowHeight(line), 0) + Math.max(0, rows.length - 1) * extraGap
    if (totalHeight() > dot(box.contentHeight)) compact = true
    if (totalHeight() > dot(box.contentHeight)) {
      throw new Error('Fields do not fit between the top and bottom margins for PRN. Reduce margins or spacing, hide fields, or use a taller label.')
    }
    const ox = dot(c * (box.width + gap) + box.margins.left)
    let y = dot(box.margins.top)
    for (const line of rows) {
      if (line.barcode) {
        const ean = tpl.barcodeType === 'EAN13' && !!d.product.eanCode
        out.push(...fullWidthBarcode(zpl ? 'ZPL' : 'TSPL', line.text!, ean ? 'EAN13' : 'CODE128', ox, y, availableWidth, barcodeHeight))
        if (tpl.fields.productCode) {
          if (zpl) out.push(`^FO${ox},${y + barcodeHeight + 2}^A0N,${Math.round(12 * scale)},${Math.round(8 * scale)}^FD${line.text}^FS`)
          else out.push(`TEXT ${ox},${y + barcodeHeight + 2},"1",0,1,1,"${line.text}"`)
        }
      } else {
        const font = chooseFont(line.text!, compact ? 12 : line.size)
        if (zpl) out.push(`^FO${ox},${y}^A0N,${Math.round(font.height * scale)},${Math.round(font.width * scale)}^FD${line.text}^FS`)
        else out.push(`TEXT ${ox},${y},"${font.id}",0,1,1,"${line.text}"`)
      }
      y += rowHeight(line) + extraGap
    }
    if (x.qr) {
      const qx = dot(c * (box.width + gap) + box.width - box.margins.right) - qrSide + 4 * qrModule
      const qy = dot(box.margins.top) + 4 * qrModule
      if (zpl) out.push(`^FO${qx},${qy}^BQN,2,${qrModule}^FDMA,${x.qr}^FS`)
      else out.push(`QRCODE ${qx},${qy},M,${qrModule},A,0,"${x.qr}"`)
    }
  }
  out.push(...(zpl ? [`^PQ${copies},0,1,Y`, '^XZ'] : [`PRINT ${copies},1`]))
  return out.join('\n')
}

// Printer font tables live in printerFonts.ts; re-exported for existing callers.
export { tsplFontFor } from './printerFonts'

/** Designer (canvas) layouts: every element at its own position, in printer dots. */
function renderFreeLayout(tpl: LabelTemplate, p: PrnPrinter, row: LabelData[], copies: number): string {
  const frame = labelFrame(tpl)
  const k = dotsPerMm(p)
  const dot = (mm: number) => Math.round(mm * k)
  const gap = tpl.gapMm ?? 2
  if (!Number.isFinite(gap) || gap < 0) throw new Error('Invalid gap between labels.')
  const zpl = p.language === 'ZPL'
  const out = zpl ? ['^XA', `^PW${dot(frame.width * tpl.columns + gap * (tpl.columns - 1))}`, `^LL${dot(frame.height)}`, '^CI28'] : [
    `SIZE ${frame.width * tpl.columns + gap * (tpl.columns - 1)} mm, ${frame.height} mm`,
    `GAP ${tpl.mediaMode === 'CONTINUOUS' ? 0 : tpl.rowGapMm ?? 2} mm, 0 mm`, 'DIRECTION 1', 'REFERENCE 0,0', 'CLS',
  ]
  for (let c = 0; c < row.length; c++) {
    const d = row[c]
    const data = { product: d.product, batch: d.batch, shop: d.shop, qrUrl: d.qrUrl }
    const ox = dot(c * (frame.width + gap))
    for (const el of tpl.elements ?? []) {
      const x = ox + dot(el.xMm)
      const y = dot(el.yMm)
      const w = dot(el.wMm)
      const h = dot(el.hMm)
      const shape = shapeOf(el.kind)
      if (shape === 'barcode') {
        const value = barcodeValue(tpl, d.product)
        const ean = tpl.barcodeType === 'EAN13' && !!d.product.eanCode
        try {
          out.push(...fullWidthBarcode(zpl ? 'ZPL' : 'TSPL', value, ean ? 'EAN13' : 'CODE128', x, y, w, h))
        } catch {
          throw new Error(`The barcode box is too narrow for "${value}". Make the barcode wider in the template designer.`)
        }
      } else if (shape === 'qr') {
        if (!QR_ENABLED || !d.qrUrl) continue
        const bytes = new TextEncoder().encode(d.qrUrl).length
        const version = [14, 26, 42, 62, 84, 106, 122, 152, 180, 213].findIndex((capacity) => bytes <= capacity) + 1
        if (!version) throw new Error('QR data is too long. Use a shorter QR URL.')
        const module = Math.max(1, Math.floor(Math.min(w, h) / (17 + 4 * version + 8)))
        if (zpl) out.push(`^FO${x + 4 * module},${y + 4 * module}^BQN,2,${module}^FDMA,${d.qrUrl}^FS`)
        else out.push(`QRCODE ${x + 4 * module},${y + 4 * module},M,${module},A,0,"${d.qrUrl}"`)
      } else {
        const text = elementText(el, data, 'Rs.')
        if (!text) continue
        // Fit with the chosen printer font so long names shrink/wrap/cut inside the box
        // instead of running onto the next label.
        const spec = printerTextSpec(zpl ? 'ZPL' : 'TSPL', el.printerFont, p.dpi)
        const fit = fitText(text, { widthMm: el.wMm, heightMm: el.hMm, fontMm: el.fontMm ?? 2.4, measure: spec.measure })
        const pitch = Math.round(spec.lineDots(fit.fontMm) * 1.15)
        fit.lines.forEach((line, i) => {
          for (const dx of el.bold ? [0, 1] : [0]) out.push(spec.command(x + dx, y + i * pitch, w, line, fit.fontMm, el.align))
        })
      }
    }
  }
  out.push(...(zpl ? [`^PQ${copies},0,1,Y`, '^XZ'] : [`PRINT ${copies},1`]))
  return out.join('\n')
}

/** One row across the roll (a label per column, each with its own data), printed `copies` times. */
function renderRow(tpl: LabelTemplate, printer: PrnPrinter & { language: 'ZPL' | 'TSPL' }, row: LabelData[], copies: number): string {
  if (tpl.elements) return renderFreeLayout(tpl, printer, row, copies)
  if (tpl.marginsMm || tpl.fieldGapMm !== undefined) return renderWithMargins(tpl, printer, row, copies)
  return printer.language === 'ZPL' ? renderZpl(tpl, printer, row, copies) : renderTspl(tpl, printer, row, copies)
}

export const LANGUAGE_LABEL: Record<Printer['language'], string> = { ZPL: 'ZPL (Zebra)', TSPL: 'TSPL (TSC / TVS)', ESCPOS: 'ESC/POS' }

function validate(tpl: LabelTemplate, printer: PrnPrinter, data: LabelData) {
  if (tpl.rowGapMm !== undefined && (!Number.isFinite(tpl.rowGapMm) || tpl.rowGapMm < 0 || tpl.rowGapMm > 25)) throw new Error('Feed gap must be between 0 and 25 mm')
  if (printer.language === 'TSPL' && tpl.mediaMode !== 'CONTINUOUS' && tpl.rowGapMm === 0) throw new Error('Feed gap is 0 mm: this disables gap tracking. Enter the measured row gap for sticker rolls, or explicitly select Continuous media.')
  if (!Number.isInteger(data.quantity) || data.quantity < 1 || data.quantity > 1000) throw new Error('Quantity must be an integer between 1 and 1000')
  if (![1, 2, 3].includes(tpl.columns) || !Number.isFinite(tpl.widthMm) || !Number.isFinite(tpl.heightMm) || tpl.widthMm <= 0 || tpl.heightMm <= 0) throw new Error('Invalid label dimensions')
  // Resident-font PRN cannot safely embed command delimiters supplied as product text.
  const values = [
    ...Object.values(fieldsFor(tpl, data)),
    // Designer text: custom text elements and edited prefixes ("MRP" → "M.R.P.").
    ...(tpl.elements ?? []).flatMap((el) => [el.text, el.prefix]),
  ].filter((v): v is string => typeof v === 'string')
  if (values.some((v) => Array.from(v).some((c) => c.charCodeAt(0) < 32) || (printer.language === 'ZPL' && /[~^]/.test(v)) || (printer.language === 'TSPL' && /["\\]/.test(v)))) {
    throw new Error('Label text contains printer command characters. Remove control characters, quotes/backslashes (TSPL), or ^/~ (ZPL).')
  }
}

/** Complete rows plus an optional partial row; never round quantities up. */
export function renderPrn(tpl: LabelTemplate, printer: PrnPrinter, data: LabelData): string {
  return renderPrnBatch(tpl, printer, [data])
}

/**
 * Several products in one job, packed so no sticker is left blank between them: labels go
 * across the roll in queue order, so on a 2 UP roll "Natraj × 1, Toor dal × 1" shares one
 * row. Identical consecutive rows become a single command with a copy count. Only the very
 * last row can be partly empty.
 */
export function renderPrnBatch(tpl: LabelTemplate, printer: PrnPrinter, items: LabelData[]): string {
  if (!items.length) throw new Error('Nothing to print')
  for (const data of items) validate(tpl, printer, data)
  const lang = printer.language
  if (lang === 'ESCPOS') return items.map((data) => renderEscPos(tpl, printer, data)).join('\n\n')
  // Rows as runs: [item index per column], with how many times the row repeats.
  const runs: { row: number[]; copies: number }[] = []
  const push = (row: number[], copies: number) => {
    const last = runs[runs.length - 1]
    if (last && last.row.length === row.length && last.row.every((v, i) => v === row[i])) last.copies += copies
    else runs.push({ row, copies })
  }
  let pending: number[] = [] // a row being filled from the end of one product and the start of the next
  items.forEach((data, index) => {
    let left = data.quantity
    if (pending.length) {
      const take = Math.min(left, tpl.columns - pending.length)
      pending.push(...Array(take).fill(index))
      left -= take
      if (pending.length === tpl.columns) { push(pending, 1); pending = [] }
    }
    const fullRows = Math.floor(left / tpl.columns)
    if (fullRows) push(Array(tpl.columns).fill(index), fullRows)
    left -= fullRows * tpl.columns
    if (left) pending = Array(left).fill(index)
  })
  if (pending.length) push(pending, 1)
  return runs.map((r) => renderRow(tpl, { ...printer, language: lang }, r.row.map((i) => items[i]), r.copies))
    .join('\r\n').replace(/\r?\n/g, '\r\n') + '\r\n'
}
