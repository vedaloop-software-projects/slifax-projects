import type { ExpiryRule } from '../types'

export const DAY = 86_400_000

export function todayIso(): string {
  return toIso(new Date())
}

export function toIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addMonths(iso: string, months: number): string {
  const d = parseIso(iso)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return toIso(d)
}

export function daysBetween(fromIso: string, toIsoStr: string): number {
  return Math.round((parseIso(toIsoStr).getTime() - parseIso(fromIso).getTime()) / DAY)
}

export const EXPIRY_RULES: { value: ExpiryRule; label: string; months: number | null }[] = [
  { value: 'MONTHS_3', label: '3 months', months: 3 },
  { value: 'MONTHS_6', label: '6 months', months: 6 },
  { value: 'MONTHS_12', label: '12 months', months: 12 },
  { value: 'CUSTOM', label: 'Custom', months: null },
  { value: 'NONE', label: 'No expiry', months: null },
]

/** Expiry engine (§15). Owned by the (mock) backend; UI only previews it. */
export function computeExpiry(packedDate: string, rule: ExpiryRule, customMonths: number | null): string | null {
  if (rule === 'NONE') return null
  const months = rule === 'CUSTOM' ? customMonths : EXPIRY_RULES.find((r) => r.value === rule)?.months
  if (!months || months <= 0) return null
  return addMonths(packedDate, months)
}

export type ExpiryState = 'NONE' | 'OK' | 'EXPIRING' | 'EXPIRED'

export function expiryState(expiryDate: string | null, warnDays = 30): ExpiryState {
  if (!expiryDate) return 'NONE'
  const left = daysBetween(todayIso(), expiryDate)
  if (left < 0) return 'EXPIRED'
  if (left <= warnDays) return 'EXPIRING'
  return 'OK'
}

/** dd-mm-yyyy (label / Indian retail convention) */
export function fmtDate(iso: string | null, short = false): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}-${m}-${short ? y.slice(2) : y}`
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function timeAgo(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
