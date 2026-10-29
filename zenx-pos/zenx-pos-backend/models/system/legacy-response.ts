import { businessZone } from './business-time.ts'

export function legacyId(value: bigint): number
export function legacyId(value: bigint | null | undefined): number | null
export function legacyId(value: bigint | null | undefined) {
  if (value == null) return null
  const result = Number(value)
  if (!Number.isSafeInteger(result)) throw new RangeError('Database ID exceeds the legacy JSON integer range.')
  return result
}

export function legacyDecimal(value: unknown, scale: number) {
  const result = Number(value)
  if (!Number.isFinite(result)) throw new TypeError('Database decimal is invalid.')
  return result.toFixed(scale)
}

export function legacyRoundOff(netAmount: number) {
  const decimalPart = netAmount - Math.floor(netAmount)
  if (decimalPart === 0) return 0
  return Math.round((decimalPart < 0.5 ? -decimalPart : 1 - decimalPart) * 100) / 100
}

export function legacyRow<T extends Record<string, unknown>>(row: T) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === 'bigint' ? legacyId(value) : value]))
}

export function legacyDate(value: Date | null | undefined) {
  if (!value) return null
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: businessZone(), day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(value)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? ''
  return `${part('day')}-${part('month')}-${part('year')}`
}

export function legacyTimestamp(value: Date | null | undefined) {
  if (!value) return null
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: businessZone(), day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(value)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? ''
  return `${part('day')}-${part('month')}-${part('year')} ${part('hour')}:${part('minute')}:${part('second')}`
}

export function legacyTimestamp12(value: Date | null | undefined) {
  if (!value) return null
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: businessZone(), day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).formatToParts(value)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? ''
  return `${part('day')}-${part('month')}-${part('year')} ${part('hour')}:${part('minute')}:${part('second')} ${part('dayPeriod').toUpperCase()}`
}
