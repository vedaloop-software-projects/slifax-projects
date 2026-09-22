import { useCallback, useState } from 'react'
import type { Db, LabelTemplate, Product, ProductBatch } from '../types'
import { productQr, qrUrl } from '../api'
import type { PrintSheetSpec, SheetRequest } from './PrintSheet'
import type { PrintSetup } from './geometry'
import { pdfFilename } from './labelPdf'

/** Page setup stored on the template, overridable per print. */
export function templateSetup(template: LabelTemplate, override: PrintSetup = {}): PrintSetup {
  return {
    gapMm: template.gapMm ?? 2,
    pageMode: template.pageMode ?? 'ROW',
    rotate: template.rotate ?? 0,
    offsetXMm: template.offsetXMm ?? 0,
    offsetYMm: template.offsetYMm ?? 0,
    ...override,
  }
}

/** Builds a print sheet from whatever is currently in the print queue. */
export function buildSpec(db: Db, template: LabelTemplate, setup: PrintSetup = {}): PrintSheetSpec {
  return {
    template,
    ...templateSetup(template, setup),
    items: db.queue.map((q) => {
      const product = db.products.find((p) => p.id === q.productId)!
      const batch = q.batchId ? db.batches.find((b) => b.id === q.batchId) ?? null : null
      return { ...labelSource(db, product, batch), quantity: q.quantity }
    }),
  }
}

/** Builds a sheet for a single product/batch (used from the product page). */
export function buildProductSpec(
  db: Db,
  template: LabelTemplate,
  product: Product,
  batch: ProductBatch | null,
  quantity: number,
  setup: PrintSetup = {},
): PrintSheetSpec {
  return { template, ...templateSetup(template, setup), items: [{ ...labelSource(db, product, batch), quantity }] }
}

function labelSource(db: Db, product: Product, batch: ProductBatch | null) {
  const qr = batch ? db.qrCodes.find((x) => x.entityId === batch.id) : productQr(db, product.id)
  return {
    product,
    batch,
    shop: db.shops.find((s) => s.id === product.shopId),
    qrUrl: qr ? qrUrl(qr.id, db.settings) : '',
  }
}

/**
 * Drives the print/PDF sheet. Pages render the sheet and pass `request` to
 * <PrintSheet>, which opens the system dialog or downloads a PDF.
 */
export function useLabelOutput() {
  const [request, setRequest] = useState<SheetRequest | null>(null)
  const print = useCallback((spec: PrintSheetSpec) => setRequest({ spec, mode: 'print' }), [])
  const savePdf = useCallback((spec: PrintSheetSpec, ...nameParts: (string | undefined)[]) => setRequest({ spec, mode: 'pdf', filename: pdfFilename(nameParts) }), [])
  const clear = useCallback(() => setRequest(null), [])
  return { request, print, savePdf, clear, busy: !!request }
}
