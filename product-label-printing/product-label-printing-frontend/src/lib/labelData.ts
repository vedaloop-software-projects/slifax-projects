import type { Product, ProductBatch } from '../types'

/**
 * Applies the expiry date chosen in the print queue. The override wins over both the
 * product's and the batch's expiry, so every renderer (screen, browser/PDF, PRN) prints it.
 */
export function withExpiryOverride(product: Product, batch: ProductBatch | null, expiryDate?: string): { product: Product; batch: ProductBatch | null } {
  if (!expiryDate) return { product, batch }
  return { product: { ...product, expiryDate }, batch: batch ? { ...batch, expiryDate } : null }
}

/** The expiry a queued label prints when no override is set. */
export function defaultExpiry(product: Product, batch: ProductBatch | null): string | null {
  return batch ? batch.expiryDate : product.expiryDate
}

export const isIsoDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))
