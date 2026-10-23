import { labelContentBox } from '../lib/labelLayout'
import { validateElements } from '../lib/freeLayout'
import { defaultExpiry, expiryForChoice, isAllowedExpiryDate, isAllowedPackedDate, isIsoDate, ownPackedDate, packedDateFor, withExpiryOverride } from '../lib/labelData'
import { logPrints } from '../lib/printLog'
import { fontTestPrn } from '../lib/printerFonts'
// Mock backend API. Every function is async and shaped like a REST call so it can be
// swapped for fetch() against the real modular-monolith backend (§21) later.
// Business rules that the doc assigns to the backend live here, not in the UI:
//   • ID generation (§6)   • expiry engine (§15)   • QR identity immutability (§23)
//   • print lifecycle (§13) • audit trail (§18)       • RBAC enforcement (§19)

import type {
  AuditLog,
  ExpiryChoice,
  Db,
  Device,
  LabelTemplate,
  PrintJob,
  Printer,
  Product,
  ProductBatch,
  ProductInput,
  QrCode,
  Settings,
  User,
} from '../types'
import { getDb, setDb } from '../mock/db'
import { newId } from '../lib/ids'
import { computeExpiry, todayIso } from '../lib/dates'
import { can, normalizeRole, type Permission } from '../lib/permissions'
import { duplicatePrinter } from '../lib/printerProfiles'
import { renderPrnBatch } from '../lib/prnRenderer'
import { labelShop } from '../print/stationStore'
import { markActivity } from '../lib/idle'
import { localPrinters, mappedPrinter, sendPrn } from '../print/localAgent'
import { MASTER_FILTERS, PRODUCT_FILTERS, mapLoginUser, mapProductDetail, mapProductListRow, type BackendProductRow } from './zenxpos'

// --- Real backend integration (added for API wiring) ---
const API_BASE = String(import.meta.env?.VITE_API_URL || 'http://localhost:5100').replace(/\/$/, '')

function getStoredToken(): string | null {
  return localStorage.getItem('sl-token')
}

function setStoredToken(t: string | null) {
  if (t) localStorage.setItem('sl-token', t)
  else localStorage.removeItem('sl-token')
}

async function apiFetch<T = any>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = getStoredToken()
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  let json: any = null
  try {
    json = await res.json()
  } catch {
    // response had no body
  }

  if (!res.ok) {
    throw new ApiError(json?.errors || json?.message || json?.error?.message || `HTTP ${res.status}`)
  }
  return json as T
}

async function apiFormFetch<T = any>(path: string, body: FormData): Promise<T> {
  const token = getStoredToken()
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(json?.errors || json?.message || `HTTP ${res.status}`)
  return json as T
}

export class ApiError extends Error {}

const latency = (min = 120, max = 380) => new Promise((r) => setTimeout(r, min + Math.random() * (max - min)))
const nowIso = () => new Date().toISOString()

/** The signed-in backend user (set by auth.login). Mock endpoints enforce RBAC with it. */
function currentUser(): User | null {
  try {
    const raw = localStorage.getItem('sl-user')
    if (!raw) return null
    const user = JSON.parse(raw) as User
    return { ...user, role: normalizeRole(user.role) }
  } catch {
    return null
  }
}

function requirePerm(perm: Permission): User {
  const u = currentUser()
  if (!u) throw new ApiError('Not signed in')
  if (!can(u.role, perm)) throw new ApiError('You do not have permission to do that')
  return u
}

function audit(actor: string, action: string, entityType: string, entityId: string | null, detail: string): AuditLog {
  return { id: newId('log'), at: nowIso(), actor, action, entityType, entityId, detail }
}

function withAudit(db: Db, ...logs: AuditLog[]): Db {
  return { ...db, auditLogs: [...logs.reverse(), ...db.auditLogs].slice(0, 2000) }
}

export function qrUrl(qrId: string, settings = getDb().settings): string {
  return `${settings.resolverBaseUrl.replace(/\/$/, '')}/${qrId}`
}

/** Printing straight from the browser has no printer profile behind it. */
export const BROWSER_PRINTER_ID = 'browser'

export function printerName(db: Db, id: string): string {
  if (id === BROWSER_PRINTER_ID) return 'This computer (browser print)'
  return db.printers.find((p) => p.id === id)?.name ?? db.archivedPrinterNames?.[id] ?? 'Removed printer'
}

export function productQr(db: Db, productId: string): QrCode | undefined {
  return db.qrCodes.find((q) => q.entityType === 'PRODUCT' && q.entityId === productId)
}

// ─── Auth ──────────────────────────────────────────────────────────────────

const resetCodes = new Map<string, string>()

export const auth = {
    /** `identifier` is an email, or a mobile number (super admins sign in with mobile). */
  async login(identifier: string, password: string): Promise<User> {
    const res = await apiFetch<{
      success: boolean
      message: string
      data: { user: any }
    }>('POST', '/api/login', {
      mobileEmail: identifier.trim(),
      password,
    })

    const { token, user: mapped } = mapLoginUser(res.data.user)
    setStoredToken(token)

    localStorage.setItem('sl-user', JSON.stringify(mapped))
    markActivity() // a fresh sign-in starts a fresh inactivity window
    return mapped
  },

  async logout() {
    setStoredToken(null)
    localStorage.removeItem('sl-user')
  },

  /** Step 1: request a reset. Always resolves (don't leak which emails exist). Returns the demo code. */
  async requestPasswordReset(email: string): Promise<string> {
    await latency(500, 800)
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const u = getDb().users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
    if (u) resetCodes.set(u.email, code)
    return code
  },

  async verifyResetCode(email: string, code: string) {
    await latency()
    const key = email.trim().toLowerCase()
    if (resetCodes.get(key) !== code.trim()) throw new ApiError('That code is invalid or has expired')
  },

  async resetPassword(email: string, code: string, password: string) {
    await latency()
    const key = email.trim().toLowerCase()
    if (resetCodes.get(key) !== code.trim()) throw new ApiError('That code is invalid or has expired')
    if (password.length < 8) throw new ApiError('Password must be at least 8 characters')
    resetCodes.delete(key)
    setDb((db) => {
      const u = db.users.find((x) => x.email === key)!
      return withAudit(
        { ...db, users: db.users.map((x) => (x.email === key ? { ...x, password } : x)) },
        audit(u.name, 'PASSWORD_RESET', 'USER', u.id, 'Password reset via email code'),
      )
    })
  },
}

