import type {
  AuditLog,
  Db,
  Device,
  LabelTemplate,
  PrintEvent,
  PrintJob,
  Printer,
  Product,
  ProductBatch,
  QrCode,
  QrScanEvent,
  Shop,
  User,
} from '../types'
import { newId } from '../lib/ids'
import { DAY, addMonths, computeExpiry, toIso } from '../lib/dates'

export const DB_VERSION = 4

// Deterministic PRNG so the seeded demo data is stable between reloads/resets.
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20260919)
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]
const between = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min
function weighted<T>(items: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rand() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

const SHOPS: Omit<Shop, 'id'>[] = [
  { name: 'VIJAYA DURGA SUPER MARKET', address: 'Road No. 36, Jubilee Hills, Hyderabad', location: 'Jubilee Hills' },
  { name: 'VIJAYA DURGA SUPER MARKET', address: 'Road No. 12, Banjara Hills, Hyderabad', location: 'Banjara Hills' },
  { name: 'VIJAYA DURGA SUPER MARKET', address: 'KPHB Colony, Kukatpally, Hyderabad', location: 'Kukatpally' },
]

// name, category, brand, mrp, sale, unit, rule, customMonths, weight (popularity)
const CATALOG: [string, string, string, number, number, string, Product['expiryRule'], number | null, number][] = [
  ['TOOR DAL 1KG', 'Pulses', 'Loose', 195, 138, 'KG', 'MONTHS_3', null, 10],
  ['SUGAR 1KG', 'Staples', 'Loose', 52, 46, 'KG', 'MONTHS_12', null, 9],
  ['NATRAJ PENCILS (10)', 'Stationery', 'Natraj', 60, 55, 'PACK', 'NONE', null, 6],
  ['APSARA PLATINUM PENCIL', 'Stationery', 'Apsara', 50, 45, 'PACK', 'NONE', null, 5],
  ['MOONG DAL 500G', 'Pulses', 'Loose', 98, 84, 'PCS', 'MONTHS_3', null, 7],
  ['CHANA DAL 1KG', 'Pulses', 'Loose', 120, 99, 'KG', 'MONTHS_3', null, 6],
  ['SONA MASOORI RICE 5KG', 'Staples', 'Loose', 420, 365, 'BAG', 'MONTHS_6', null, 8],
  ['BASMATI RICE 1KG', 'Staples', 'Loose', 180, 149, 'KG', 'MONTHS_12', null, 5],
  ['GROUNDNUT OIL 1L', 'Oils', 'Loose', 210, 189, 'LTR', 'MONTHS_6', null, 6],
  ['SUNFLOWER OIL 1L', 'Oils', 'Loose', 165, 149, 'LTR', 'MONTHS_6', null, 5],
  ['WHEAT ATTA 5KG', 'Staples', 'Loose', 285, 249, 'BAG', 'MONTHS_3', null, 7],
  ['RAVA (SOOJI) 500G', 'Staples', 'Loose', 48, 42, 'PCS', 'MONTHS_3', null, 4],
  ['POHA THICK 500G', 'Breakfast', 'Loose', 55, 45, 'PCS', 'MONTHS_3', null, 4],
  ['JAGGERY 1KG', 'Staples', 'Loose', 90, 78, 'KG', 'MONTHS_6', null, 3],
  ['TURMERIC POWDER 200G', 'Spices', 'House Pack', 70, 58, 'PCS', 'MONTHS_12', null, 4],
  ['RED CHILLI POWDER 200G', 'Spices', 'House Pack', 85, 72, 'PCS', 'MONTHS_12', null, 4],
  ['CORIANDER POWDER 200G', 'Spices', 'House Pack', 60, 52, 'PCS', 'MONTHS_12', null, 3],
  ['CASHEW W320 250G', 'Dry Fruits', 'House Pack', 320, 279, 'PCS', 'CUSTOM', 4, 3],
  ['ALMONDS 250G', 'Dry Fruits', 'House Pack', 299, 259, 'PCS', 'CUSTOM', 4, 3],
  ['PEANUTS 500G', 'Staples', 'Loose', 95, 82, 'PCS', 'MONTHS_3', null, 4],
  ['TAMARIND 500G', 'Spices', 'Loose', 110, 94, 'PCS', 'MONTHS_12', null, 2],
  ['MUSTARD SEEDS 100G', 'Spices', 'House Pack', 25, 22, 'PCS', 'MONTHS_12', null, 2],
  ['CLASSMATE NOTEBOOK 172P', 'Stationery', 'Classmate', 65, 60, 'PCS', 'NONE', null, 3],
  ['GHEE 500ML', 'Dairy', 'House Pack', 340, 315, 'PCS', 'CUSTOM', 9, 3],
]

export const DEFAULT_FIELDS: LabelTemplate['fields'] = {
  shopName: true,
  address: true,
  productName: true,
  mrp: true,
  salePrice: true,
  barcode: true,
  productCode: true,
  packedDate: true,
  expiryDate: true,
  batchCode: false,
  qr: true,
}

const DEVICES: Device[] = ['Android', 'iOS', 'Desktop', 'Other']

export function createSeed(now = Date.now()): Db {
  const iso = (t: number) => new Date(t).toISOString()
  const daysAgo = (d: number) => toIso(new Date(now - d * DAY))

  const shops: Shop[] = SHOPS.map((s) => ({ ...s, id: newId('shop', now - 400 * DAY) }))

  const users: User[] = [
    { id: newId('usr'), name: 'Srinivas Rao', email: 'owner@vijayadurga.in', role: 'ADMIN', active: true, password: 'owner@123' },
    { id: newId('usr'), name: 'Lakshmi Devi', email: 'admin@vijayadurga.in', role: 'ADMIN', active: true, password: 'admin@123' },
    { id: newId('usr'), name: 'Ravi Kumar', email: 'ravi@vijayadurga.in', role: 'USER', active: true, password: 'staff@123' },
    { id: newId('usr'), name: 'Anitha', email: 'anitha@vijayadurga.in', role: 'USER', active: true, password: 'staff@123' },
    { id: newId('usr'), name: 'Auditor', email: 'audit@vijayadurga.in', role: 'USER', active: true, password: 'viewer@123' },
  ]

  const templates: LabelTemplate[] = [
    { id: newId('tpl'), name: 'Grocery-50x25', widthMm: 50, heightMm: 25, columns: 2, orientation: 'LANDSCAPE', fields: { ...DEFAULT_FIELDS, address: false }, barcodeType: 'CODE128', createdAt: iso(now - 200 * DAY), updatedAt: iso(now - 30 * DAY) },
    { id: newId('tpl'), name: 'Grocery-50x30', widthMm: 50, heightMm: 30, columns: 2, orientation: 'LANDSCAPE', fields: { ...DEFAULT_FIELDS }, barcodeType: 'CODE128', createdAt: iso(now - 200 * DAY), updatedAt: iso(now - 12 * DAY) },
    { id: newId('tpl'), name: 'Shelf-75x50', widthMm: 75, heightMm: 50, columns: 1, orientation: 'LANDSCAPE', fields: { ...DEFAULT_FIELDS, batchCode: true }, barcodeType: 'CODE128', createdAt: iso(now - 90 * DAY), updatedAt: iso(now - 90 * DAY) },
    { id: newId('tpl'), name: 'Stationery-38x25', widthMm: 38, heightMm: 25, columns: 3, orientation: 'LANDSCAPE', fields: { ...DEFAULT_FIELDS, address: false, packedDate: false, expiryDate: false, qr: false }, barcodeType: 'CODE128', createdAt: iso(now - 60 * DAY), updatedAt: iso(now - 60 * DAY) },
  ]

  const printers: Printer[] = [
    { id: newId('prn'), name: 'Zebra ZD421', manufacturer: 'Zebra', model: 'ZD421', language: 'ZPL', connectionType: 'USB', address: 'USB001', dpi: 203, templateId: templates[0].id, status: 'CONNECTED', lastSeenAt: iso(now - 20_000), shopId: shops[0].id },
    { id: newId('prn'), name: 'TSC TE244', manufacturer: 'TSC', model: 'TE244', language: 'TSPL', connectionType: 'USB', address: 'USB002', dpi: 203, templateId: templates[1].id, status: 'CONNECTED', lastSeenAt: iso(now - 40_000), shopId: shops[0].id },
    { id: newId('prn'), name: 'TVS LP 46 Neo', manufacturer: 'TVS', model: 'LP 46 NEO', language: 'TSPL', connectionType: 'USB', address: 'USB001', dpi: 203, templateId: templates[1].id, status: 'CONNECTED', lastSeenAt: iso(now - 15_000), shopId: shops[1].id },
    { id: newId('prn'), name: 'Zebra GC420t', manufacturer: 'Zebra', model: 'GC420t', language: 'ZPL', connectionType: 'NETWORK', address: '192.168.1.42:9100', dpi: 203, templateId: templates[2].id, status: 'CONNECTED', lastSeenAt: iso(now - 60_000), shopId: shops[1].id },
    { id: newId('prn'), name: 'TSC DA210', manufacturer: 'TSC', model: 'DA210', language: 'TSPL', connectionType: 'NETWORK', address: '192.168.2.20:9100', dpi: 203, templateId: templates[0].id, status: 'CONNECTED', lastSeenAt: iso(now - 30_000), shopId: shops[2].id },
    { id: newId('prn'), name: 'TVS RP 3160 Gold', manufacturer: 'TVS', model: 'RP 3160 GOLD', language: 'ESCPOS', connectionType: 'USB', address: 'USB003', dpi: 203, templateId: templates[3].id, status: 'CONNECTED', lastSeenAt: iso(now - 50_000), shopId: shops[2].id },
    { id: newId('prn'), name: 'Zebra ZD230 (Store Room)', manufacturer: 'Zebra', model: 'ZD230', language: 'ZPL', connectionType: 'NETWORK', address: '192.168.1.55:9100', dpi: 203, templateId: templates[0].id, status: 'OFFLINE', lastSeenAt: iso(now - 3 * DAY), shopId: shops[0].id },
  ]

  const products: Product[] = []
  const batches: ProductBatch[] = []
  const qrCodes: QrCode[] = []
  const weights: number[] = []

  CATALOG.forEach(([name, category, brand, mrp, salePrice, unit, rule, customMonths, weight], i) => {
    const created = now - (180 - i * 3) * DAY
    const id = newId('prd', created)
    // Latest batch packed recently; a few older ones are near/over expiry to exercise the expiry engine.
    const lastPackedAgo = i % 7 === 3 ? 85 : i % 11 === 5 ? 100 : between(1, 20)
    const packedDate = daysAgo(lastPackedAgo)
    const expiryDate = computeExpiry(packedDate, rule, customMonths)
    products.push({
      id,
      globalId: id,
      productCode: String(401 + i * 7).padStart(8, '0'),
      eanCode: brand !== 'Loose' && brand !== 'House Pack' ? `89010${String(12345 + i * 101).padStart(7, '0')}` : null,
      pluCode: unit === 'KG' ? String(100 + i) : null,
      name,
      category,
      brand,
      mrp,
      salePrice,
      taxPercent: category === 'Stationery' ? 12 : category === 'Dry Fruits' ? 5 : 0,
      unit,
      packedDate,
      expiryRule: rule,
      shelfLifeMonths: customMonths,
      expiryDate,
      shopId: shops[i % shops.length].id,
      status: i === CATALOG.length - 1 ? 'INACTIVE' : 'ACTIVE',
      createdAt: iso(created),
      updatedAt: iso(now - between(0, 20) * DAY),
    })
    weights.push(weight)
    qrCodes.push({ id: newId('qr', created), entityType: 'PRODUCT', entityId: id, createdAt: iso(created), status: 'ACTIVE' })

    // 2–4 batches per product, most recent matches product.packedDate
    const nBatches = between(2, 4)
    for (let b = nBatches - 1; b >= 0; b--) {
      const bPacked = b === 0 ? packedDate : daysAgo(lastPackedAgo + b * between(20, 35))
      const bId = newId('batch', new Date(bPacked).getTime())
      batches.push({
        id: bId,
        productId: id,
        batchCode: `B${bPacked.replaceAll('-', '')}`,
        packedDate: bPacked,
        expiryDate: rule === 'NONE' ? null : rule === 'CUSTOM' ? addMonths(bPacked, customMonths ?? 3) : computeExpiry(bPacked, rule, null),
        quantity: between(20, 200),
        createdAt: iso(new Date(bPacked).getTime()),
      })
      qrCodes.push({ id: newId('qr', new Date(bPacked).getTime()), entityType: 'PRODUCT_BATCH', entityId: bId, createdAt: iso(new Date(bPacked).getTime()), status: 'ACTIVE' })
    }
  })

  // ── Historical print + scan activity (60 days) ─────────────────────────
  const printEvents: PrintEvent[] = []
  const scanEvents: QrScanEvent[] = []
  const printJobs: PrintJob[] = []
  const activeProducts = products.filter((p) => p.status === 'ACTIVE')
  const activeWeights = activeProducts.map((p) => weights[products.indexOf(p)])
  const onlinePrinters = printers.filter((p) => p.status === 'CONNECTED')
  const visitors = Array.from({ length: 900 }, (_, i) => `v${i}`)

  for (let d = 59; d >= 0; d--) {
    const dayStart = new Date(now - d * DAY)
    dayStart.setHours(0, 0, 0, 0)
    const weekday = dayStart.getDay()
    const busy = weekday === 0 || weekday === 6 ? 1.35 : 1
    const trend = 0.75 + (60 - d) / 120 // growing adoption
    const jobsToday = Math.round(between(8, 14) * busy * trend)
    for (let j = 0; j < jobsToday; j++) {
      const at = dayStart.getTime() + between(8 * 60, 21 * 60) * 60_000
      if (at > now) continue
      const printer = pick(onlinePrinters)
      const product = weighted(activeProducts, activeWeights)
      const qty = pick([2, 4, 5, 5, 10, 10, 12, 20, 24, 30, 50])
      const success = rand() > 0.009
      const jobId = newId('job', at)
      printEvents.push({ id: newId('evt', at), jobId, productId: product.id, printerId: printer.id, shopId: printer.shopId, quantity: qty, success, at: iso(at) })
      if (d <= 2) {
        printJobs.push({
          id: jobId,
          printerId: printer.id,
          templateId: printer.templateId,
          createdBy: pick(users.slice(0, 4)).name,
          createdAt: iso(at),
          finishedAt: iso(at + between(4, 40) * 1000),
          items: [{ id: newId('item', at), productId: product.id, batchId: null, quantity: qty, printed: success ? qty : 0, state: success ? 'PRINTED' : 'FAILED', error: success ? null : 'Paper out / ribbon error', attempts: 1 }],
          prn: null,
        })
      }
    }
    const scansToday = Math.round(between(55, 90) * busy * trend)
    for (let s = 0; s < scansToday; s++) {
      const at = dayStart.getTime() + between(7 * 60, 23 * 60) * 60_000
      if (at > now) continue
      const product = weighted(activeProducts, activeWeights)
      const shop = shops.find((x) => x.id === product.shopId) ?? shops[0]
      const qr = qrCodes.find((q) => q.entityId === product.id)!
      scanEvents.push({
        id: newId('scan', at),
        qrId: qr.id,
        productId: product.id,
        batchId: null,
        shopId: shop.id,
        location: rand() < 0.8 ? shop.location : pick(['Madhapur', 'Gachibowli', 'Ameerpet', 'Secunderabad', 'Kondapur']),
        device: weighted(DEVICES, [62, 30, 6, 2]),
        visitorId: pick(visitors),
        at: iso(at),
      })
    }
  }
  printEvents.sort((a, b) => a.at.localeCompare(b.at))
  scanEvents.sort((a, b) => a.at.localeCompare(b.at))
  printJobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  // ── Audit log (recent) ─────────────────────────────────────────────────
  const auditLogs: AuditLog[] = []
  const log = (at: number, actor: string, action: string, entityType: string, entityId: string | null, detail: string) =>
    auditLogs.push({ id: newId('log', at), at: iso(at), actor, action, entityType, entityId, detail })
  const owner = users[0].name
  const admin = users[1].name
  const toor = products[0]
  log(now - 5 * DAY, owner, 'PRINTER_UPDATED', 'PRINTER', printers[1].id, 'Template changed to Grocery-50x30')
  log(now - 3 * DAY, 'system', 'PRINTER_OFFLINE', 'PRINTER', printers[6].id, 'Zebra ZD230 (Store Room) stopped responding')
  log(now - 2 * DAY, admin, 'PRODUCT_CREATED', 'PRODUCT', products[products.length - 2].id, `Created ${products[products.length - 2].name}`)
  log(now - 2 * DAY + 60_000, 'system', 'QR_GENERATED', 'QR', qrCodes.find((q) => q.entityId === products[products.length - 2].id)!.id, 'Immutable QR identity issued')
  log(now - DAY, admin, 'TEMPLATE_UPDATED', 'TEMPLATE', templates[1].id, 'Enabled QR code field')
  printJobs.slice(0, 12).forEach((j) => {
    const it = j.items[0]
    const p = products.find((x) => x.id === it.productId)!
    log(new Date(j.createdAt).getTime(), j.createdBy, 'PRINT_QUEUED', 'PRINT_JOB', j.id, `${it.quantity} × ${p.name}`)
    log(new Date(j.finishedAt!).getTime(), 'print-agent', it.state === 'PRINTED' ? 'PRINT_COMPLETED' : 'PRINT_FAILED', 'PRINT_JOB', j.id, it.state === 'PRINTED' ? `${it.quantity} labels printed` : it.error ?? 'Failed')
  })
  log(now - 6 * 3600_000, admin, 'PRODUCT_UPDATED', 'PRODUCT', toor.id, 'Sale price ₹142 → ₹138')
  scanEvents.slice(-6).forEach((s) => log(new Date(s.at).getTime(), 'public', 'QR_SCANNED', 'QR', s.qrId, `Scanned in ${s.location} (${s.device})`))
  auditLogs.sort((a, b) => b.at.localeCompare(a.at))

  return {
    version: DB_VERSION,
    shops,
    users,
    products,
    batches,
    qrCodes,
    printers: [],
    printerCleanupVersion: 1,
    templates,
    queue: [
      { id: newId('q'), productId: products[0].id, batchId: null, quantity: 5 },
      { id: newId('q'), productId: products[1].id, batchId: null, quantity: 10 },
    ],
    printJobs: [],
    printEvents: [],
    scanEvents,
    auditLogs: auditLogs.filter((a) => a.entityType !== 'PRINTER' && a.entityType !== 'PRINT_JOB'),
    settings: {
      organizationName: 'Vijaya Durga Retail Pvt. Ltd.',
      resolverBaseUrl: `${typeof window !== 'undefined' ? window.location.origin : 'https://p.yourdomain.com'}/q`,
      defaultShopId: shops[0].id,
      publicFields: { mrp: true, salePrice: true, packedDate: true, expiryDate: true, productCode: true, batchCode: true },
    },
    session: { userId: null },
  }
}
