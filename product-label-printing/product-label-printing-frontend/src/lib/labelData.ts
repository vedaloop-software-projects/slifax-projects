import type { ExpiryChoice, Product, ProductBatch } from '../types'
import { addMonths, todayIso } from './dates'

/**
 * Applies the expiry choice from the print queue. The chosen date wins over both the
 * product's and the batch's expiry; `showExpiry: false` removes it from the label entirely.
 * Every renderer (screen, browser/PDF, PRN) skips the expiry field when it is empty.
 * `packedDate` (set in the queue) replaces the product's and batch's packed date.
 */
export function withExpiryOverride(
  product: Product,
  batch: ProductBatch | null,
  expiryDate?: string,
  showExpiry = true,
  packedDate?: string,
): { product: Product; batch: ProductBatch | null } {
  if (packedDate) {
    product = { ...product, packedDate }
    batch = batch ? { ...batch, packedDate } : null
  }
  if (!showExpiry) return { product: { ...product, expiryDate: null }, batch: batch ? { ...batch, expiryDate: null } : null }
  if (!expiryDate) return { product, batch }
  return { product: { ...product, expiryDate }, batch: batch ? { ...batch, expiryDate } : null }
}

/** The expiry a queued label prints when no override is set. */
export function defaultExpiry(product: Product, batch: ProductBatch | null): string | null {
  return batch ? batch.expiryDate : product.expiryDate
}

export const isIsoDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))

/** The packed date printed on the label (queue override, then batch, then product), which 3 / 6 months count from. */
export function packedDateFor(product: Product, batch: ProductBatch | null, override?: string): string {
  return override ?? batch?.packedDate ?? product.packedDate ?? todayIso()
}

/** The product's (or batch's) own packed date, before any queue change. */
export const ownPackedDate = (product: Product, batch: ProductBatch | null): string | null => batch?.packedDate ?? product.packedDate ?? null

/**
 * A packed date can only move back: on or before the product's own packed date, and never
 * after today.
 */
export const isAllowedPackedDate = (date: string, ownPacked: string | null, today = todayIso()) =>
  isIsoDate(date) && date <= today && (!ownPacked || date <= ownPacked)

/**
 * A picked expiry can only move forward: on or after the product's own expiry, after today,
 * and never before the packed date on the same label.
 */
export const isAllowedExpiryDate = (date: string, packedDate: string | null, ownExpiry: string | null, today = todayIso()) =>
  isIsoDate(date) && date > today && (!packedDate || date >= packedDate) && (!ownExpiry || date >= ownExpiry)

/**
 * Expiry date for a queue choice. `undefined` means "use the product's own expiry".
 * 3 and 6 months count from the packed date on the same label, so both dates agree.
 */
export function expiryForChoice(choice: ExpiryChoice, packedDate: string, customDate?: string | null): string | undefined {
  if (choice === 'MONTHS_3') return addMonths(packedDate, 3)
  if (choice === 'MONTHS_6') return addMonths(packedDate, 6)
  if (choice === 'CUSTOM') return customDate && isIsoDate(customDate) ? customDate : undefined
  return undefined
}