// ─── Batches ───────────────────────────────────────────────────────────────

export const batches = {
  async create(productId: string, packedDate: string, quantity: number): Promise<ProductBatch> {
    const u = requirePerm('batches.manage')
    await latency()
    const db = getDb()
    const product = db.products.find((p) => p.id === productId)
    if (!product) throw new ApiError('Product not found')
    const batchCode = `B${packedDate.replaceAll('-', '')}`
    if (db.batches.some((b) => b.productId === productId && b.batchCode === batchCode)) throw new ApiError(`Batch ${batchCode} already exists for this product`)
    const expiryDate = computeExpiry(packedDate, product.expiryRule, product.shelfLifeMonths)
    const t = nowIso()
    const batch: ProductBatch = { id: newId('batch'), productId, batchCode, packedDate, expiryDate, quantity, createdAt: t }
    const qr: QrCode = { id: newId('qr'), entityType: 'PRODUCT_BATCH', entityId: batch.id, createdAt: t, status: 'ACTIVE' }
    const latest = packedDate >= product.packedDate
    setDb((d) =>
      withAudit(
        {
          ...d,
          batches: [...d.batches, batch],
          qrCodes: [...d.qrCodes, qr],
          // Product carries the latest batch's dates for default labels
          products: latest ? d.products.map((p) => (p.id === productId ? { ...p, packedDate, expiryDate, updatedAt: t } : p)) : d.products,
        },
        audit(u.name, 'BATCH_CREATED', 'BATCH', batch.id, `${batchCode} × ${quantity} for ${product.name}`),
        audit('system', 'QR_GENERATED', 'QR', qr.id, `Batch QR identity issued for ${batchCode}`),
      ),
    )
    return batch
  },
}

// ─── QR identity ───────────────────────────────────────────────────────────

export const identity = {
  /** QR ids are immutable; the only state change is revoke/reactivate. */
  async setStatus(qrId: string, status: QrCode['status']) {
    const u = requirePerm('identity.manage')
    await latency()
    setDb((db) =>
      withAudit(
        { ...db, qrCodes: db.qrCodes.map((q) => (q.id === qrId ? { ...q, status } : q)) },
        audit(u.name, status === 'REVOKED' ? 'QR_REVOKED' : 'QR_REACTIVATED', 'QR', qrId, `QR ${status.toLowerCase()}`),
      ),
    )
  },

  /** Public resolver (§24). Records the scan event, returns only public data. */
  async resolve(qrId: string, userAgent: string) {
    await latency(150, 300)
    const db = getDb()
    const qr = db.qrCodes.find((q) => q.id === qrId)
    if (!qr) return { status: 'NOT_FOUND' as const }
    if (qr.status === 'REVOKED') return { status: 'REVOKED' as const }
    const batch = qr.entityType === 'PRODUCT_BATCH' ? db.batches.find((b) => b.id === qr.entityId) ?? null : null
    const product = db.products.find((p) => p.id === (batch ? batch.productId : qr.entityId))
    if (!product) return { status: 'NOT_FOUND' as const }
    const shop = db.shops.find((s) => s.id === product.shopId)
    const device: Device = /android/i.test(userAgent) ? 'Android' : /iphone|ipad|ios/i.test(userAgent) ? 'iOS' : /windows|macintosh|linux/i.test(userAgent) ? 'Desktop' : 'Other'
    let visitorId = 'anon'
    try {
      visitorId = localStorage.getItem('sl-visitor') ?? newId('usr')
      localStorage.setItem('sl-visitor', visitorId)
    } catch {
      /* private mode */
    }
    const t = nowIso()
    setDb((d) =>
      withAudit(
        {
          ...d,
          scanEvents: [
            ...d.scanEvents,
            { id: newId('scan'), qrId, productId: product.id, batchId: batch?.id ?? null, shopId: product.shopId, location: shop?.location ?? 'Unknown', device, visitorId, at: t },
          ],
        },
        audit('public', 'QR_SCANNED', 'QR', qrId, `Scanned (${device})`),
      ),
    )
    const pf = db.settings.publicFields
    return {
      status: 'OK' as const,
      data: {
        shopName: shop?.name ?? db.settings.organizationName,
        shopLocation: shop?.location ?? '',
        name: product.name,
        brand: product.brand,
        category: product.category,
        unit: product.unit,
        mrp: pf.mrp ? product.mrp : null,
        salePrice: pf.salePrice ? product.salePrice : null,
        packedDate: pf.packedDate ? batch?.packedDate ?? product.packedDate : null,
        expiryDate: pf.expiryDate ? (batch ? batch.expiryDate : product.expiryDate) : null,
        productCode: pf.productCode ? product.productCode : null,
        batchCode: pf.batchCode ? batch?.batchCode ?? null : null,
        active: product.status === 'ACTIVE',
        expired: !!(batch?.expiryDate ?? product.expiryDate) && (batch?.expiryDate ?? product.expiryDate)! < todayIso(),
        verifiedAt: t,
      },
    }
  },
}

export type ResolveResult = Awaited<ReturnType<typeof identity.resolve>>

// ─── Print queue & print agent ─────────────────────────────────────────────

