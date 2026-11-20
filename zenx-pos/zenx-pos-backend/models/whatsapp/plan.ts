import { businessZone, zonedParts, zonedTime } from '../system/business-time.ts'

export const DEFAULT_PRICE_PAISE = 100
// An unpaid online checkout holds its free messages this long, then expires.
export const PAYMENT_HOLD_MINUTES = 30
export const MAX_RECIPIENTS = 500

export type PaymentMode = 'wallet' | 'online'

// The calendar month the quota belongs to, in the store's zone (never the device's).
export function monthRange(now = new Date(), zone = businessZone()) {
  const { year, month } = zonedParts(now, zone)
  const y = Number(year), m = Number(month)
  return { gte: zonedTime(y, m, 1, undefined, zone), lt: zonedTime(y, m + 1, 1, undefined, zone), label: new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }) }
}

export function quote(recipients: number, quota: number, freeUsed: number, pricePaise: number) {
  const freeRemaining = Math.max(0, quota - freeUsed)
  const free = Math.min(freeRemaining, recipients)
  const paid = recipients - free
  return { recipients, quota, freeUsed, freeRemaining, free, paid, pricePaise, amountPaise: paid * pricePaise }
}

export type Quote = ReturnType<typeof quote>

export type Plan =
  | { ok: true; quote: Quote; status: 'queued' | 'pending_payment'; paymentMode: 'free' | PaymentMode; walletDebitPaise: number }
  | { ok: false; reason: 'quote_changed' | 'insufficient_wallet'; quote: Quote }

// Decided inside the send transaction, after the client row is locked, so two sends
// cannot both use the same free messages or wallet balance.
export function planSend(input: { recipients: number; quota: number; freeUsed: number; pricePaise: number; walletPaise: number; mode: PaymentMode; expectedAmountPaise: number }): Plan {
  const current = quote(input.recipients, input.quota, input.freeUsed, input.pricePaise)
  // The store confirmed a price; if the quota or price moved since, show the new one first.
  if (current.amountPaise !== input.expectedAmountPaise) return { ok: false, reason: 'quote_changed', quote: current }
  if (current.paid === 0) return { ok: true, quote: current, status: 'queued', paymentMode: 'free', walletDebitPaise: 0 }
  if (input.mode === 'wallet') {
    if (input.walletPaise < current.amountPaise) return { ok: false, reason: 'insufficient_wallet', quote: current }
    return { ok: true, quote: current, status: 'queued', paymentMode: 'wallet', walletDebitPaise: current.amountPaise }
  }
  return { ok: true, quote: current, status: 'pending_payment', paymentMode: 'online', walletDebitPaise: 0 }
}

// Furthest-status-wins: provider events can arrive out of order.
const RANK: Record<string, number> = { awaiting_payment: 0, queued: 1, sending: 2, accepted: 3, sent: 4, delivered: 5, read: 6 }
export const TERMINAL = new Set(['failed', 'cancelled'])
export function advances(current: string, next: string) {
  if (TERMINAL.has(current)) return false
  if (next === 'failed') return current !== 'read' && current !== 'delivered'
  return (RANK[next] ?? -1) > (RANK[current] ?? -1)
}

export const rupees = (paise: number | bigint) => Number(paise) / 100
