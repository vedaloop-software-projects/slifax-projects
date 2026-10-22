// Free ("canvas") label layout: elements placed anywhere on the label, in millimetres.
// The template designer edits these; the screen preview, browser/PDF print and the
// PRN renderers all read the same numbers, so what is designed is what prints.

import type { CSSProperties } from 'react'
import type { LabelElement, LabelElementKind, LabelField, LabelTemplate, Product, ProductBatch, Shop } from '../types'
import { fmtDate } from './dates'
import { LABEL_FONTS, isLabelFont } from './fonts'
import { PRINTER_FONTS, isPrinterFont } from './printerFonts'

export type FrameTemplate = Pick<LabelTemplate, 'widthMm' | 'heightMm' | 'orientation'>

export const PT_PER_MM = 72 / 25.4
export const MIN_FONT_MM = 1.2
export const MAX_FONT_MM = 20
export const MAX_ELEMENTS = 40
export const MAX_TEXT_LENGTH = 80

/** Width × height of one label as drawn (portrait = tall side vertical). */
export function labelFrame(t: FrameTemplate) {
  const portrait = t.orientation === 'PORTRAIT'
  return {
    width: portrait ? Math.min(t.widthMm, t.heightMm) : Math.max(t.widthMm, t.heightMm),
    height: portrait ? Math.max(t.widthMm, t.heightMm) : Math.min(t.widthMm, t.heightMm),
  }
}

type Shape = 'text' | 'barcode' | 'qr'

export const ELEMENT_INFO: Record<LabelElementKind, { label: string; shape: Shape; prefix?: string; fontUnits?: number }> = {
  shopName: { label: 'Shop name', shape: 'text', fontUnits: 2.5 },
  address: { label: 'Address / location', shape: 'text', fontUnits: 2.1 },
  productName: { label: 'Product name', shape: 'text', fontUnits: 3.4 },
  mrp: { label: 'MRP', shape: 'text', prefix: 'MRP', fontUnits: 2.6 },
  salePrice: { label: 'Sale price', shape: 'text', prefix: 'SALE', fontUnits: 2.6 },
  barcode: { label: 'Barcode', shape: 'barcode' },
  productCode: { label: 'Product code', shape: 'text', fontUnits: 2.0 },
  packedDate: { label: 'Packed date', shape: 'text', prefix: 'Packed:', fontUnits: 2.1 },
  expiryDate: { label: 'Expiry date', shape: 'text', prefix: 'Expiry:', fontUnits: 2.1 },
  batchCode: { label: 'Batch code', shape: 'text', prefix: 'Batch:', fontUnits: 2.1 },
  qr: { label: 'QR code', shape: 'qr' },
  text: { label: 'Custom text', shape: 'text', fontUnits: 2.4 },
}

/**
 * QR codes are switched off for now: not offered in the designer, not drawn in previews and
 * not printed, even on templates that already contain one. Set to true to bring them back.
 */
export const QR_ENABLED = false

/** Order the palette lists fields in (also the stacking order of the auto layout). */
export const FIELD_ORDER: LabelField[] = (['shopName', 'address', 'productName', 'mrp', 'salePrice', 'barcode', 'productCode', 'packedDate', 'expiryDate', 'batchCode', 'qr'] as LabelField[])
  .filter((f) => f !== 'qr' || QR_ENABLED)

export const shapeOf = (kind: LabelElementKind): Shape => ELEMENT_INFO[kind].shape

export interface ElementData {
  product: Product
  batch: ProductBatch | null | undefined
  shop: Shop | undefined
  qrUrl: string | undefined
}

export function barcodeValue(template: Pick<LabelTemplate, 'barcodeType'>, product: Product): string {
  return template.barcodeType === 'EAN13' && product.eanCode ? product.eanCode : product.variantCode || product.productCode
}

const round1 = (n: number) => Math.round(n * 10) / 10
/** Round down to 0.1 mm (tiny epsilon so 24.999999 stays 25). */
const floor1 = (n: number) => Math.floor(n * 10 + 1e-6) / 10