export const queue = {
  async add(productId: string, quantity: number, batchId: string | null = null, expiryDate?: string) {
    requirePerm('print')
    await latency(60, 140)
    const db = getDb()
    const p = db.products.find((x) => x.id === productId)
    if (!p) throw new ApiError('Product not found')
    if (p.status !== 'ACTIVE') throw new ApiError(`${p.name} is ${p.status.toLowerCase()} and cannot be printed`)
    if (quantity < 1 || quantity > 1000) throw new ApiError('Quantity must be between 1 and 1000')
    if (expiryDate !== undefined && !isIsoDate(expiryDate)) throw new ApiError('Enter a valid expiry date')
    setDb((d) => {
      const existing = d.queue.find((q) => q.productId === productId && q.batchId === batchId)
      return existing
        ? { ...d, queue: d.queue.map((q) => (q === existing ? { ...q, quantity: Math.min(1000, q.quantity + quantity), ...(expiryDate ? { expiryDate } : {}) } : q)) }
        : { ...d, queue: [...d.queue, { id: newId('q'), productId, batchId, quantity, ...(expiryDate ? { expiryDate } : {}) }] }
    })
  },
  /** Print this entry's labels with or without an expiry date. */
  async setShowExpiry(entryId: string, show: boolean) {
    requirePerm('print')
    setDb((d) => ({ ...d, queue: d.queue.map((q) => (q.id === entryId ? { ...q, showExpiry: show } : q)) }))
  },
  /**
   * Expiry for this entry's labels: the product's own, 3 or 6 months from the packed date,
   * or a custom date picked on the calendar. Anyone who prints can choose.
   */
  async setExpiryChoice(entryId: string, choice: ExpiryChoice, customDate?: string | null) {
    requirePerm('print')
    if (!['PRODUCT', 'MONTHS_3', 'MONTHS_6', 'CUSTOM'].includes(choice)) throw new ApiError('Choose an expiry option')
    if (choice === 'CUSTOM' && customDate && !isIsoDate(customDate)) throw new ApiError('Enter a valid expiry date')
    const db = getDb()
    const entry = db.queue.find((q) => q.id === entryId)
    if (!entry) return
    const product = db.products.find((p) => p.id === entry.productId)
    if (!product) throw new ApiError('Product not found')
    const batch = entry.batchId ? db.batches.find((b) => b.id === entry.batchId) ?? null : null
    const packed = packedDateFor(product, batch, entry.packedDate)
    const ownExpiry = defaultExpiry(product, batch)
    if (choice === 'CUSTOM' && customDate && !isAllowedExpiryDate(customDate, packed, ownExpiry)) throw new ApiError("Pick an expiry date after today and on or after the product's own expiry date")
    // Custom without a date yet: start from what the label shows, if that is still allowed.
    const current = entry.expiryDate ?? (batch ? batch.expiryDate : product.expiryDate)
    const custom = choice === 'CUSTOM' ? customDate ?? (current && isAllowedExpiryDate(current, packed, ownExpiry) ? current : null) : null
    const expiryDate = expiryForChoice(choice, packed, custom)
    setDb((d) => ({
      ...d,
      queue: d.queue.map((q) => {
        if (q.id !== entryId) return q
        const next = { ...q }
        delete next.expiryDate
        delete next.expiryChoice
        return { ...next, ...(choice !== 'PRODUCT' ? { expiryChoice: choice } : {}), ...(expiryDate ? { expiryDate } : {}) }
      }),
    }))
  },
  /**
   * Packed date printed on this entry's labels; `null` goes back to the
   * product's / batch's own. 3 / 6 month expiries move with it.
   */
  async setPackedDate(entryId: string, packedDate: string | null) {
    requirePerm('print.packedDate')
    const db = getDb()
    const entry = db.queue.find((q) => q.id === entryId)
    if (!entry) return
    const product = db.products.find((p) => p.id === entry.productId)
    if (!product) throw new ApiError('Product not found')
    const batch = entry.batchId ? db.batches.find((b) => b.id === entry.batchId) ?? null : null
    if (packedDate !== null && !isAllowedPackedDate(packedDate, ownPackedDate(product, batch))) throw new ApiError("Pick a packed date on or before the product's own packed date (and not after today)")
    const packed = packedDateFor(product, batch, packedDate ?? undefined)
    const months = entry.expiryChoice === 'MONTHS_3' || entry.expiryChoice === 'MONTHS_6'
    setDb((d) => ({
      ...d,
      queue: d.queue.map((q) => {
        if (q.id !== entryId) return q
        const next = { ...q }
        delete next.packedDate
        if (packedDate) next.packedDate = packedDate
        if (months) next.expiryDate = expiryForChoice(q.expiryChoice!, packed)
        return next
      }),
    }))
  },
  /** Expiry printed on this entry's labels; `null` goes back to the product's own expiry. */
  async setExpiry(entryId: string, expiryDate: string | null) {
    requirePerm('print')
    if (expiryDate !== null && !isIsoDate(expiryDate)) throw new ApiError('Enter a valid expiry date')
    setDb((d) => ({
      ...d,
      queue: d.queue.map((q) => {
        if (q.id !== entryId) return q
        const next = { ...q }
        delete next.expiryDate
        return expiryDate ? { ...next, expiryDate } : next
      }),
    }))
  },
  async setQuantity(entryId: string, quantity: number) {
    requirePerm('print')
    setDb((d) => ({ ...d, queue: d.queue.map((q) => (q.id === entryId ? { ...q, quantity: Math.max(1, Math.min(1000, quantity)) } : q)) }))
  },
  async setBatch(entryId: string, batchId: string | null) {
    requirePerm('print')
    setDb((d) => ({ ...d, queue: d.queue.map((q) => (q.id === entryId ? { ...q, batchId } : q)) }))
  },
  async remove(entryId: string) {
    requirePerm('print')
    setDb((d) => ({ ...d, queue: d.queue.filter((q) => q.id !== entryId) }))
  },
  async clear() {
    requirePerm('print')
    setDb((d) => ({ ...d, queue: [] }))
  },
}

