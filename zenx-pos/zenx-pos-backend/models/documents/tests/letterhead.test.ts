import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deflateSync } from 'node:zlib'
import { DEFAULT_LETTERHEAD, elementText, parseLetterhead, type Letterhead } from '../letterhead.ts'
import { renderInvoicePdf } from '../../subscription/invoice-pdf.ts'

// A real 2x2 PNG so pdfkit's image decoder is exercised.
function png() {
  const crc = (buffer: Buffer) => { let c = ~0; for (const byte of buffer) { c ^= byte; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1 } return ~c >>> 0 }
  const chunk = (type: string, data: Buffer) => { const body = Buffer.concat([Buffer.from(type), data]), out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); body.copy(out, 4); out.writeUInt32BE(crc(body), 8 + data.length); return out }
  const header = Buffer.alloc(13); header.writeUInt32BE(2, 0); header.writeUInt32BE(2, 4); header[8] = 8; header[9] = 2
  const pixels = deflateSync(Buffer.from([0, 38, 75, 121, 38, 75, 121, 0, 38, 75, 121, 38, 75, 121]))
  return `data:image/png;base64,${Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', pixels), chunk('IEND', Buffer.alloc(0))]).toString('base64')}`
}
const designed = (): Letterhead => ({
  ...DEFAULT_LETTERHEAD,
  company: { name: 'Slifax Technologies', address: 'Hitech City, Hyderabad', gstin: '36abcde1234f1z5', email: 'billing@slifax.example', phone: '+91 90000 00000', website: 'zenxpos.com' },
  elements: [
    { id: 'band', band: 'header', kind: 'rect', xMm: 0, yMm: 0, wMm: 210, hMm: 6, fill: '#264B79' },
    { id: 'logo', band: 'header', kind: 'image', xMm: 15, yMm: 9, wMm: 20, hMm: 20, src: png() },
    { id: 'name', band: 'header', kind: 'companyName', xMm: 40, yMm: 10, wMm: 100, hMm: 9, fontMm: 6, bold: true },
    { id: 'gst', band: 'header', kind: 'companyGstin', xMm: 40, yMm: 20, wMm: 100, hMm: 5, fontMm: 3, prefix: 'GSTIN: ' },
    { id: 'rule', band: 'footer', kind: 'line', xMm: 15, yMm: 1, wMm: 180, hMm: 1, stroke: '#D0D5DD', strokeMm: 0.3 },
    { id: 'web', band: 'footer', kind: 'companyWebsite', xMm: 15, yMm: 4, wMm: 180, hMm: 6, fontMm: 3, align: 'center' },
  ],
})

test('the built-in letterhead is valid and company fields resolve with their prefix', () => {
  assert.equal(parseLetterhead(DEFAULT_LETTERHEAD).success, true)
  const parsed = parseLetterhead(designed())
  assert.equal(parsed.success, true)
  const letterhead = parsed.success ? parsed.data : DEFAULT_LETTERHEAD
  assert.equal(letterhead.company.gstin, '36ABCDE1234F1Z5')
  assert.equal(elementText(letterhead, letterhead.elements[3]!), 'GSTIN: 36ABCDE1234F1Z5')
  assert.equal(elementText({ ...letterhead, company: { ...letterhead.company, gstin: '' } }, letterhead.elements[3]!), '')
})

test('letterhead validation rejects elements outside their band, bad images and bad colours', () => {
  const base = designed()
  const outside = parseLetterhead({ ...base, elements: [{ ...base.elements[2]!, yMm: base.headerMm - 2 }] })
  assert.equal(outside.success, false)
  assert.match(outside.success ? '' : outside.error.issues[0]!.message, /outside the header/)
  assert.equal(parseLetterhead({ ...base, elements: [{ ...base.elements[1]!, src: 'data:image/svg+xml;base64,PHN2Zz4=' }] }).success, false)
  assert.equal(parseLetterhead({ ...base, accent: 'blue' }).success, false)
  assert.equal(parseLetterhead({ ...base, elements: Array.from({ length: 4 }, (_, index) => ({ ...base.elements[1]!, id: `logo${index}` })) }).success, false)
})

test('invoices render with a designed letterhead including images, shapes and footer', async () => {
  const pdf = await renderInvoicePdf({ number: 'REN-1', date: '20-10-2026', generatedAt: '20-10-2026', buyer: { name: 'Store', contact: 'Owner', address: 'Hyderabad', gstin: null, mobile: '9876543210', email: 'o@example.com' },
    description: 'ZenxPOS yearly subscription', detail: '12 months', taxable: 100, gstPercent: 18, gstAmount: 18, total: 118, paymentMode: 'Cash', reference: null }, designed())
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-')
  assert.match(pdf.toString('latin1'), /\/Subtype \/Image/)
  assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length, 1)
})
