import type PDFDocument from 'pdfkit'
import { PAGE, elementText, type Band, type Letterhead } from './letterhead.ts'

export const PT_PER_MM = 72 / 25.4
export const pt = (mm: number) => mm * PT_PER_MM
type Doc = InstanceType<typeof PDFDocument>

/** Space left for the document body, in points, between the header and footer bands. */
export function bodyArea(letterhead: Letterhead) {
  return { top: pt(letterhead.headerMm) + 14, bottom: pt(PAGE.heightMm - letterhead.footerMm) - 10 }
}

function drawBand(doc: Doc, letterhead: Letterhead, band: Band) {
  const originY = band === 'header' ? 0 : PAGE.heightMm - letterhead.footerMm
  for (const element of letterhead.elements.filter(item => item.band === band)) {
    const x = pt(element.xMm), y = pt(originY + element.yMm), w = pt(element.wMm), h = pt(element.hMm)
    doc.save()
    if (element.kind === 'image' && element.src) {
      const data = Buffer.from(element.src.slice(element.src.indexOf(',') + 1), 'base64')
      try { doc.image(data, x, y, { fit: [w, h], align: element.align === 'right' ? 'right' : element.align === 'center' ? 'center' : undefined, valign: 'center' }) } catch { /* unreadable image: skip it */ }
    } else if (element.kind === 'line') {
      doc.lineWidth(pt(element.strokeMm ?? 0.3)).strokeColor(element.stroke ?? letterhead.accent)
      // A line is drawn along the longer side of its box.
      if (w >= h) doc.moveTo(x, y + h / 2).lineTo(x + w, y + h / 2).stroke()
      else doc.moveTo(x + w / 2, y).lineTo(x + w / 2, y + h).stroke()
    } else if (element.kind === 'rect') {
      const radius = pt(element.radiusMm ?? 0)
      const shape = () => radius ? doc.roundedRect(x, y, w, h, radius) : doc.rect(x, y, w, h)
      if (element.fill) shape().fill(element.fill)
      if (element.stroke && (element.strokeMm ?? 0) > 0) { shape(); doc.lineWidth(pt(element.strokeMm!)).strokeColor(element.stroke).stroke() }
    } else {
      const text = elementText(letterhead, element)
      if (text) {
        const size = pt(element.fontMm ?? 3.5)
        doc.font(element.bold ? (element.italic ? 'Helvetica-BoldOblique' : 'Helvetica-Bold') : element.italic ? 'Helvetica-Oblique' : 'Helvetica').fontSize(size).fillColor(element.color ?? '#101828')
          .text(text, x, y + Math.max(0, (h - doc.heightOfString(text, { width: w })) / 2), { width: w, height: h, align: element.align ?? 'left', ellipsis: true, lineGap: 0 })
      }
    }
    doc.restore()
  }
}

/** Draws the header and footer on the current page. Call it for every page. */
export function drawLetterhead(doc: Doc, letterhead: Letterhead) {
  const { x, y } = { x: doc.x, y: doc.y }
  drawBand(doc, letterhead, 'header')
  if (letterhead.footerMm > 0) drawBand(doc, letterhead, 'footer')
  doc.x = x; doc.y = y
}
