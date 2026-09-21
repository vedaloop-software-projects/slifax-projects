import { useCallback, useState } from 'react'
import type { Db, LabelTemplate } from '../types'
import { productQr, qrUrl } from '../api'
import type { PrintSheetSpec } from './PrintSheet'

/** Builds a print sheet from whatever is currently in the queue. */
export function buildSpec(db: Db, template: LabelTemplate): PrintSheetSpec {
  return {
    template,
    items: db.queue.map((q) => {
      const product = db.products.find((p) => p.id === q.productId)!
      const batch = q.batchId ? db.batches.find((b) => b.id === q.batchId) ?? null : null
      const qr = batch ? db.qrCodes.find((x) => x.entityId === batch.id) : productQr(db, product.id)
      return {
        product,
        batch,
        shop: db.shops.find((s) => s.id === product.shopId),
        qrUrl: qr ? qrUrl(qr.id, db.settings) : '',
        quantity: q.quantity,
      }
    }),
  }
}

export function useBrowserPrint() {
  const [spec, setSpec] = useState<PrintSheetSpec | null>(null)
  const clear = useCallback(() => setSpec(null), [])
  return { spec, setSpec, clear }
}
