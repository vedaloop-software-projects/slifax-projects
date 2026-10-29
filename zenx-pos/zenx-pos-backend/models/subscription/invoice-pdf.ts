import PDFDocument from 'pdfkit'
import type { Letterhead } from '../documents/letterhead.ts'
import { bodyArea, drawLetterhead } from '../documents/render.ts'

export type InvoiceDocument = {
  number: string; date: string; generatedAt: string
  buyer: { name: string; contact: string; address: string; gstin: string | null; mobile: string; email: string }
  description: string; detail: string
  taxable: number; gstPercent: number; gstAmount: number; total: number
  paymentMode: string; reference: string | null
}

// Standard PDF fonts have no rupee glyph, so amounts are printed as "INR 1,234.00".
const inr = (value: number) => `INR ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const MUTED = '#667085', LINE = '#D0D5DD'

// Rendered on request for download or email; invoices are never stored as files. The
// seller's identity comes from the letterhead designed in super admin.
export function renderInvoicePdf(invoice: InvoiceDocument, letterhead: Letterhead): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `Invoice ${invoice.number}`, Author: letterhead.company.name } })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.on('pageAdded', () => drawLetterhead(doc, letterhead))
    drawLetterhead(doc, letterhead)
    const NAVY = letterhead.accent, area = bodyArea(letterhead)
    const left = 42, right = doc.page.width - 42, width = right - left
    let y = area.top

    doc.font('Helvetica-Bold').fontSize(16).fillColor('#101828').text(letterhead.company.gstin ? 'TAX INVOICE' : 'INVOICE', left, y, { width: width / 2 })
    doc.font('Helvetica').fontSize(10).fillColor('#344054')
    doc.text(`Invoice no: ${invoice.number}`, left, y, { width, align: 'right' })
    doc.text(`Invoice date: ${invoice.date}`, { width, align: 'right' })

    y += 40
    doc.moveTo(left, y).lineTo(right, y).strokeColor(LINE).lineWidth(0.8).stroke()
    y += 14
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text('BILLED TO', left, y)
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#101828').text(invoice.buyer.name, left, y + 16)
    doc.font('Helvetica').fontSize(9).fillColor('#344054')
    for (const line of [invoice.buyer.contact, invoice.buyer.address, invoice.buyer.gstin ? `GSTIN: ${invoice.buyer.gstin}` : '', `${invoice.buyer.mobile} · ${invoice.buyer.email}`].filter(Boolean)) doc.text(line, { width: width * 0.6 })
    const billedEnd = doc.y
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text('PAYMENT', left + width * 0.65, y)
    doc.font('Helvetica').fontSize(9).fillColor('#344054')
    doc.text(`Mode: ${invoice.paymentMode}`, left + width * 0.65, y + 16, { width: width * 0.35 })
    if (invoice.reference) doc.text(`Reference: ${invoice.reference}`, { width: width * 0.35 })
    doc.text('Status: Paid', { width: width * 0.35 })

    y = Math.max(billedEnd, doc.y) + 22
    const columns = [{ label: 'Description', x: left, w: width * 0.46, align: 'left' as const }, { label: 'Taxable value', x: left + width * 0.46, w: width * 0.18, align: 'right' as const },
      { label: `GST ${invoice.gstPercent}%`, x: left + width * 0.64, w: width * 0.16, align: 'right' as const }, { label: 'Amount', x: left + width * 0.8, w: width * 0.2, align: 'right' as const }]
    doc.rect(left, y, width, 24).fill('#EEF3F9')
    doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY)
    for (const column of columns) doc.text(column.label, column.x + 6, y + 8, { width: column.w - 12, align: column.align })
    y += 32
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#101828').text(invoice.description, columns[0]!.x + 6, y, { width: columns[0]!.w - 12 })
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(invoice.detail, { width: columns[0]!.w - 12 })
    doc.font('Helvetica').fontSize(10).fillColor('#101828')
    doc.text(inr(invoice.taxable), columns[1]!.x + 6, y, { width: columns[1]!.w - 12, align: 'right' })
    doc.text(inr(invoice.gstAmount), columns[2]!.x + 6, y, { width: columns[2]!.w - 12, align: 'right' })
    doc.text(inr(invoice.total), columns[3]!.x + 6, y, { width: columns[3]!.w - 12, align: 'right' })
    y += 46
    doc.moveTo(left, y).lineTo(right, y).strokeColor(LINE).lineWidth(0.8).stroke()

    y += 12
    const totals: Array<[string, number, boolean]> = [['Taxable value', invoice.taxable, false], [`GST (${invoice.gstPercent}%)`, invoice.gstAmount, false], ['Total paid', invoice.total, true]]
    for (const [label, value, strong] of totals) {
      doc.font(strong ? 'Helvetica-Bold' : 'Helvetica').fontSize(strong ? 12 : 10).fillColor(strong ? NAVY : '#344054')
      doc.text(label, left + width * 0.5, y, { width: width * 0.28, align: 'right' })
      doc.text(inr(value), left + width * 0.78, y, { width: width * 0.22, align: 'right' })
      y += strong ? 22 : 18
    }

    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
      .text(`This is a computer-generated invoice and does not need a signature. Generated on ${invoice.generatedAt}.`, left, area.bottom - 12, { width, align: 'center', lineBreak: false })
    doc.end()
  })
}