export const printing = {
  /** Creates a print job from the queue, renders PRN, dispatches to the agent. */
  async printQueue(printerId: string, templateId: string): Promise<PrintJob> {
    const u = requirePerm('print')
    const db = getDb()
    if (!db.queue.length) throw new ApiError('The print queue is empty')
    const printer = db.printers.find((p) => p.id === printerId)
    const tpl = db.templates.find((t) => t.id === templateId)
    if (!printer) throw new ApiError('Select a printer')
    if (!tpl) throw new ApiError('Select a label template')
    if (printer.language === 'ESCPOS') throw new ApiError('Generated ESC/POS is not supported. Send a verified PRN file from Printers.')
    mappedPrinter(printer.id)
    for (const q of db.queue) {
      const product = db.products.find((p) => p.id === q.productId)
      if (!product || product.status !== 'ACTIVE') throw new ApiError('The queue contains an inactive or missing product')
      if (!Number.isInteger(q.quantity) || q.quantity < 1 || q.quantity > 1000) throw new ApiError('Quantity must be an integer between 1 and 1000')
    }

    const queued = db.queue.map((q) => ({ q, product: db.products.find((p) => p.id === q.productId)! }))
    // One job for the whole queue, so different products share rows on 2 UP / 3 UP rolls.
    const prn = renderPrnBatch(tpl, printer, db.queue
      .map((q) => {
        const found = db.products.find((p) => p.id === q.productId)!
        const foundBatch = q.batchId ? db.batches.find((b) => b.id === q.batchId) ?? null : null
        const { product, batch } = withExpiryOverride(found, foundBatch, q.expiryDate, q.showExpiry !== false, q.packedDate)
        const qr = batch ? db.qrCodes.find((x) => x.entityId === batch.id) : productQr(db, product.id)
        return { product, batch, shop: labelShop(db), qrUrl: qr ? qrUrl(qr.id) : '', quantity: q.quantity }
      }))

    let job: PrintJob = {
      id: newId('job'),
      delivery: 'RAW',
      printerId,
      templateId,
      createdBy: u.name,
      createdAt: nowIso(),
      finishedAt: null,
      items: db.queue.map((q) => ({ id: newId('item'), productId: q.productId, batchId: q.batchId, quantity: q.quantity, printed: 0, state: 'QUEUED', error: null, attempts: 1, ...(q.expiryDate ? { expiryDate: q.expiryDate } : {}), ...(q.showExpiry === false ? { showExpiry: false } : {}), ...(q.packedDate ? { packedDate: q.packedDate } : {}) })),
      prn,
    }
    const total = job.items.reduce((a, i) => a + i.quantity, 0)
    setDb((d) =>
      withAudit(
        { ...d, queue: d.queue.filter((q) => !db.queue.some((old) => old.id === q.id)), printJobs: [job, ...d.printJobs] },
        audit(u.name, 'PRINT_QUEUED', 'PRINT_JOB', job.id, `${total} labels (${job.items.length} products) → ${printer.name}`),
      ),
    )
    try {
      const result = await sendPrn(printer, prn, job.id)
      job = { ...job, spoolJobId: result.spoolJobId, items: job.items.map((i) => ({ ...i, state: 'SENT_TO_PRINTER' })) }
    } catch (e) {
      const error = (e as Error).message
      job = { ...job, submissionError: error, items: job.items.map((i) => ({ ...i, state: 'FAILED', error })) }
    }
    job = { ...job, finishedAt: nowIso() }
    logPrints(queued.map(({ q, product }) => ({
      method: 'PRN',
      status: job.submissionError ? 'UNCONFIRMED' : 'SPOOLED',
      printer: printer.name,
      templateId: tpl.id,
      templateName: tpl.name,
      productId: product.id,
      productCode: product.productCode,
      productName: product.name,
      quantity: q.quantity,
      expiryDate: q.showExpiry === false ? null : q.expiryDate ?? product.expiryDate ?? null,
    })))
    setDb((d) => withAudit(
      { ...d, printJobs: d.printJobs.map((j) => j.id === job.id ? { ...job } : j) },
      audit(u.name, job.submissionError ? 'PRINT_SUBMISSION_UNCONFIRMED' : 'PRINT_SPOOLED', 'PRINT_JOB', job.id,
        job.submissionError ?? `Windows job ${job.spoolJobId}; physical completion not confirmed`),
    ))
    return job
  },

  /** Save a job generated in the Printers > Choose product direct-PRN flow. */
  async recordDirectPrn(
    printerId: string,
    templateId: string,
    items: { productId: string; quantity: number; expiryDate?: string | null }[],
    spoolJobId: number | undefined,
    prn: string,
    printerLabel: string,
  ): Promise<PrintJob> {
    const u = requirePerm('print')
    const db = getDb()
    if (!db.templates.some((t) => t.id === templateId)) throw new ApiError('Label template not found')
    if (!items.length) throw new ApiError('Add at least one product to print')
    for (const item of items) {
      const product = db.products.find((p) => p.id === item.productId && p.status === 'ACTIVE')
      if (!product) throw new ApiError('A selected product is no longer available')
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000) throw new ApiError('Label quantities must be between 1 and 1,000')
    }
    const job: PrintJob = {
      id: newId('job'),
      delivery: 'RAW',
      printerName: printerLabel,
      spoolJobId,
      printerId,
      templateId,
      createdBy: u.name,
      createdAt: nowIso(),
      finishedAt: nowIso(),
      items: items.map((item) => ({ id: newId('item'), productId: item.productId, batchId: null, quantity: item.quantity, printed: 0, state: 'SENT_TO_PRINTER', error: null, attempts: 1 })),
      prn,
    }
    const total = items.reduce((sum, item) => sum + item.quantity, 0)
    const tpl = db.templates.find((t) => t.id === templateId)!
    logPrints(items.map((item) => {
      const product = db.products.find((p) => p.id === item.productId)!
      return {
        method: 'PRN' as const,
        status: spoolJobId ? 'SPOOLED' as const : 'UNCONFIRMED' as const,
        printer: printerLabel,
        templateId,
        templateName: tpl.name,
        productId: product.id,
        productCode: product.productCode,
        productName: product.name,
        quantity: item.quantity,
        // The expiry actually printed (queue choice), else the product's own.
        expiryDate: item.expiryDate !== undefined ? item.expiryDate : product.expiryDate ?? null,
      }
    }))
    setDb((d) => withAudit(
      { ...d, printJobs: [job, ...d.printJobs] },
      audit(u.name, 'PRINT_SPOOLED', 'PRINT_JOB', job.id, `Windows job ${spoolJobId}; ${total} labels sent to ${printerLabel}`),
    ))
    return job
  },

  async retryItem(jobId: string, itemId: string) {
    requirePerm('print')
    throw new ApiError(`Check the Windows queue before reprinting job ${jobId}, item ${itemId}. Automatic retry is disabled to prevent duplicate labels.`)
  },

  async retryFailed(jobId: string) {
    requirePerm('print')
    throw new ApiError(`Check the Windows queue before reprinting job ${jobId}. Use Requeue only when ready to print again.`)
  },

  /** Reprint = copy a finished job's items back into the queue. */
  async requeue(jobId: string) {
    requirePerm('print')
    const job = getDb().printJobs.find((j) => j.id === jobId)
    if (!job) return
    for (const i of job.items) {
      await queue.add(i.productId, i.quantity, i.batchId, i.expiryDate)
      if (i.showExpiry === false) {
        const entry = getDb().queue.find((q) => q.productId === i.productId && q.batchId === i.batchId)
        if (entry) await queue.setShowExpiry(entry.id, false)
      }
    }
  },
}

