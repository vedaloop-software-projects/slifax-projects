import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

/**
 * Turns rendered label rows into a PDF whose pages are exactly the label size,
 * so it prints 1:1 (or can be handed to a print shop).
 * Each row is rasterised at ~6× CSS pixels ≈ 570 dpi, which keeps barcodes sharp.
 */
export async function pagesToPdf(pages: HTMLElement[], pageWmm: number, pageHmm: number, filename: string, pixelRatio = 6) {
  if (!pages.length) throw new Error('Nothing to export')
  const orientation = pageWmm >= pageHmm ? 'landscape' : 'portrait'
  const doc = new jsPDF({ unit: 'mm', format: [pageWmm, pageHmm], orientation, compress: true })
  // Read the size back from jsPDF so we honour whatever it did with orientation.
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()

  for (let i = 0; i < pages.length; i++) {
    // skipFonts: labels use system Arial, and fetching Google Fonts CSS would trip CORS.
    const dataUrl = await toPng(pages[i], { pixelRatio, backgroundColor: '#ffffff', skipFonts: true })
    if (i > 0) doc.addPage([pageWmm, pageHmm], orientation)
    doc.addImage(dataUrl, 'PNG', 0, 0, w, h, undefined, 'FAST')
  }
  doc.save(filename)
}

export function pdfFilename(parts: (string | undefined)[]): string {
  const slug = parts
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'labels'}-${new Date().toISOString().slice(0, 10)}.pdf`
}