/**
 * Thermal printers' built-in fonts have no ₹ glyph, so labels print "Rs."; the screen shows
 * the same so the design matches the printed label.
 */
export const CURRENCY = 'Rs.'

/** Printed text of a text element, or null when there is nothing to print (e.g. no batch). */
export function elementText(el: LabelElement, d: ElementData, currency = CURRENCY): string | null {
  const pre = (fallback: string) => (el.prefix ?? fallback).trim()
  const join = (a: string, b: string) => (a ? `${a} ${b}` : b)
  const packed = d.batch?.packedDate ?? d.product.packedDate
  const expiry = d.batch ? d.batch.expiryDate : d.product.expiryDate
  switch (el.kind) {
    case 'shopName': return d.shop?.name ?? null
    case 'address': return d.shop?.location ?? null
    case 'productName': return d.product.name
    case 'mrp': return join(pre('MRP'), `${currency}${d.product.mrp}`)
    case 'salePrice': return join(pre('SALE'), `${currency}${d.product.salePrice}`)
    case 'productCode': return d.product.productCode
    case 'packedDate': return packed ? join(pre('Packed:'), fmtDate(packed, true)) : null
    case 'expiryDate': return expiry ? join(pre('Expiry:'), fmtDate(expiry, true)) : null
    case 'batchCode': return d.batch ? join(pre('Batch:'), d.batch.batchCode) : null
    case 'text': return el.text?.trim() || null
    default: return null
  }
}

