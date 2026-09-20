// PRN rendering layer (§9): Product data → Label template → Printer profile → PRN.
// Data stays printer-independent; each printer language gets its own renderer.

import type { LabelTemplate, Printer, Product, ProductBatch, Shop } from '../types'
import { fmtDate } from './dates'

export interface LabelData {
  product: Product
  batch: ProductBatch | null
  shop: Shop | undefined
  qrUrl: string
  quantity: number
}

const dotsPerMm = (p: Printer) => (p.dpi === 300 ? 12 : 8)
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
    barcode: f.barcode ? (tpl.barcodeType === 'EAN13' && d.product.eanCode ? d.product.eanCode : d.product.productCode) : null,
    productCode: f.productCode ? d.product.productCode : null,
    packed: f.packedDate ? `Packed: ${fmtDate(packed, true)}` : null,
    expiry: f.expiryDate && expiry ? `Expiry: ${fmtDate(expiry, true)}` : null,
    batch: f.batchCode && d.batch ? `Batch: ${d.batch.batchCode}` : null,
    qr: f.qr ? d.qrUrl : null,
  }
}

function renderZpl(tpl: LabelTemplate, p: Printer, d: LabelData): string {
  const k = dotsPerMm(p)
  const w = tpl.widthMm * k
  const h = tpl.heightMm * k
  const x = fieldsFor(tpl, d)
  const out: string[] = ['^XA', `^PW${w * tpl.columns}`, `^LL${h}`, '^CI28']
  for (let c = 0; c < tpl.columns; c++) {
    const ox = c * w + 12
    let y = 10
    const line = (text: string | null, size = 22) => {
      if (!text) return
      out.push(`^FO${ox},${y}^A0N,${size},${size}^FD${text}^FS`)
      y += size + 4
    }
    line(x.shopName, 20)
    line(x.address, 16)
    line(x.productName, 26)
    if (x.mrp || x.salePrice) line([x.mrp, x.salePrice].filter(Boolean).join('  '), 22)
    if (x.barcode) {
      out.push(tpl.barcodeType === 'EAN13' && d.product.eanCode ? `^FO${ox},${y}^BY2^BEN,40,Y,N^FD${x.barcode.slice(0, 12)}^FS` : `^FO${ox},${y}^BY2^BCN,40,Y,N,N^FD${x.barcode}^FS`)
      y += 64
    }
    line(x.packed, 18)
    line(x.expiry, 18)
    line(x.batch, 18)
    if (x.qr) out.push(`^FO${ox + w - 110},${10}^BQN,2,3^FDQA,${x.qr}^FS`)
  }
  out.push(`^PQ${Math.ceil(d.quantity / tpl.columns)},0,1,Y`, '^XZ')
  return out.join('\n')
}

function renderTspl(tpl: LabelTemplate, p: Printer, d: LabelData): string {
  const k = dotsPerMm(p)
  const w = tpl.widthMm * k
  const x = fieldsFor(tpl, d)
  const out: string[] = [
    `SIZE ${tpl.widthMm * tpl.columns} mm, ${tpl.heightMm} mm`,
    'GAP 2 mm, 0 mm',
    'DIRECTION 1',
    'REFERENCE 0,0',
    'CLS',
  ]
  for (let c = 0; c < tpl.columns; c++) {
    const ox = c * w + 12
    let y = 10
    const text = (t: string | null, font = '2', step = 26) => {
      if (!t) return
      out.push(`TEXT ${ox},${y},"${font}",0,1,1,"${t.replaceAll('"', "'")}"`)
      y += step
    }
    text(x.shopName, '2', 22)
    text(x.address, '1', 18)
    text(x.productName, '3', 30)
    if (x.mrp || x.salePrice) text([x.mrp, x.salePrice].filter(Boolean).join('  '), '2', 26)
    if (x.barcode) {
      out.push(`BARCODE ${ox},${y},"${tpl.barcodeType === 'EAN13' && d.product.eanCode ? 'EAN13' : '128'}",40,1,0,2,2,"${x.barcode}"`)
      y += 66
    }
    text(x.packed, '1', 20)
    text(x.expiry, '1', 20)
    text(x.batch, '1', 20)
    if (x.qr) out.push(`QRCODE ${ox + w - 110},10,M,3,A,0,"${x.qr}"`)
  }
  out.push(`PRINT ${Math.ceil(d.quantity / tpl.columns)},1`)
  return out.join('\n')
}

function renderEscPos(tpl: LabelTemplate, _p: Printer, d: LabelData): string {
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

export function renderPrn(tpl: LabelTemplate, printer: Printer, data: LabelData): string {
  switch (printer.language) {
    case 'ZPL':
      return renderZpl(tpl, printer, data)
    case 'TSPL':
      return renderTspl(tpl, printer, data)
    case 'ESCPOS':
      return renderEscPos(tpl, printer, data)
  }
}

export const LANGUAGE_LABEL: Record<Printer['language'], string> = { ZPL: 'ZPL (Zebra)', TSPL: 'TSPL (TSC / TVS)', ESCPOS: 'ESC/POS' }