// ─── Printers ──────────────────────────────────────────────────────────────

export type PrinterInput = Omit<Printer, 'id' | 'status' | 'lastSeenAt'>

export const printers = {
  async create(input: PrinterInput): Promise<Printer> {
    const u = requirePerm('printers.manage')
    await latency()
    if (duplicatePrinter(getDb().printers, input)) throw new ApiError('A printer with this name already exists in this shop')
    const p: Printer = { ...input, name: input.name.trim(), id: newId('prn'), status: 'OFFLINE', lastSeenAt: nowIso() }
    setDb((d) => withAudit({ ...d, printers: [...d.printers, p] }, audit(u.name, 'PRINTER_ADDED', 'PRINTER', p.id, `${p.name} (${p.language})`)))
    return p
  },
  async update(id: string, input: PrinterInput) {
    const u = requirePerm('printers.manage')
    await latency()
    if (duplicatePrinter(getDb().printers, input, id)) throw new ApiError('A printer with this name already exists in this shop')
    setDb((d) => withAudit({ ...d, printers: d.printers.map((p) => (p.id === id ? { ...p, ...input } : p)) }, audit(u.name, 'PRINTER_UPDATED', 'PRINTER', id, `Updated ${input.name}`)))
  },
  async remove(id: string) {
    const u = requirePerm('printers.manage')
    await latency()
    const p = getDb().printers.find((x) => x.id === id)
    setDb((d) => withAudit({ ...d, printers: d.printers.filter((x) => x.id !== id) }, audit(u.name, 'PRINTER_REMOVED', 'PRINTER', id, `Removed ${p?.name}`)))
  },
  /** Ask the print agent to ping the printer. */
  async checkConnection(id: string): Promise<Printer['status']> {
    const p = getDb().printers.find((x) => x.id === id)
    if (!p) throw new ApiError('Printer not found')
    const names = await localPrinters()
    const status: Printer['status'] = names.includes(mappedPrinter(id)) ? 'CONNECTED' : 'OFFLINE'
    setDb((d) => ({ ...d, printers: d.printers.map((x) => x.id === id ? { ...x, status, lastSeenAt: nowIso() } : x) }))
    return status
  },
  async testPrint(id: string) {
    const u = requirePerm('print')
    const p = getDb().printers.find((x) => x.id === id)
    if (!p) throw new ApiError('Printer not found')
    const tpl = getDb().templates.find((t) => t.id === p.templateId)
    if (!tpl) throw new ApiError('Select a template')
    const width = tpl.widthMm * tpl.columns
    const k = p.dpi === 300 ? 12 : 8
    const prn = p.language === 'ZPL'
      ? `^XA^PW${width * k}^LL${tpl.heightMm * k}^FO12,12^A0N,24,24^FDRAW PRINT TEST^FS^PQ1^XZ\r\n`
      : `SIZE ${width} mm, ${tpl.heightMm} mm\r\nGAP 2 mm, 0 mm\r\nCLS\r\nTEXT 12,12,"2",0,1,1,"RAW PRINT TEST"\r\nPRINT 1,1\r\n`
    const result = await sendPrn(p, prn)
    setDb((d) => withAudit(d, audit(u.name, 'TEST_SPOOLED', 'PRINTER', id, `Windows job ${result.spoolJobId}`)))
  },
  /** Prints one sample line per printer font so you can see which fonts the printer has. */
  async fontTest(id: string) {
    const u = requirePerm('print')
    const p = getDb().printers.find((x) => x.id === id)
    if (!p) throw new ApiError('Printer not found')
    if (p.language === 'ESCPOS') throw new ApiError('ESC/POS printers do not support positioned label fonts.')
    const tpl = getDb().templates.find((t) => t.id === p.templateId)
    const prn = fontTestPrn(p.language, p.dpi, tpl?.widthMm ?? 50, tpl?.heightMm ?? 25)
    const result = await sendPrn(p, prn)
    setDb((d) => withAudit(d, audit(u.name, 'TEST_SPOOLED', 'PRINTER', id, `Font test, Windows job ${result.spoolJobId}`)))
  },
}

// ─── Templates ─────────────────────────────────────────────────────────────

export type TemplateInput = Omit<LabelTemplate, 'id' | 'createdAt' | 'updatedAt'>

export const templates = {
  async create(input: TemplateInput): Promise<LabelTemplate> {
    labelContentBox(input)
    validateElements(input)
    const u = requirePerm('templates.manage')
    await latency()
    if (getDb().templates.some((t) => t.name.toLowerCase() === input.name.trim().toLowerCase())) throw new ApiError('A template with that name exists')
    const t: LabelTemplate = { ...input, name: input.name.trim(), id: newId('tpl'), createdAt: nowIso(), updatedAt: nowIso() }
    setDb((d) => withAudit({ ...d, templates: [...d.templates, t] }, audit(u.name, 'TEMPLATE_CREATED', 'TEMPLATE', t.id, `${t.name} (${t.widthMm}×${t.heightMm}mm, ${t.columns}UP)`)))
    return t
  },
  async update(id: string, input: TemplateInput) {
    labelContentBox(input)
    validateElements(input)
    const u = requirePerm('templates.manage')
    await latency()
    setDb((d) =>
      withAudit(
        { ...d, templates: d.templates.map((t) => (t.id === id ? { ...t, ...input, updatedAt: nowIso() } : t)) },
        audit(u.name, 'TEMPLATE_UPDATED', 'TEMPLATE', id, `${input.name} (${input.widthMm}×${input.heightMm}mm, ${input.columns}UP)`),
      ),
    )
  },
  async remove(id: string) {
    const u = requirePerm('templates.manage')
    await latency()
    const inUse = getDb().printers.filter((p) => p.templateId === id)
    if (inUse.length) throw new ApiError(`In use by ${inUse.map((p) => p.name).join(', ')}`)
    setDb((d) => withAudit({ ...d, templates: d.templates.filter((t) => t.id !== id) }, audit(u.name, 'TEMPLATE_DELETED', 'TEMPLATE', id, 'Template deleted')))
  },
}

// ─── Settings & users ──────────────────────────────────────────────────────

