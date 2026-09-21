// Mock backend API. Every function is async and shaped like a REST call so it can be
// swapped for fetch() against the real modular-monolith backend (§21) later.
// Business rules that the doc assigns to the backend live here, not in the UI:
//   • ID generation (§6)   • expiry engine (§15)   • QR identity immutability (§23)
//   • print lifecycle (§13) • audit trail (§18)       • RBAC enforcement (§19)

import type {
  AuditLog,
  Db,
  Device,
  LabelTemplate,
  PrintJob,
  PrintJobItem,
  PrintState,
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
import { computeExpiry, parseIso, todayIso } from '../lib/dates'
import { can, type Permission } from '../lib/permissions'
import { renderPrn } from '../lib/prnRenderer'

export class ApiError extends Error {}

const latency = (min = 120, max = 380) => new Promise((r) => setTimeout(r, min + Math.random() * (max - min)))
const nowIso = () => new Date().toISOString()

function currentUser(): User | null {
  const db = getDb()
  return db.users.find((u) => u.id === db.session.userId) ?? null
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
  return db.printers.find((p) => p.id === id)?.name ?? 'Removed printer'
}

export function productQr(db: Db, productId: string): QrCode | undefined {
  return db.qrCodes.find((q) => q.entityType === 'PRODUCT' && q.entityId === productId)
}

// ─── Auth ──────────────────────────────────────────────────────────────────

const resetCodes = new Map<string, string>()

export const auth = {
  async login(email: string, password: string): Promise<User> {
    await latency(400, 700)
    const u = getDb().users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
    if (!u || u.password !== password) throw new ApiError('Invalid email or password')
    if (!u.active) throw new ApiError('This account is disabled. Contact the owner.')
    setDb((db) => withAudit({ ...db, session: { userId: u.id } }, audit(u.name, 'USER_LOGIN', 'USER', u.id, 'Signed in')))
    return u
  },

  async logout() {
    const u = currentUser()
    setDb((db) => withAudit({ ...db, session: { userId: null } }, audit(u?.name ?? 'unknown', 'USER_LOGOUT', 'USER', u?.id ?? null, 'Signed out')))
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

// ─── Products ──────────────────────────────────────────────────────────────

function validateProduct(input: ProductInput, excludeId?: string) {
  const db = getDb()
  if (!input.name.trim()) throw new ApiError('Product name is required')
  if (!/^\d{4,14}$/.test(input.productCode)) throw new ApiError('Product code must be 4–14 digits')
  if (db.products.some((p) => p.productCode === input.productCode && p.id !== excludeId)) throw new ApiError(`Product code ${input.productCode} already exists`)
  if (input.eanCode && !/^\d{8}$|^\d{12,13}$/.test(input.eanCode)) throw new ApiError('EAN/UPC must be 8, 12 or 13 digits')
  if (input.mrp <= 0) throw new ApiError('MRP must be greater than zero')
  if (input.salePrice > input.mrp) throw new ApiError('Sale price cannot exceed MRP')
  if (input.expiryRule === 'CUSTOM' && (!input.shelfLifeMonths || input.shelfLifeMonths < 1)) throw new ApiError('Custom shelf life needs at least 1 month')
  const expiry = computeExpiry(input.packedDate, input.expiryRule, input.shelfLifeMonths)
  if (expiry && parseIso(expiry) <= parseIso(input.packedDate)) throw new ApiError('Expiry must be after packed date')
  return expiry
}

export const products = {
  async create(input: ProductInput): Promise<Product> {
    const u = requirePerm('products.manage')
    await latency()
    const expiryDate = validateProduct(input)
    const id = newId('prd')
    const t = nowIso()
    const product: Product = { ...input, id, globalId: id, expiryDate, createdAt: t, updatedAt: t }
    const qr: QrCode = { id: newId('qr'), entityType: 'PRODUCT', entityId: id, createdAt: t, status: 'ACTIVE' }
    const batch: ProductBatch = {
      id: newId('batch'),
      productId: id,
      batchCode: `B${input.packedDate.replaceAll('-', '')}`,
      packedDate: input.packedDate,
      expiryDate,
      quantity: 0,
      createdAt: t,
    }
    const bQr: QrCode = { id: newId('qr'), entityType: 'PRODUCT_BATCH', entityId: batch.id, createdAt: t, status: 'ACTIVE' }
    setDb((db) =>
      withAudit(
        { ...db, products: [...db.products, product], batches: [...db.batches, batch], qrCodes: [...db.qrCodes, qr, bQr] },
        audit(u.name, 'PRODUCT_CREATED', 'PRODUCT', id, `Created ${product.name}`),
        audit('system', 'QR_GENERATED', 'QR', qr.id, `Immutable QR identity issued for ${product.name}`),
        audit('system', 'BATCH_CREATED', 'BATCH', batch.id, `${batch.batchCode} for ${product.name}`),
      ),
    )
    return product
  },

  async update(id: string, input: ProductInput): Promise<Product> {
    const u = requirePerm('products.manage')
    await latency()
    const expiryDate = validateProduct(input, id)
    const prev = getDb().products.find((p) => p.id === id)
    if (!prev) throw new ApiError('Product not found')
    const next: Product = { ...prev, ...input, expiryDate, updatedAt: nowIso() }
    const changes: string[] = []
    const keys: (keyof ProductInput)[] = ['name', 'productCode', 'eanCode', 'mrp', 'salePrice', 'packedDate', 'expiryRule', 'status']
    keys.forEach((k) => prev[k] !== next[k] && changes.push(`${k}: ${prev[k] ?? '—'} → ${next[k] ?? '—'}`))
    setDb((db) =>
      withAudit(
        { ...db, products: db.products.map((p) => (p.id === id ? next : p)) },
        audit(u.name, 'PRODUCT_UPDATED', 'PRODUCT', id, changes.length ? changes.join(', ') : 'No field changes'),
      ),
    )
    return next
  },

  async setStatus(id: string, status: Product['status']) {
    const u = requirePerm('products.manage')
    await latency()
    setDb((db) =>
      withAudit(
        { ...db, products: db.products.map((p) => (p.id === id ? { ...p, status, updatedAt: nowIso() } : p)) },
        audit(u.name, status === 'ARCHIVED' ? 'PRODUCT_ARCHIVED' : 'PRODUCT_UPDATED', 'PRODUCT', id, `Status → ${status}`),
      ),
    )
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
  async add(productId: string, quantity: number, batchId: string | null = null) {
    requirePerm('print')
    await latency(60, 140)
    const db = getDb()
    const p = db.products.find((x) => x.id === productId)
    if (!p) throw new ApiError('Product not found')
    if (p.status !== 'ACTIVE') throw new ApiError(`${p.name} is ${p.status.toLowerCase()} and cannot be printed`)
    if (quantity < 1 || quantity > 1000) throw new ApiError('Quantity must be between 1 and 1000')
    setDb((d) => {
      const existing = d.queue.find((q) => q.productId === productId && q.batchId === batchId)
      return existing
        ? { ...d, queue: d.queue.map((q) => (q === existing ? { ...q, quantity: Math.min(1000, q.quantity + quantity) } : q)) }
        : { ...d, queue: [...d.queue, { id: newId('q'), productId, batchId, quantity }] }
    })
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

const STEP_MS: Partial<Record<PrintState, number>> = { QUEUED: 350, VALIDATING: 450, GENERATING: 500, SENT_TO_PRINTER: 450 }

function patchItem(jobId: string, itemId: string, patch: Partial<PrintJobItem>) {
  setDb((d) => ({
    ...d,
    printJobs: d.printJobs.map((j) => (j.id === jobId ? { ...j, items: j.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) } : j)),
  }))
}

function finishJobIfDone(jobId: string) {
  const job = getDb().printJobs.find((j) => j.id === jobId)
  if (!job || job.finishedAt) return
  if (job.items.every((i) => i.state === 'PRINTED' || i.state === 'FAILED')) {
    const printed = job.items.reduce((a, i) => a + i.printed, 0)
    const failed = job.items.filter((i) => i.state === 'FAILED').length
    setDb((d) =>
      withAudit(
        { ...d, printJobs: d.printJobs.map((j) => (j.id === jobId ? { ...j, finishedAt: nowIso() } : j)) },
        audit('print-agent', failed ? 'PRINT_PARTIAL' : 'PRINT_COMPLETED', 'PRINT_JOB', jobId, `${printed} labels printed${failed ? `, ${failed} item(s) failed` : ''}`),
      ),
    )
  }
}

/** Simulates the Local Print Agent (§14) receiving the job over WebSocket and reporting state. */
async function runItem(jobId: string, itemId: string) {
  const step = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const get = () => {
    const d = getDb()
    const job = d.printJobs.find((j) => j.id === jobId)!
    return { d, job, item: job.items.find((i) => i.id === itemId)!, printer: d.printers.find((p) => p.id === job.printerId) }
  }
  const startPrinted = get().item.printed
  const fail = (error: string) => {
    const { job, item, d, printer } = get()
    patchItem(jobId, itemId, { state: 'FAILED', error })
    const product = d.products.find((p) => p.id === item.productId)
    const base = { jobId, productId: item.productId, printerId: job.printerId, shopId: printer?.shopId ?? '', at: nowIso() }
    const printedNow = item.printed - startPrinted
    setDb((dd) =>
      withAudit(
        {
          ...dd,
          printEvents: [
            ...dd.printEvents,
            ...(printedNow > 0 ? [{ ...base, id: newId('evt'), quantity: printedNow, success: true }] : []),
            { ...base, id: newId('evt'), quantity: item.quantity - item.printed, success: false },
          ],
        },
        audit('print-agent', 'PRINT_FAILED', 'PRINT_JOB', jobId, `${product?.name}: ${error}`),
      ),
    )
    finishJobIfDone(jobId)
  }

  for (const state of ['VALIDATING', 'GENERATING', 'SENT_TO_PRINTER'] as PrintState[]) {
    await step(STEP_MS[state] ?? 400)
    const { d, item, printer } = get()
    if (state === 'VALIDATING') {
      const product = d.products.find((p) => p.id === item.productId)
      if (!product || product.status !== 'ACTIVE') return fail('Product is not active')
    }
    if (state === 'SENT_TO_PRINTER' && (!printer || printer.status === 'OFFLINE' || printer.status === 'ERROR')) {
      return fail(`Printer ${printer?.name ?? ''} is ${printer?.status.toLowerCase() ?? 'missing'} — check the print agent`)
    }
    patchItem(jobId, itemId, { state })
  }

  patchItem(jobId, itemId, { state: 'PRINTING' })
  const { item } = get()
  const perLabel = Math.max(40, Math.min(220, 2400 / item.quantity))
  const failAt = Math.random() < 0.06 ? Math.floor(item.quantity * (0.3 + Math.random() * 0.5)) : -1
  for (let n = item.printed + 1; n <= item.quantity; n++) {
    await step(perLabel)
    if (n === failAt) return fail('Ribbon / paper out detected')
    patchItem(jobId, itemId, { printed: n })
  }
  const { job, printer } = get()
  patchItem(jobId, itemId, { state: 'PRINTED', error: null })
  setDb((d) => ({
    ...d,
    printEvents: [
      ...d.printEvents,
      { id: newId('evt'), jobId, productId: item.productId, printerId: job.printerId, shopId: printer?.shopId ?? '', quantity: item.quantity - startPrinted, success: true, at: nowIso() },
    ],
  }))
  finishJobIfDone(jobId)
}

async function runJob(jobId: string) {
  const job = getDb().printJobs.find((j) => j.id === jobId)
  if (!job) return
  setDb((d) => ({ ...d, printers: d.printers.map((p) => (p.id === job.printerId && p.status === 'CONNECTED' ? { ...p, status: 'BUSY' } : p)) }))
  for (const item of job.items) {
    if (item.state === 'QUEUED') await runItem(jobId, item.id)
  }
  setDb((d) => ({ ...d, printers: d.printers.map((p) => (p.id === job.printerId && p.status === 'BUSY' ? { ...p, status: 'CONNECTED', lastSeenAt: nowIso() } : p)) }))
}

export const printing = {
  /** Creates a print job from the queue, renders PRN, dispatches to the agent. */
  async printQueue(printerId: string, templateId: string): Promise<PrintJob> {
    const u = requirePerm('print')
    await latency(150, 250)
    const db = getDb()
    if (!db.queue.length) throw new ApiError('The print queue is empty')
    const printer = db.printers.find((p) => p.id === printerId)
    const tpl = db.templates.find((t) => t.id === templateId)
    if (!printer) throw new ApiError('Select a printer')
    if (!tpl) throw new ApiError('Select a label template')

    const prn = db.queue
      .map((q) => {
        const product = db.products.find((p) => p.id === q.productId)!
        const batch = q.batchId ? db.batches.find((b) => b.id === q.batchId) ?? null : null
        const qr = batch ? db.qrCodes.find((x) => x.entityId === batch.id) : productQr(db, product.id)
        return renderPrn(tpl, printer, { product, batch, shop: db.shops.find((s) => s.id === product.shopId), qrUrl: qr ? qrUrl(qr.id) : '', quantity: q.quantity })
      })
      .join('\n\n')

    const job: PrintJob = {
      id: newId('job'),
      printerId,
      templateId,
      createdBy: u.name,
      createdAt: nowIso(),
      finishedAt: null,
      items: db.queue.map((q) => ({ id: newId('item'), productId: q.productId, batchId: q.batchId, quantity: q.quantity, printed: 0, state: 'QUEUED', error: null, attempts: 1 })),
      prn,
    }
    const total = job.items.reduce((a, i) => a + i.quantity, 0)
    setDb((d) =>
      withAudit(
        { ...d, queue: [], printJobs: [job, ...d.printJobs] },
        audit(u.name, 'PRINT_QUEUED', 'PRINT_JOB', job.id, `${total} labels (${job.items.length} products) → ${printer.name}`),
      ),
    )
    setTimeout(() => void runJob(job.id), STEP_MS.QUEUED)
    return job
  },

  /**
   * Browser printing: the OS driver owns the job once the dialog is confirmed, so
   * there is no per-label feedback — the job is recorded as printed in one step.
   */
  async recordBrowserPrint(templateId: string): Promise<PrintJob> {
    const u = requirePerm('print')
    const db = getDb()
    if (!db.queue.length) throw new ApiError('The print queue is empty')
    const t = nowIso()
    const job: PrintJob = {
      id: newId('job'),
      printerId: BROWSER_PRINTER_ID,
      templateId,
      createdBy: u.name,
      createdAt: t,
      finishedAt: t,
      items: db.queue.map((q) => ({ id: newId('item'), productId: q.productId, batchId: q.batchId, quantity: q.quantity, printed: q.quantity, state: 'PRINTED' as const, error: null, attempts: 1 })),
      prn: null,
    }
    const total = job.items.reduce((a, i) => a + i.quantity, 0)
    setDb((d) =>
      withAudit(
        {
          ...d,
          queue: [],
          printJobs: [job, ...d.printJobs],
          printEvents: [
            ...d.printEvents,
            ...job.items.map((i) => ({
              id: newId('evt'),
              jobId: job.id,
              productId: i.productId,
              printerId: BROWSER_PRINTER_ID,
              shopId: d.products.find((p) => p.id === i.productId)?.shopId ?? '',
              quantity: i.quantity,
              success: true,
              at: t,
            })),
          ],
        },
        audit(u.name, 'PRINT_BROWSER', 'PRINT_JOB', job.id, `${total} labels sent to the system print dialog`),
      ),
    )
    return job
  },

  async retryItem(jobId: string, itemId: string) {
    const u = requirePerm('print')
    await latency(80, 160)
    setDb((d) =>
      withAudit(
        {
          ...d,
          printJobs: d.printJobs.map((j) =>
            j.id === jobId ? { ...j, finishedAt: null, items: j.items.map((i) => (i.id === itemId ? { ...i, state: 'QUEUED', error: null, attempts: i.attempts + 1 } : i)) } : j,
          ),
        },
        audit(u.name, 'PRINT_RETRY', 'PRINT_JOB', jobId, 'Retrying failed item'),
      ),
    )
    void runJob(jobId)
  },

  async retryFailed(jobId: string) {
    const job = getDb().printJobs.find((j) => j.id === jobId)
    for (const i of job?.items.filter((x) => x.state === 'FAILED') ?? []) {
      await printing.retryItem(jobId, i.id)
    }
  },

  /** Reprint = copy a finished job's items back into the queue. */
  async requeue(jobId: string) {
    requirePerm('print')
    const job = getDb().printJobs.find((j) => j.id === jobId)
    if (!job) return
    for (const i of job.items) await queue.add(i.productId, i.quantity, i.batchId)
  },
}

// ─── Printers ──────────────────────────────────────────────────────────────

export type PrinterInput = Omit<Printer, 'id' | 'status' | 'lastSeenAt'>

export const printers = {
  async create(input: PrinterInput): Promise<Printer> {
    const u = requirePerm('printers.manage')
    await latency()
    const p: Printer = { ...input, id: newId('prn'), status: 'OFFLINE', lastSeenAt: nowIso() }
    setDb((d) => withAudit({ ...d, printers: [...d.printers, p] }, audit(u.name, 'PRINTER_ADDED', 'PRINTER', p.id, `${p.name} (${p.language})`)))
    return p
  },
  async update(id: string, input: PrinterInput) {
    const u = requirePerm('printers.manage')
    await latency()
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
    await latency(700, 1300)
    const p = getDb().printers.find((x) => x.id === id)
    if (!p) throw new ApiError('Printer not found')
    const status: Printer['status'] = p.status === 'BUSY' ? 'BUSY' : Math.random() < (p.status === 'OFFLINE' ? 0.5 : 0.95) ? 'CONNECTED' : 'OFFLINE'
    setDb((d) =>
      withAudit(
        { ...d, printers: d.printers.map((x) => (x.id === id ? { ...x, status, lastSeenAt: status === 'OFFLINE' ? x.lastSeenAt : nowIso() } : x)) },
        audit('print-agent', status === 'OFFLINE' ? 'PRINTER_OFFLINE' : 'PRINTER_ONLINE', 'PRINTER', id, `${p.name} is ${status.toLowerCase()}`),
      ),
    )
    return status
  },
  async testPrint(id: string) {
    const u = requirePerm('print')
    await latency(600, 1000)
    const p = getDb().printers.find((x) => x.id === id)
    if (!p || p.status === 'OFFLINE' || p.status === 'ERROR') throw new ApiError(`${p?.name ?? 'Printer'} is offline`)
    setDb((d) => withAudit(d, audit(u.name, 'TEST_PRINT', 'PRINTER', id, `Test label sent to ${p.name}`)))
  },
}

// ─── Templates ─────────────────────────────────────────────────────────────

export type TemplateInput = Omit<LabelTemplate, 'id' | 'createdAt' | 'updatedAt'>

export const templates = {
  async create(input: TemplateInput): Promise<LabelTemplate> {
    const u = requirePerm('templates.manage')
    await latency()
    if (getDb().templates.some((t) => t.name.toLowerCase() === input.name.trim().toLowerCase())) throw new ApiError('A template with that name exists')
    const t: LabelTemplate = { ...input, name: input.name.trim(), id: newId('tpl'), createdAt: nowIso(), updatedAt: nowIso() }
    setDb((d) => withAudit({ ...d, templates: [...d.templates, t] }, audit(u.name, 'TEMPLATE_CREATED', 'TEMPLATE', t.id, `${t.name} (${t.widthMm}×${t.heightMm}mm, ${t.columns}UP)`)))
    return t
  },
  async update(id: string, input: TemplateInput) {
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
    if (id === u.id && (patch.role && patch.role !== 'OWNER' || patch.active === false)) throw new ApiError('You cannot demote or disable yourself')
    setDb((d) =>
      withAudit(
        { ...d, users: d.users.map((x) => (x.id === id ? { ...x, ...patch } : x)) },
        audit(u.name, 'USER_UPDATED', 'USER', id, Object.entries(patch).map(([k, v]) => `${k} → ${v}`).join(', ')),
      ),
    )
  },
}
