// Print analytics outbox. Printing never waits for the network: every print is written to
// localStorage first, and the backlog is sent to the backend later —
//   • when the user logs out, and
//   • at the end of the day (records from earlier days go on the first activity of a new day,
//     or at midnight when the app is left open).
// Entries leave the outbox only after the server confirms them; each entry has a unique id,
// so a retry after a dropped response is never double-counted.

export type PrintMethod = 'PRN' | 'BROWSER' | 'PDF'
export type PrintLogStatus = 'SPOOLED' | 'UNCONFIRMED' | 'SENT_TO_BROWSER'

export interface PrintLogEntry {
  id: string
  at: string // ISO timestamp of the print
  userId: string
  clientId: string | null
  method: PrintMethod
  status: PrintLogStatus
  printer: string
  templateId: string
  templateName: string
  productId: string
  productCode: string
  productName: string
  quantity: number
  /** Expiry printed on the label, or null when it was left off / the product has none. */
  expiryDate: string | null
}

export type PrintLogInput = Omit<PrintLogEntry, 'id' | 'at' | 'userId' | 'clientId'>

const KEY = 'smart-label-print-outbox'
const LAST_SYNC_KEY = 'smart-label-print-outbox-synced'
const MAX_ENTRIES = 20000
export const BATCH_SIZE = 500

function read(): PrintLogEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(entries: PrintLogEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)))
  } catch {
    /* storage full or blocked: analytics are best effort, printing must not fail */
  }
}

function signedInUser(): { id: string; clientId: string | null } | null {
  try {
    const u = JSON.parse(localStorage.getItem('sl-user') ?? 'null')
    return u?.id ? { id: String(u.id), clientId: u.clientId == null ? null : String(u.clientId) } : null
  } catch {
    return null
  }
}

const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

/** Record prints locally. Never throws. */
export function logPrints(items: PrintLogInput[], at = new Date()) {
  const user = signedInUser()
  if (!user || !items.length) return
  const entries = items
    .filter((i) => i.quantity > 0)
    .map((i) => ({ ...i, id: uid(), at: at.toISOString(), userId: user.id, clientId: user.clientId }))
  write([...read(), ...entries])
}

export function pendingPrintLogs(userId?: string): PrintLogEntry[] {
  const all = read()
  return userId ? all.filter((e) => e.userId === userId) : all
}

const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** End-of-day rule: anything recorded before today should be on the server by now. */
export function hasPreviousDayLogs(userId: string, now = new Date()): boolean {
  const today = localDay(now)
  return pendingPrintLogs(userId).some((e) => localDay(new Date(e.at)) < today)
}

export type SendBatch = (entries: PrintLogEntry[]) => Promise<void>

/**
 * Sends the signed-in user's entries in batches and removes each batch once accepted.
 * Stops at the first failure (kept for the next attempt). Returns how many were sent.
 * `onlyBeforeToday`: the end-of-day sync leaves today's prints for the logout sync.
 */
export async function syncPrintLogs(send: SendBatch, { onlyBeforeToday = false, now = new Date() } = {}): Promise<number> {
  const user = signedInUser()
  if (!user) return 0
  const today = localDay(now)
  const mine = pendingPrintLogs(user.id).filter((e) => !onlyBeforeToday || localDay(new Date(e.at)) < today)
  let sent = 0
  for (let i = 0; i < mine.length; i += BATCH_SIZE) {
    const batch = mine.slice(i, i + BATCH_SIZE)
    await send(batch) // throws → the rest stays queued
    const done = new Set(batch.map((e) => e.id))
    write(read().filter((e) => !done.has(e.id)))
    sent += batch.length
  }
  try {
    localStorage.setItem(LAST_SYNC_KEY, now.toISOString())
  } catch {
    /* ignore */
  }
  return sent
}