export const settings = {
  async update(next: Settings) {
    const u = requirePerm('settings.manage')
    await latency()
    setDb((d) => withAudit({ ...d, settings: next }, audit(u.name, 'SETTINGS_UPDATED', 'SETTINGS', null, 'Organisation settings updated')))
  },
}

export const users = {
  async create(input: Omit<User, 'id'>) {
    const u = requirePerm('users.manage')
    await latency()
    if (getDb().users.some((x) => x.email.toLowerCase() === input.email.toLowerCase())) throw new ApiError('Email already in use')
    const user: User = { ...input, email: input.email.toLowerCase(), id: newId('usr') }
    setDb((d) => withAudit({ ...d, users: [...d.users, user] }, audit(u.name, 'USER_CREATED', 'USER', user.id, `${user.name} as ${user.role}`)))
  },
  async update(id: string, patch: Partial<Pick<User, 'role' | 'active' | 'name'>>) {
    const u = requirePerm('users.manage')
    await latency()
    if (id === u.id && (patch.role && patch.role !== 'ADMIN' || patch.active === false)) throw new ApiError('You cannot demote or disable yourself')
    setDb((d) =>
      withAudit(
        { ...d, users: d.users.map((x) => (x.id === id ? { ...x, ...patch } : x)) },
        audit(u.name, 'USER_UPDATED', 'USER', id, Object.entries(patch).map(([k, v]) => `${k} → ${v}`).join(', ')),
      ),
    )
  },
}

// --- Real product integration ---

export async function getProducts(): Promise<Product[]> {
  const products: Product[] = []
  let page = 1
  let lastPage = 1
  do {
    const res = await apiFetch<{ data: { products: any[]; pagination: { lastPage: number } } }>('POST', '/api/getProducts', {
      ...PRODUCT_FILTERS,
      page,
    })
    products.push(...(res.data.products ?? []).map(mapProductListRow))
    lastPage = Number(res.data.pagination?.lastPage) || 1
    page += 1
  } while (page <= lastPage)
  return products
}

/** Indexed tenant search used by the barcode workspace. Product, variant and EAN codes are resolved by the backend. */
export async function searchProducts(searchStr: string): Promise<Product[]> {
  const term = searchStr.trim()
  if (!term) return []
  const response = await apiFetch<{ data: BackendProductRow[] }>('POST', '/api/searchProducts', { searchStr: term })
  const user = currentUser()
  const shopId = user?.clientId ?? getDb().settings.defaultShopId
  const matches = (response.data ?? []).map((row) => ({ ...mapProductListRow(row), shopId }))
  setDb((db) => {
    const ids = new Set(matches.map((product) => product.id))
    return { ...db, products: [...db.products.filter((product) => !ids.has(product.id)), ...matches] }
  })
  return matches
}

export interface ProductCodePreview {
  productId: number
  productCode: string
  variantId: number
  variantCode: string
  provisional: true
}

export async function getProductCodePreview(productId?: number): Promise<ProductCodePreview> {
  const response = await apiFetch<{ data: ProductCodePreview }>('POST', '/api/getProductCodePreview', productId ? { productId } : {})
  return response.data
}


export async function getProduct(id: string): Promise<Product | null> {
  try {
    const stored = getDb().products.find((product) => product.id === id)
    const productId = stored?.backendProductId ?? Number(id)
    const res = await apiFetch<{ data: any }>('POST', '/api/getProductById', { productId })
    if (!res.data) return null
    const detail = mapProductDetail(res.data, stored?.variantId)
    return {
      ...detail,
      taxPercent: stored?.taxPercent ?? detail.taxPercent,
      shopId: stored?.shopId ?? detail.shopId,
      createdAt: stored?.createdAt ?? detail.createdAt,
      updatedAt: stored?.updatedAt ?? detail.updatedAt,
    }
  } catch {
    return null
  }
}

export async function syncProducts(): Promise<Product[]> {
  const [fetched, taxes] = await Promise.all([getProducts(), getTaxes().catch(() => [])])
  const taxPercent = new Map(taxes.map((tax) => [tax.id, tax.percent]))
  const user = currentUser()
  const shopId = user?.clientId ?? getDb().settings.defaultShopId
  const products = fetched.map((product) => ({ ...product, shopId, taxPercent: taxPercent.get(product.taxId ?? -1) ?? 0 }))
  setDb((db) => ({
    ...db,
    products,
    shops: user ? [{ id: shopId, name: user.businessName || db.settings.organizationName, address: user.businessAddress || '', location: user.city || '' }] : db.shops,
    settings: user?.businessName ? { ...db.settings, organizationName: user.businessName, defaultShopId: shopId } : db.settings,
    queue: db.queue.filter((entry) => products.some((product) => product.id === entry.productId)),
  }))
  return products
}

export interface MasterOption {
  id: number
  name: string
}

async function getMasterRows(path: string, key: string, extra: Record<string, unknown> = {}): Promise<any[]> {
  const rows: any[] = []
  let page = 1
  let lastPage = 1
  do {
    const res = await apiFetch<any>('POST', path, { ...MASTER_FILTERS, ...extra, page })
    rows.push(...(res.data?.[key] ?? []))
    lastPage = Number(res.data?.pagination?.lastPage) || 1
    page += 1
  } while (page <= lastPage)
  // Product selectors must never offer inactive masters, even if an older API
  // deployment ignores the status filter sent above.
  return rows.filter((row) => Number(row?.status) === 1)
}

export async function getCategories(): Promise<MasterOption[]> {
  return (await getMasterRows('/api/getCategories', 'categories'))
    .map((r: any) => ({ id: Number(r.id), name: String(r.categoryName ?? '') }))
}


export async function getBrands(): Promise<MasterOption[]> {
  return (await getMasterRows('/api/getBrands', 'brands'))
    .map((r: any) => ({ id: Number(r.id), name: String(r.brandName ?? '') }))
}

export async function getUnitTypes(): Promise<MasterOption[]> {
  return (await getMasterRows('/api/getUnitTypes', 'unitTypes'))
    .map((r: any) => ({ id: Number(r.id), name: String(r.unitTypeName ?? '') }))
}

export interface TaxOption {
  id: number
  name: string
  percent: number
}

