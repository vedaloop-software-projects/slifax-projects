// Aggregations over print/scan events. In production these are backend analytics queries.

import type { Db, PrintEvent, QrScanEvent } from '../types'
import { DAY, toIso } from './dates'

export type Range = 7 | 30 | 60

export function startOfDay(t = Date.now()): number {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function inLastDays<T extends { at: string }>(events: T[], days: number): T[] {
  const from = startOfDay() - (days - 1) * DAY
  return events.filter((e) => new Date(e.at).getTime() >= from)
}

export function today<T extends { at: string }>(events: T[]): T[] {
  return inLastDays(events, 1)
}

export interface DayPoint {
  date: string // yyyy-mm-dd
  label: string // "19 Sep"
  printed: number
  failed: number
  scans: number
  visitors: number
}

export function dailySeries(prints: PrintEvent[], scans: QrScanEvent[], days: number): DayPoint[] {
  const start = startOfDay() - (days - 1) * DAY
  const points = new Map<string, DayPoint & { _v: Set<string> }>()
  for (let i = 0; i < days; i++) {
    const t = start + i * DAY
    const d = new Date(t)
    const date = toIso(d)
    points.set(date, { date, label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), printed: 0, failed: 0, scans: 0, visitors: 0, _v: new Set() })
  }
  for (const e of prints) {
    const p = points.get(toIso(new Date(e.at)))
    if (!p) continue
    if (e.success) p.printed += e.quantity
    else p.failed += e.quantity
  }
  for (const s of scans) {
    const p = points.get(toIso(new Date(s.at)))
    if (!p) continue
    p.scans++
    p._v.add(s.visitorId)
  }
  return [...points.values()].map(({ _v, ...p }) => ({ ...p, visitors: _v.size }))
}

export function printTotals(events: PrintEvent[]) {
  let printed = 0
  let failed = 0
  for (const e of events) {
    if (e.success) printed += e.quantity
    else failed += e.quantity
  }
  const total = printed + failed
  return { printed, failed, successRate: total ? printed / total : 1, failRate: total ? failed / total : 0 }
}

export function groupCount<T>(items: T[], key: (t: T) => string, weight: (t: T) => number = () => 1) {
  const m = new Map<string, number>()
  for (const i of items) m.set(key(i), (m.get(key(i)) ?? 0) + weight(i))
  return [...m.entries()].map(([k, v]) => ({ key: k, value: v })).sort((a, b) => b.value - a.value)
}

export function topProducts(db: Db, by: 'prints' | 'scans', days: number, limit = 5) {
  const rows =
    by === 'prints'
      ? groupCount(inLastDays(db.printEvents, days).filter((e) => e.success), (e) => e.productId, (e) => e.quantity)
      : groupCount(inLastDays(db.scanEvents, days), (e) => e.productId)
  return rows.slice(0, limit).map((r) => ({ ...r, product: db.products.find((p) => p.id === r.key) }))
}

export function uniqueVisitors(scans: QrScanEvent[]) {
  return new Set(scans.map((s) => s.visitorId)).size
}
