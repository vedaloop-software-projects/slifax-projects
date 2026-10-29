import { AsyncLocalStorage } from 'node:async_hooks'

// Business days follow the tenant's timezone (users.time_zone) and the server clock,
// never the device clock. Authentication sets the zone for the rest of the request;
// work outside a request (jobs, tests) uses the default.
export const DEFAULT_TIME_ZONE = 'Asia/Kolkata'
const scope = new AsyncLocalStorage<string>()
const formatters = new Map<string, Intl.DateTimeFormat>()

export function validTimeZone(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim() || value.length > 64) return null
  // Keep the name as given: ICU canonicalises some zones to legacy names (Asia/Kolkata -> Asia/Calcutta).
  try { new Intl.DateTimeFormat('en-US', { timeZone: value.trim() }); return value.trim() } catch { return null }
}

export const businessZone = () => scope.getStore() ?? DEFAULT_TIME_ZONE
export const withBusinessZone = <T>(zone: string | null | undefined, run: () => T) => scope.run(validTimeZone(zone) ?? DEFAULT_TIME_ZONE, run)

export function zonedParts(value: Date, zone = businessZone()) {
  let formatter = formatters.get(zone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    formatters.set(zone, formatter)
  }
  const parts = formatter.formatToParts(value)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? ''
  return { year: part('year'), month: part('month'), day: part('day'), hour: part('hour'), minute: part('minute'), second: part('second') }
}

const offsetMs = (value: Date, zone: string) => {
  const p = zonedParts(value, zone)
  return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second)) - Math.floor(value.getTime() / 1000) * 1000
}

// The instant a wall-clock time happens in the zone; days and months may overflow, as with Date.UTC.
export function zonedTime(year: number, month: number, day: number, clock = '00:00:00.000', zone = businessZone()) {
  const [hour = 0, minute = 0, second = 0] = clock.split(':').map(Number)
  const wall = Date.UTC(year, month - 1, day, hour, minute, Math.floor(second), Math.round((second % 1) * 1000))
  const first = wall - offsetMs(new Date(wall), zone)
  return new Date(wall - offsetMs(new Date(first), zone))
}

export function businessDayRange(value: Date, zone = businessZone()) {
  const { year, month, day } = zonedParts(value, zone)
  return { gte: zonedTime(Number(year), Number(month), Number(day), undefined, zone), lt: zonedTime(Number(year), Number(month), Number(day) + 1, undefined, zone) }
}

// @db.Date columns keep the UTC calendar day, so the business date is passed at UTC midnight.
export function businessCalendarDay(value = new Date(), zone = businessZone()) {
  const { year, month, day } = zonedParts(value, zone)
  return new Date(`${year}-${month}-${day}T00:00:00Z`)
}

// Wall-clock time-of-day on 1970-01-01 UTC, the form happy hour times are saved in.
export function businessClock(value = new Date(), zone = businessZone()) {
  const { hour, minute, second } = zonedParts(value, zone)
  return new Date(Date.UTC(1970, 0, 1, Number(hour), Number(minute), Number(second)))
}

export function businessDateText(value: Date, zone = businessZone()) {
  const { year, month, day } = zonedParts(value, zone)
  return `${day}-${month}-${year}`
}

// The zone's current UTC offset as +HH:MM, for SQL CONVERT_TZ on DATETIME columns.
export function zoneOffsetText(value = new Date(), zone = businessZone()) {
  const minutes = Math.round(offsetMs(value, zone) / 60_000), sign = minutes < 0 ? '-' : '+', size = Math.abs(minutes)
  return `${sign}${String(Math.floor(size / 60)).padStart(2, '0')}:${String(size % 60).padStart(2, '0')}`
}
