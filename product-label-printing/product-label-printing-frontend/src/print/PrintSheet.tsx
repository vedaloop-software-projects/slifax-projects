// Browser printing (no backend, no print agent).
// Renders the queued labels at true millimetre size into a print-only DOM node and
// calls window.print(), so the job goes out through the installed printer driver.

import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { LabelTemplate, Product, ProductBatch, Shop } from '../types'
import { Label } from '../components/LabelPreview'

export interface PrintSheetItem {
  product: Product
  batch: ProductBatch | null
  shop: Shop | undefined
  qrUrl: string
  quantity: number
}

export interface PrintSheetSpec {
  template: LabelTemplate
  items: PrintSheetItem[]
  /** Physical gap between labels across the liner (mm). */
  gapMm?: number
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * One "page" = one row across the liner (1UP/2UP/3UP), so the page size matches
 * the label stock exactly and the driver does not scale or add margins.
 */
export function PrintSheet({ spec, onDone }: { spec: PrintSheetSpec | null; onDone: () => void }) {
  const pages = useMemo(() => {
    if (!spec) return []
    const flat = spec.items.flatMap((it) => Array.from({ length: it.quantity }, () => it))
    return chunk(flat, spec.template.columns)
  }, [spec])

  // Let fonts, barcodes and QR codes paint, then open the print dialog.
  useEffect(() => {
    if (!spec) return
    let cancelled = false
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      onDone()
    }
    const run = async () => {
      try {
        await document.fonts?.ready
      } catch {
        /* older browsers */
      }
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      if (cancelled) return
      window.addEventListener('afterprint', finish, { once: true })
      window.print() // blocks until the dialog closes in Chrome
      finish()
    }
    void run()
    return () => {
      cancelled = true
      window.removeEventListener('afterprint', finish)
    }
  }, [spec, onDone])

  if (!spec) return null

  const { template } = spec
  const portrait = template.orientation === 'PORTRAIT'
  const wMm = portrait ? Math.min(template.widthMm, template.heightMm) : Math.max(template.widthMm, template.heightMm)
  const hMm = portrait ? Math.max(template.widthMm, template.heightMm) : Math.min(template.widthMm, template.heightMm)
  const gap = spec.gapMm ?? 2
  const pageW = wMm * template.columns + gap * (template.columns - 1)

  return createPortal(
    <div id="print-root">
      {/* @page must be a real stylesheet rule — it cannot come from inline styles. */}
      <style>{`@page { size: ${pageW}mm ${hMm}mm; margin: 0; }`}</style>
      {pages.map((row, i) => (
        <div key={i} className="print-page" style={{ width: `${pageW}mm`, height: `${hMm}mm`, gap: `${gap}mm` }}>
          {row.map((it, j) => (
            <Label key={j} physical template={template} product={it.product} batch={it.batch} shop={it.shop} qrUrl={it.qrUrl} />
          ))}
        </div>
      ))}
    </div>,
    document.body,
  )
}
