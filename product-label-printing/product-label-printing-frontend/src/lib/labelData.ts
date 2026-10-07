import type { Product, ProductBatch } from '../types'

/**
 * Applies the expiry choice from the print queue. The chosen date wins over both the
 * product's and the batch's expiry; `showExpiry: false` removes it from the label entirely.
 * Every renderer (screen, browser/PDF, PRN) skips the expiry field when it is empty.
 */
export function withExpiryOverride(
  product: Product,
  batch: ProductBatch | null,
  expiryDate?: string,
  showExpiry = true,
): { product: Product; batch: ProductBatch | null } {
  if (!showExpiry) return { product: { ...product, expiryDate: null }, batch: batch ? { ...batch, expiryDate: null } : null }
  if (!expiryDate) return { product, batch }
  return { product: { ...product, expiryDate }, batch: batch ? { ...batch, expiryDate } : null }
}

/** The expiry a queued label prints when no override is set. */
export function defaultExpiry(product: Product, batch: ProductBatch | null): string | null {
  return batch ? batch.expiryDate : product.expiryDate
}

export const isIsoDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))
