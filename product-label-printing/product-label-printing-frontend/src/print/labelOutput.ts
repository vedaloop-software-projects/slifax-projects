import { useCallback, useState } from 'react'
import type { Db, LabelTemplate, Product, ProductBatch } from '../types'
import { productQr, qrUrl } from '../api'
import type { PrintSheetSpec, SheetRequest } from './PrintSheet'
import type { PrintSetup } from './geometry'
import { pdfFilename } from './labelPdf'
import { withExpiryOverride } from '../lib/labelData'
import { logPrints, type PrintMethod } from '../lib/printLog'
import { labelShop } from './stationStore'

/** Browser print and PDF cannot report completion; we record that the sheet was produced. */
function logSheet(spec: PrintSheetSpec, method: PrintMethod) {
  logPrints(spec.items.map((i) => ({
    method,
    status: 'SENT_TO_BROWSER',
    printer: method === 'PDF' ? 'PDF file' : 'This computer (browser print)',
    templateId: spec.template.id,
    templateName: spec.template.name,
    productId: i.product.id,
    productCode: i.product.productCode,
    productName: i.product.name,
    quantity: i.quantity,
    expiryDate: (i.batch ? i.batch.expiryDate : i.product.expiryDate) ?? null,
  })))
}

/** Page setup stored on the template, overridable per print. */
export function templateSetup(template: LabelTemplate, override: PrintSetup = {}): PrintSetup {
  return {
    gapMm: template.gapMm ?? 2,
    pageMode: template.pageMode ?? 'ROW',
    rotate: template.rotate ?? 0,
    offsetXMm: template.offsetXMm ?? 0,
    offsetYMm: template.offsetYMm ?? 0,
    textScale: template.textScale ?? 1,
    ...override,
  }
}

/** Builds a print sheet from whatever is currently in the print queue. */
export function buildSpec(db: Db, template: LabelTemplate, setup: PrintSetup = {}): PrintSheetSpec {
  return {
    template,
    ...templateSetup(template, setup),
    items: db.queue.map((q) => {
      const found = db.products.find((p) => p.id === q.productId)!
      const foundBatch = q.batchId ? db.batches.find((b) => b.id === q.batchId) ?? null : null
      const { product, batch } = withExpiryOverride(found, foundBatch, q.expiryDate, q.showExpiry !== false, q.packedDate)
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
    shop: labelShop(db),
    qrUrl: qr ? qrUrl(qr.id, db.settings) : '',
  }
}

/**
 * Drives the print/PDF sheet. Pages render the sheet and pass `request` to
 * <PrintSheet>, which opens the system dialog or downloads a PDF.
 */
export function useLabelOutput() {
  const [request, setRequest] = useState<SheetRequest | null>(null)
  const print = useCallback((spec: PrintSheetSpec) => {
    logSheet(spec, 'BROWSER')
    setRequest({ spec, mode: 'print' })
  }, [])
  const savePdf = useCallback((spec: PrintSheetSpec, ...nameParts: (string | undefined)[]) => {
    logSheet(spec, 'PDF')
    setRequest({ spec, mode: 'pdf', filename: pdfFilename(nameParts) })
  }, [])
  const clear = useCallback(() => setRequest(null), [])
  return { request, print, savePdf, clear, busy: !!request }
}