export async function getTaxes(): Promise<TaxOption[]> {
  return (await getMasterRows('/api/getTaxes', 'taxes')).map((r: any) => ({
    id: Number(r.id),
    name: String(r.taxName ?? ''),
    percent: Number(r.taxPercent ?? 0),
  }))
}

export interface SubCategoryOption {
  id: number
  name: string
  categoryId: number
}

export async function getSubCategories(): Promise<SubCategoryOption[]> {
  return (await getMasterRows('/api/getSubCategories', 'subCategories', { categoryId: null })).map((r: any) => ({
    id: Number(r.id),
    name: String(r.subCategoryName ?? ''),
    categoryId: Number(r.categoryId ?? 0),
  }))
}

// ─── Real products (backend) ───────────────────────────────────────────────

const STATUS_TO_NUM: Record<string, number> = { ACTIVE: 1, INACTIVE: 0, ARCHIVED: 0 }

function toBackendProductDetails(input: ProductInput, productId?: number) {
  return {
    ...(productId ? { productId } : {}),
    productCode: input.productCode,
    productShortName: input.name,
    productFullName: input.fullName || input.name,
    categoryId: input.categoryId,
    subCategoryId: input.subCategoryId ?? null,
    brandId: input.brandId ?? null,
    unitTypeId: input.unitTypeId ?? null,
    ...(!productId ? { qoh: 0 } : {}),
    hsnCode: input.hsnCode || '0000',
    taxId: input.taxId,
    status: STATUS_TO_NUM[input.status] ?? 1,
  }
}

function toBackendVariant(input: ProductInput) {
  return {
    variantCode: input.variantCode || input.productCode, eanCode: input.eanCode ?? null,
    packSize: input.unit || 'PCS', sizeId: null, colourId: null,
    basicCost: 0, costPrice: 0, mrp: input.mrp, salePrice: input.salePrice,
    wholeSalePrice: null, dineInPrice: null, takeAwayPrice: null, salonDuration: null,
    priority: 1, status: STATUS_TO_NUM[input.status] ?? 1,
  }
}

export const products = {
  async create(input: ProductInput): Promise<Product> {
    const form = new FormData()
    form.set('productDetails', JSON.stringify(toBackendProductDetails(input)))
    form.set('variants', JSON.stringify([toBackendVariant(input)]))
    form.set('productControl', JSON.stringify({ allowWeighingScale: 0, allowDecimals: 0, allowDiscount: 0, allowPriceOverride: 0, kotRequired: 0, kit: 0 }))
    const response = await apiFormFetch<{ data: { productId: number; productCode: string } }>('/api/addProduct', form)
    const saved = (await syncProducts()).find((product) => product.backendProductId === response.data.productId)
    if (!saved) throw new ApiError('Product was saved but could not be reloaded.')
    return saved
  },
  async update(id: string, input: ProductInput): Promise<Product> {
    const existing = getDb().products.find((product) => product.id === id)
    const productId = existing?.backendProductId ?? Number(id)
    const form = new FormData()
    form.set('productDetails', JSON.stringify(toBackendProductDetails(input, productId)))
    await apiFormFetch('/api/updateProduct', form)
    if (existing?.variantId) {
      await apiFetch('POST', '/api/updateProductVariant', { ...toBackendVariant(input), variantId: existing.variantId })
    }
    const saved = (await syncProducts()).find((product) => product.backendProductId === productId)
    if (!saved) throw new ApiError('Product was updated but could not be reloaded.')
    return saved
  },
  async setStatus(id: string, status: Product['status']) {
    const existing = getDb().products.find((product) => product.id === id)
    if (!existing) throw new ApiError('Product not found')
    await this.update(id, { ...existing, status })
  },
}

// ─── Clients (super admin) ─────────────────────────────────────────────────
// Businesses onboarded in zenx-pos. Read and written through /api/admin on the backend.

export type ClientStatus = 'ACTIVE' | 'INACTIVE'

export interface ClientSummary {
  id: number
  businessName: string
  businessType: string | null
  contactPerson: string
  email: string
  mobile: string
  city: string
  state: string | null
  startDate: string | null
  endDate: string | null
  finalAmount: number
  subscriptionFinalAmount: number
  paidAmount: number
  status: ClientStatus
  userCount?: number
  createdAt: string | null
}

export interface ClientDetail extends ClientSummary {
  alternateMobile: string | null
  address: string
  pincode: number | null
  websiteUrl: string | null
  gstNumber: string | null
  panNumber: string | null
  fssaiNumber: string | null
  tradeLicenseNumber: string | null
  amount: number
  subscriptionDuration: number
  subscriptionAmount: number
  users: { id: number; name: string; email: string; mobile: string; roleTitle: string | null; role: 'ADMIN' | 'USER'; active: boolean }[]
  features: string[]
}

export interface ClientList {
  clients: ClientSummary[]
  total: number
  page: number
  pageSize: number
  summary: { total: number; active: number; expiring: number; expired: number }
}

export interface ClientLookups {
  gst: number // platform GST %, applied by the backend to both amounts
  businessTypes: { id: number; name: string }[]
  states: { id: number; name: string }[]
  features: { id: number; name: string; subFeatures: { id: number; name: string }[] }[]
}

export interface NewClientInput {
  businessName: string
  businessTypeId: number
  contactPerson: string
  email: string
  mobile: string
  alternateMobile?: string
  stateId: number
  city: string
  pincode?: number
  address: string
  websiteUrl?: string
  gstNumber?: string
  gstCode?: string
  panNumber?: string
  fssaiNumber?: string
  tradeLicenseNumber?: string
  amount: number
  discountType: 0 | 1 | 2
  discountValue: number
  subscriptionDuration: 1 | 2 | 3
  subscriptionAmount: number
  subscriptionDiscountType: 0 | 1 | 2
  subscriptionDiscountValue: number
  startDate: string
  endDate: string
  status: 0 | 1
  adminPassword: string
  featureIds: number[]
  subFeatureIds: number[]
}

/** Field-level validation errors from the backend, keyed like NewClientInput. */
export class ClientFormError extends ApiError {
  fields: Record<string, string>
  constructor(message: string, fields: Record<string, string>) {
    super(message)
    this.fields = fields
  }
}

