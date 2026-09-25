// Browser printing and PDF export (no backend, no print agent).
// Renders labels at true millimetre size into an off-screen sheet, then either calls
// window.print() — so the job goes out through the installed printer driver — or
// rasterises the same sheet into an exact-size PDF.
//
// Page setup matters more than anything else here: if the page is wider than the
// paper the driver has, Chrome rotates and shrinks the content to make it fit,
// which is why labels come out sideways. `pageMode` lets the page match the stock.

import { useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { App as AntApp } from 'antd'
import type { LabelTemplate, Product, ProductBatch, Shop } from '../types'
import { Label } from '../components/LabelPreview'
import { watchPrintDialog } from './browserPrint'
import { pagesToPdf } from './labelPdf'
import { sheetGeometry, type PrintSetup } from './geometry'

export type { PageMode, PrintSetup, Rotation } from './geometry'

export interface PrintSheetItem {
  product: Product
  batch: ProductBatch | null
  shop: Shop | undefined
  qrUrl: string
  quantity: number
}

export interface PrintSheetSpec extends PrintSetup {
  template: LabelTemplate
  items: PrintSheetItem[]
}

export interface SheetRequest {
  spec: PrintSheetSpec
  mode: 'print' | 'pdf'
  filename?: string
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export function PrintSheet({ request, onDone }: { request: SheetRequest | null; onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const { message } = AntApp.useApp()

  const geo = request ? sheetGeometry(request.spec.template, request.spec) : null

  const pages = useMemo(() => {
    if (!request || !geo) return []
    const flat = request.spec.items.flatMap((it) => Array.from({ length: it.quantity }, () => it))
    return chunk(flat, geo.perPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, geo?.perPage])

  useEffect(() => {
    if (!request || !geo) return
    let cancelled = false
    let finished = false
    let stopWatching: (() => void) | undefined
    const finish = () => {
      if (cancelled || finished) return
      finished = true
      onDone()
    }

    const run = async () => {
      try {
        await document.fonts?.ready
      } catch {
        /* older browsers */
      }
      // Two frames so barcodes/QR codes are painted before we capture or print.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      if (cancelled) return

      if (request.mode === 'pdf') {
        const nodes = [...(rootRef.current?.querySelectorAll<HTMLElement>('.print-page') ?? [])]
        try {
          await pagesToPdf(nodes, geo.pageW, geo.pageH, request.filename ?? 'labels.pdf')
          message.success(`PDF saved — ${nodes.length} page${nodes.length === 1 ? '' : 's'} of ${geo.pageW.toFixed(1)}×${geo.pageH.toFixed(1)}mm`)
        } catch (e) {
          message.error(`Could not create the PDF: ${(e as Error).message}`)
        }
        finish()
        return
      }

      // Keep the sheet mounted until the dialog closes, or the print comes out blank.
      stopWatching = watchPrintDialog(window, finish)
      try {
        window.print()
      } catch (e) {
        stopWatching()
        message.error(`Could not open printing: ${(e as Error).message}`)
        finish()
      }
    }

    void run()
    return () => {
      cancelled = true
      stopWatching?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, onDone, message])

  if (!request || !geo) return null

  const { template } = request.spec
  const { contentW, contentH, pageW, pageH, gap, rotate } = geo
  const dx = request.spec.offsetXMm ?? 0
  const dy = request.spec.offsetYMm ?? 0

  return createPortal(
    <div id="print-root" ref={rootRef}>
      {/* @page must be a real stylesheet rule — it cannot come from inline styles. */}
      <style>{`@page { size: ${pageW}mm ${pageH}mm; margin: 0; }`}</style>
      {pages.map((row, i) => (
        <div key={i} className="print-page" style={{ width: `${pageW}mm`, height: `${pageH}mm` }}>
          <div
            className="print-row"
            style={{
              width: `${contentW}mm`,
              height: `${contentH}mm`,
              gap: `${gap}mm`,
              // Centre the block on the page, then rotate/nudge about that centre.
              transform: `translate(-50%, -50%) translate(${dx}mm, ${dy}mm) rotate(${rotate}deg)`,
            }}
          >
            {row.map((it, j) => (
              <Label
                key={j}
                physical
                outline={request.spec.outline}
                textScale={request.spec.textScale ?? 1}
                template={template}
                product={it.product}
                batch={it.batch}
                shop={it.shop}
                qrUrl={it.qrUrl}
              />
            ))}
          </div>
        </div>
      ))}
    </div>,
    document.body,
  )
}