let seq = 0
export function newElementId(): string {
  seq = (seq + 1) % 1e6
  return `el_${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/** Keep an element inside the label and above a usable minimum size. */
export function clampElement(el: LabelElement, frame: { width: number; height: number }): LabelElement {
  const shape = shapeOf(el.kind)
  const fontMm = shape === 'text' ? Math.min(MAX_FONT_MM, Math.max(MIN_FONT_MM, el.fontMm ?? 2.4)) : undefined
  const minW = shape === 'barcode' ? 8 : shape === 'qr' ? 4 : 3
  const minH = shape === 'text' ? fontMm! * 1.05 : shape === 'barcode' ? 2 : 4
  // Round the size first, then fit the position to the rounded size, so the box can
  // never end a fraction past the edge.
  let wMm = floor1(Math.min(frame.width, Math.max(minW, el.wMm)))
  let hMm = floor1(Math.min(frame.height, Math.max(minH, el.hMm)))
  if (shape === 'qr') wMm = hMm = Math.min(wMm, hMm)
  const xMm = Math.min(floor1(frame.width - wMm), Math.max(0, round1(el.xMm)))
  const yMm = Math.min(floor1(frame.height - hMm), Math.max(0, round1(el.yMm)))
  return { ...el, xMm, yMm, wMm, hMm, ...(fontMm !== undefined ? { fontMm: round1(fontMm) } : {}) }
}

/** A new element of `kind`, centred on `at` (mm) when dropped, else near the top-left. */
export function defaultElement(kind: LabelElementKind, frame: { width: number; height: number }, at?: { xMm: number; yMm: number }): LabelElement {
  const unit = frame.height / 25
  const shape = shapeOf(kind)
  let el: LabelElement
  if (shape === 'barcode') {
    const w = Math.min(frame.width - 2, Math.max(20, frame.width * 0.7))
    el = { id: newElementId(), kind, xMm: 1, yMm: 1, wMm: w, hMm: Math.max(4, Math.min(12, frame.height * 0.35)) }
  } else if (shape === 'qr') {
    const side = Math.max(6, Math.min(frame.height - 2, frame.width * 0.35, 18))
    el = { id: newElementId(), kind, xMm: 1, yMm: 1, wMm: side, hMm: side }
  } else {
    const fontMm = round1(Math.max(1.6, unit * (ELEMENT_INFO[kind].fontUnits ?? 2.4)))
    el = { id: newElementId(), kind, xMm: 1, yMm: 1, wMm: Math.max(10, frame.width * 0.6), hMm: fontMm * 1.3, fontMm, align: 'left', ...(kind === 'text' ? { text: 'Your text' } : {}) }
  }
  if (at) el = { ...el, xMm: at.xMm - el.wMm / 2, yMm: at.yMm - el.hMm / 2 }
  return clampElement(el, frame)
}

/**
 * Turns the classic stacked layout (fields switched on/off) into positioned elements,
 * close to how the old renderer drew it. Used for templates designed before the canvas
 * editor and by "Auto arrange".
 */
export function autoLayout(t: Pick<LabelTemplate, 'widthMm' | 'heightMm' | 'orientation' | 'fields' | 'marginsMm'>): LabelElement[] {
  const frame = labelFrame(t)
  const f = { ...t.fields, qr: t.fields.qr && QR_ENABLED }
  const inset = (frame.height / 25) * 1.1
  const m = t.marginsMm ?? { top: inset, right: inset, bottom: inset, left: inset }
  const left = m.left
  const top = m.top
  const contentW = Math.max(10, frame.width - m.left - m.right)
  const contentH = Math.max(6, frame.height - m.top - m.bottom)
  const portrait = t.orientation === 'PORTRAIT'

  const qrSide = f.qr ? Math.min(contentH * (portrait ? 0.34 : 0.52), contentW * 0.34) : 0
  const textW = f.qr && !portrait ? contentW - qrSide - 1 : contentW

  type Row = { cells: LabelElementKind[]; units: number; barcode?: boolean }
  const rows: Row[] = []
  if (f.shopName) rows.push({ cells: ['shopName'], units: 2.5 })
  if (f.address) rows.push({ cells: ['address'], units: 2.1 })
  if (f.productName) rows.push({ cells: ['productName'], units: 3.4 })
  const prices = (['mrp', 'salePrice'] as const).filter((k) => f[k])
  if (prices.length) rows.push({ cells: [...prices], units: 2.6 })
  if (f.barcode) rows.push({ cells: ['barcode'], units: 0, barcode: true })
  if (f.productCode) rows.push({ cells: ['productCode'], units: 2.0 })
  const dates = (['packedDate', 'expiryDate', 'batchCode'] as const).filter((k) => f[k])
  if (dates.length) rows.push({ cells: [...dates], units: 2.1 })

  const qrBelow = f.qr && portrait ? qrSide + 1 : 0
  const textUnits = rows.reduce((s, r) => s + r.units * 1.25, 0)
  const minBarcode = f.barcode ? Math.max(4, contentH * 0.28) : 0
  // One "unit" is sized so every text row plus a usable barcode fits the content height.
  const unit = Math.min(frame.height / 25, textUnits ? (contentH - qrBelow - minBarcode) / textUnits : frame.height / 25)
  const barcodeH = f.barcode ? Math.max(minBarcode, contentH - qrBelow - textUnits * unit) : 0

  const out: LabelElement[] = []
  let y = top
  for (const row of rows) {
    const h = row.barcode ? barcodeH : row.units * unit * 1.25
    const cellW = textW / row.cells.length
    row.cells.forEach((kind, i) => {
      const base: LabelElement = { id: newElementId(), kind, xMm: left + cellW * i, yMm: y, wMm: cellW - (i < row.cells.length - 1 ? 0.5 : 0), hMm: h }
      out.push(row.barcode ? base : { ...base, fontMm: Math.max(MIN_FONT_MM, row.units * unit), bold: kind !== 'address' && kind !== 'productCode' && !['packedDate', 'expiryDate', 'batchCode'].includes(kind), align: kind === 'shopName' || kind === 'address' || kind === 'productCode' ? 'center' : 'left' })
    })
    y += h
  }
  if (f.qr) {
    out.push(portrait
      ? { id: newElementId(), kind: 'qr', xMm: left + (contentW - qrSide) / 2, yMm: top + contentH - qrSide, wMm: qrSide, hMm: qrSide }
      : { id: newElementId(), kind: 'qr', xMm: left + contentW - qrSide, yMm: top + (contentH - qrSide) / 2, wMm: qrSide, hMm: qrSide })
  }
  return out.map((el) => clampElement(el, frame))
}

/** Field switches follow the elements on the canvas (other code still reads `fields`). */
export function fieldsFromElements(elements: LabelElement[], base: Record<LabelField, boolean>): Record<LabelField, boolean> {
  const present = new Set(elements.map((e) => e.kind))
  return Object.fromEntries(Object.keys(base).map((k) => [k, present.has(k as LabelField)])) as Record<LabelField, boolean>
}

/** Resize the whole design with the label (size or orientation change). */
export function scaleElements(elements: LabelElement[], from: { width: number; height: number }, to: { width: number; height: number }): LabelElement[] {
  const sx = to.width / from.width
  const sy = to.height / from.height
  const sf = Math.min(sx, sy)
  return elements.map((el) =>
    clampElement({ ...el, xMm: el.xMm * sx, yMm: el.yMm * sy, wMm: el.wMm * sx, hMm: el.hMm * sy, ...(el.fontMm !== undefined ? { fontMm: el.fontMm * sf } : {}) }, to),
  )
}

/** Rejects designs that cannot print: off-label elements, odd sizes, risky text. */
export function validateElements(t: FrameTemplate & { elements?: LabelElement[] }) {
  const els = t.elements
  if (!els) return
  if (els.length > MAX_ELEMENTS) throw new Error(`A label can hold at most ${MAX_ELEMENTS} elements.`)
  const frame = labelFrame(t)
  const tol = 0.05
  for (const el of els) {
    if (!(el.kind in ELEMENT_INFO)) throw new Error('Unknown element on the label.')
    const nums = [el.xMm, el.yMm, el.wMm, el.hMm]
    if (!nums.every((n) => Number.isFinite(n)) || el.wMm <= 0 || el.hMm <= 0) throw new Error(`${ELEMENT_INFO[el.kind].label} has an invalid size.`)
    if (el.xMm < -tol || el.yMm < -tol || el.xMm + el.wMm > frame.width + tol || el.yMm + el.hMm > frame.height + tol) {
      throw new Error(`${ELEMENT_INFO[el.kind].label} sticks out of the label. Move it inside the edges.`)
    }
    if (shapeOf(el.kind) === 'text' && (el.fontMm === undefined || el.fontMm < MIN_FONT_MM - tol || el.fontMm > MAX_FONT_MM + tol)) {
      throw new Error(`${ELEMENT_INFO[el.kind].label}: text size must be between ${Math.round(MIN_FONT_MM * PT_PER_MM)} and ${Math.round(MAX_FONT_MM * PT_PER_MM)} pt.`)
    }
    if (el.fontFamily !== undefined && !isLabelFont(el.fontFamily)) {
      throw new Error(`${ELEMENT_INFO[el.kind].label}: choose one of ${LABEL_FONTS.map((f) => f.label).join(', ')}.`)
    }
    if (el.printerFont !== undefined && !isPrinterFont(el.printerFont)) {
      throw new Error(`${ELEMENT_INFO[el.kind].label}: printer font must be one of ${PRINTER_FONTS.map((f) => f.label).join(', ')}.`)
    }
    for (const s of [el.text, el.prefix]) {
      if (s !== undefined && s.length > MAX_TEXT_LENGTH) throw new Error(`Text on the label is limited to ${MAX_TEXT_LENGTH} characters.`)
    }
  }
}

/** Style for one element positioned in mm (`k` = units per mm, `uom` = px or mm). */
export function elementBox(el: Pick<LabelElement, 'xMm' | 'yMm' | 'wMm' | 'hMm'>, k: number, uom: string): CSSProperties {
  return { position: 'absolute', left: `${el.xMm * k}${uom}`, top: `${el.yMm * k}${uom}`, width: `${el.wMm * k}${uom}`, height: `${el.hMm * k}${uom}` }
}
