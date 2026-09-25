// Domain model — mirrors the entities in docs/Product-Label.md §22.
// The frontend treats these as API contracts; the mock backend in src/mock implements them.

export type Role = 'OWNER' | 'ADMIN' | 'STAFF' | 'VIEWER'

export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'

export type ExpiryRule = 'NONE' | 'MONTHS_3' | 'MONTHS_6' | 'MONTHS_12' | 'CUSTOM'

export interface Shop {
  id: string
  name: string
  address: string
  location: string
}

export interface User {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  password: string // mock backend only — a real backend stores a hash
}

export interface Product {
  id: string // internal id
  globalId: string // prd_… — immutable global identity
  productCode: string // SKU / product code
  eanCode: string | null
  pluCode: string | null
  name: string
  category: string
  brand: string
  mrp: number
  salePrice: number
  taxPercent: number
  unit: string
  packedDate: string // ISO yyyy-mm-dd
  expiryRule: ExpiryRule
  shelfLifeMonths: number | null // for CUSTOM
  expiryDate: string | null // computed by backend
  shopId: string
  status: ProductStatus
  createdAt: string
  updatedAt: string
}

export type ProductInput = Pick<
  Product,
  | 'productCode'
  | 'eanCode'
  | 'pluCode'
  | 'name'
  | 'category'
  | 'brand'
  | 'mrp'
  | 'salePrice'
  | 'taxPercent'
  | 'unit'
  | 'packedDate'
  | 'expiryRule'
  | 'shelfLifeMonths'
  | 'shopId'
  | 'status'
>

export interface ProductBatch {
  id: string // batch_…
  productId: string
  batchCode: string // B20260906
  packedDate: string
  expiryDate: string | null
  quantity: number
  createdAt: string
}

export type QrEntityType = 'PRODUCT' | 'PRODUCT_BATCH'
export type QrStatus = 'ACTIVE' | 'REVOKED'

export interface QrCode {
  id: string // qr_…
  entityType: QrEntityType
  entityId: string
  createdAt: string
  status: QrStatus
}

export type PrinterLanguage = 'ZPL' | 'TSPL' | 'ESCPOS'
export type PrinterStatus = 'CONNECTED' | 'OFFLINE' | 'ERROR' | 'BUSY'
export type ConnectionType = 'USB' | 'NETWORK' | 'BLUETOOTH'

export interface Printer {
  id: string
  name: string
  manufacturer: 'Zebra' | 'TSC' | 'TVS' | 'Other'
  model: string
  language: PrinterLanguage
  connectionType: ConnectionType
  address: string
  dpi: 203 | 300
  templateId: string
  status: PrinterStatus
  lastSeenAt: string
  shopId: string
}

export type LabelField =
  | 'shopName'
  | 'address'
  | 'productName'
  | 'mrp'
  | 'salePrice'
  | 'barcode'
  | 'productCode'
  | 'packedDate'
  | 'expiryDate'
  | 'batchCode'
  | 'qr'

export interface LabelTemplate {
  id: string
  name: string
  widthMm: number
  heightMm: number
  columns: 1 | 2 | 3
  /** Content inset from each sticker edge, in millimetres. */
  marginsMm?: { top: number; right: number; bottom: number; left: number }
  /** Extra vertical spacing between content rows, in millimetres. */
  fieldGapMm?: number
  /** Gap between labels across the liner (mm). Match your die-cut stock. */
  gapMm?: number
  /** Physical gap in the feed direction between sticker rows (TSPL). */
  rowGapMm?: number
  mediaMode?: 'GAP' | 'CONTINUOUS'
  /** Page setup for browser printing — see src/print/PrintSheet.tsx */
  pageMode?: 'ROW' | 'SINGLE'
  rotate?: 0 | 90 | 180 | 270
  offsetXMm?: number
  offsetYMm?: number
  /** Multiplies printed text size (1 = design size). */
  textScale?: number
  orientation: 'PORTRAIT' | 'LANDSCAPE'
  fields: Record<LabelField, boolean>
  barcodeType: 'CODE128' | 'EAN13'
  createdAt: string
  updatedAt: string
}

export type PrintState =
  | 'QUEUED'
  | 'VALIDATING'
  | 'GENERATING'
  | 'SENT_TO_PRINTER'
  | 'PRINTING'
  | 'PRINTED'
  | 'FAILED'

export interface PrintJobItem {
  id: string
  productId: string
  batchId: string | null
  quantity: number
  printed: number
  state: PrintState
  error: string | null
  attempts: number
}

export interface PrintJob {
  delivery?: 'RAW'
  spoolJobId?: number
  submissionError?: string
  id: string // job_…
  printerId: string
  templateId: string
  createdBy: string
  createdAt: string
  finishedAt: string | null
  items: PrintJobItem[]
  prn: string | null // generated payload retained for audit/debug
}

export interface QueueEntry {
  id: string
  productId: string
  batchId: string | null
  quantity: number
}

export interface PrintEvent {
  id: string
  jobId: string
  productId: string
  printerId: string
  shopId: string
  quantity: number
  success: boolean
  at: string
}

export type Device = 'Android' | 'iOS' | 'Desktop' | 'Other'

export interface QrScanEvent {
  id: string
  qrId: string
  productId: string
  batchId: string | null
  shopId: string
  location: string
  device: Device
  visitorId: string
  at: string
}

export interface AuditLog {
  id: string
  at: string
  actor: string
  action: string
  entityType: string
  entityId: string | null
  detail: string
}

export interface Settings {
  organizationName: string
  resolverBaseUrl: string // stable public resolver, e.g. https://p.yourdomain.com/q
  defaultShopId: string
  publicFields: {
    mrp: boolean
    salePrice: boolean
    packedDate: boolean
    expiryDate: boolean
    productCode: boolean
    batchCode: boolean
  }
}

export interface Db {
  printerCleanupVersion?: 1
  archivedPrinterNames?: Record<string, string>
  version: number
  shops: Shop[]
  users: User[]
  products: Product[]
  batches: ProductBatch[]
  qrCodes: QrCode[]
  printers: Printer[]
  templates: LabelTemplate[]
  queue: QueueEntry[]
  printJobs: PrintJob[]
  printEvents: PrintEvent[]
  scanEvents: QrScanEvent[]
  auditLogs: AuditLog[]
  settings: Settings
  session: { userId: string | null }
}