export const clients = {
  async list(params: { search?: string; status?: ClientStatus | ''; businessTypeId?: number | ''; page?: number; pageSize?: number } = {}): Promise<ClientList> {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v))
    return (await apiFetch<{ data: ClientList }>('GET', `/api/admin/clients?${q}`)).data
  },
  async get(id: number): Promise<ClientDetail> {
    return (await apiFetch<{ data: ClientDetail }>('GET', `/api/admin/clients/${id}`)).data
  },
  async lookups(): Promise<ClientLookups> {
    return (await apiFetch<{ data: ClientLookups }>('GET', '/api/admin/lookups')).data
  },
  async create(input: NewClientInput): Promise<ClientDetail> {
    const token = getStoredToken()
    const res = await fetch(`${API_BASE}/api/admin/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(input),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      if (json?.fields) throw new ClientFormError(json.message ?? 'Please fix the highlighted fields', json.fields)
      throw new ApiError(json?.message || `HTTP ${res.status}`)
    }
    return json.data as ClientDetail
  },
  async setStatus(id: number, status: ClientStatus): Promise<ClientDetail> {
    return (await apiFetch<{ data: ClientDetail }>('PATCH', `/api/admin/clients/${id}/status`, { status })).data
  },
}

// ─── One client's data (super admin) ───────────────────────────────────────
// Same fields and rules as zenx-pos (dev/app/Http/Controllers/Api). Errors carry the
// offending field so forms can highlight it.

export class FieldError extends ApiError {
  field?: string
  constructor(message: string, field?: string) {
    super(message)
    this.field = field
  }
}

async function adminFetch<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getStoredToken()
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new FieldError(json?.message || `HTTP ${res.status}`, json?.field)
  return json.data as T
}

export type Flag = 0 | 1
export type MasterType = 'category' | 'subCategory' | 'brand' | 'unitType' | 'tax' | 'size' | 'colour'
export interface MasterRow { id: number; code: string; name: string; status: number; categoryId?: number; taxPercent?: number }
export interface ClientMasters {
  categories: MasterRow[]
  subCategories: MasterRow[]
  brands: MasterRow[]
  unitTypes: MasterRow[]
  taxes: MasterRow[]
  sizes: MasterRow[]
  colours: MasterRow[]
}

export interface WorkspaceVariant { id: number; variantCode: string; eanCode: string | null; packSize: string; sizeId: number | null; colourId: number | null; mrp: number; salePrice: number; variantQty: number; status: number }
export interface WorkspaceProduct {
  id: number
  productCode: string
  productShortName: string
  productFullName: string
  eanCode: string | null
  categoryId: number
  categoryName: string | null
  subCategoryName: string | null
  brandName: string | null
  unitTypeName: string | null
  hsnCode: string
  taxName: string | null
  taxPercent: number | null
  status: number
  createdAt: string
  variants: WorkspaceVariant[]
}

/** Body of zenx-pos Products::addProduct (productDetails / variants / productControl). */
export interface NewProductInput {
  productDetails: {
    productCode: string
    productShortName: string
    productFullName: string
    eanCode?: string | null
    categoryId: number
    subCategoryId?: number | null
    brandId?: number | null
    unitTypeId?: number | null
    hsnCode: string
    taxId: number
    status: Flag
  }
  variants: {
    packSize: string
    sizeId?: number | null
    colourId?: number | null
    basicCost?: number | null
    costPrice?: number | null
    mrp?: number | null
    salePrice?: number | null
    wholeSalePrice?: number | null
    dineInPrice?: number | null
    takeAwayPrice?: number | null
    salonDuration?: number | null
    priority: number
    status: Flag
  }[]
  productControl: { allowWeighingScale: Flag; allowDecimals: Flag; allowDiscount: Flag; allowPriceOverride: Flag; kotRequired: Flag; kit: Flag }
}

export interface ClientRole { id: number; roleTitle: string; status: number; users: number }
export interface ClientLogin {
  id: number
  name: string
  email: string
  mobile: string
  roleId: number
  roleTitle: string | null
  maxDiscountPercentage: number
  isAdmin: boolean
  status: number
  appRole: 'ADMIN' | 'USER'
}
export interface UserInput { roleId: number; name: string; email: string; mobile: string; password: string; maxDiscountPercentage: number; status: Flag }

export interface AccessPerm { status: number; isAdd: number; isEdit: number; isView: number }
export interface RoleAccess {
  billingAccess: { allowDiscount: number; allowPriceOverride: number; allowRefund: number }
  features: (AccessPerm & { featureId: number; featureName: string; subFeatures: (AccessPerm & { subFeatureId: number; subFeatureName: string })[] })[]
}

export const clientWorkspace = (clientId: number) => {
  const base = `/api/admin/clients/${clientId}`
  return {
    masters: () => adminFetch<ClientMasters>('GET', `${base}/masters`),
    createMaster: (type: MasterType, body: Record<string, unknown>) => adminFetch<MasterRow>('POST', `${base}/masters/${type}`, body),
    products: (q = '', page = 1) => adminFetch<{ data: WorkspaceProduct[]; pagination: { page: number; pageSize: number; total: number } }>('GET', `${base}/products?${new URLSearchParams({ q, page: String(page), pageSize: '20' })}`),
    createProduct: (body: NewProductInput) => adminFetch<WorkspaceProduct>('POST', `${base}/products`, body),
    setProductStatus: (productId: number, status: Flag) => adminFetch<WorkspaceProduct>('PATCH', `${base}/products/${productId}/status`, { status }),
    roles: () => adminFetch<ClientRole[]>('GET', `${base}/roles`),
    createRole: (body: { roleTitle: string; status: Flag }) => adminFetch<ClientRole>('POST', `${base}/roles`, body),
    access: (roleId: number) => adminFetch<RoleAccess>('GET', `${base}/roles/${roleId}/access`),
    saveAccess: (roleId: number, body: RoleAccess) => adminFetch<RoleAccess>('PUT', `${base}/roles/${roleId}/access`, body),
    users: () => adminFetch<ClientLogin[]>('GET', `${base}/users`),
    createUser: (body: UserInput) => adminFetch<ClientLogin>('POST', `${base}/users`, body),
    updateUser: (userId: number, body: UserInput) => adminFetch<ClientLogin>('PUT', `${base}/users/${userId}`, body),
  }
}

// ─── Print analytics ───────────────────────────────────────────────────────
// Print history stays in local storage because the current ZenxPOS backend has no print-log endpoint.
