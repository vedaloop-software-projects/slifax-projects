import { z } from 'zod'
import type { Account } from '../../models/auth/contracts.ts'
import { businessCalendarDay } from '../../models/system/business-time.ts'
import type { PurchaseAccountsStore } from '../../models/purchase/accounts-store.ts'
import { isReportKey, reportCatalogue, type PurchaseReportStore } from '../../models/purchase/reports-store.ts'
import { MAX_IMPORT_ROWS, readSupplierRows, SUPPLIER_COLUMN_TITLE, SUPPLIER_COLUMNS, supplierBody, supplierTemplate, type ImportRow, type SupplierColumnKey } from '../../models/purchase/import/supplier-import.ts'
import type { PurchaseMastersStore } from '../../models/purchase/masters-store.ts'
import type { PurchaseOrderStore } from '../../models/purchase/orders-store.ts'
import type { PurchasePaymentStore } from '../../models/purchase/payments-store.ts'
import { PAYMENT_MODES } from '../../models/purchase/rules.ts'
import type { PurchaseReceiptStore } from '../../models/purchase/receipts-store.ts'
import type { PurchaseReturnStore } from '../../models/purchase/returns-store.ts'
import { calendarDays } from '../../models/purchase/calc.ts'
import { ApiError } from '../auth/service.ts'

export type PurchaseStores = { masters: PurchaseMastersStore; orders: PurchaseOrderStore; receipts: PurchaseReceiptStore; returns: PurchaseReturnStore; payments: PurchasePaymentStore; accounts: PurchaseAccountsStore; reports: PurchaseReportStore }

export const ANALYTICS_PERIODS = ['this_month', 'last_30', 'last_90', 'last_180', 'this_fy'] as const
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
export const GST_REGISTRATIONS = ['registered', 'composition', 'unregistered'] as const
export const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
export const PAN = /^[A-Z]{5}\d{4}[A-Z]$/
export const RETURN_REASONS = ['damaged', 'expired', 'excess', 'wrong_item', 'other'] as const
export const CREDIT_REASONS = ['shortage', 'rate_difference', 'discount', 'return', 'other'] as const

const text = (max: number) => z.union([z.string(), z.number().transform(String)]).transform(value => value.trim()).pipe(z.string().max(max))
const optionalText = (max: number) => z.union([text(max), z.null()]).optional().transform(value => value ? value : null)
const id = z.union([z.string().regex(/^[1-9]\d{0,18}$/), z.number().int().positive().safe()]).transform(value => BigInt(value))
const optionalId = z.union([id, z.literal(''), z.literal(0), z.null()]).optional().transform(value => typeof value === 'bigint' ? value : null)
const qty = z.coerce.number().finite().min(0).max(10_000_000)
const money = z.coerce.number().finite().min(0).max(10_000_000_000)
const percent = z.coerce.number().finite().min(0).max(100)
const dateString = z.string().trim().regex(/^\d{2}-\d{2}-\d{4}$/, 'Dates are DD-MM-YYYY.')
// An optional number: null, '' or missing mean "not given". These are checked before the
// number, because z.coerce.number() would turn null and '' into 0.
const optionalNumber = <T extends z.ZodType<number>>(schema: T) => z.union([z.null(), z.literal(''), schema]).optional().transform(value => (value === '' || value === undefined || value === null ? null : value as number))
const flag = z.union([z.boolean(), z.literal(0), z.literal(1), z.literal('0'), z.literal('1')]).transform(value => value === true || value === 1 || value === '1').default(false)

// DD-MM-YYYY -> UTC midnight (the form @db.Date columns use).
export function parseDate(value: string) {
  const [day, month, year] = value.split('-').map(Number), parsed = new Date(Date.UTC(year!, month! - 1, day))
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month! - 1 || parsed.getUTCDate() !== day) throw new ApiError(422, `${value} is not a valid date.`)
  return parsed
}
const optionalDate = (value: string | null | undefined) => value ? parseDate(value) : null
// Document dates follow the store's calendar on the server clock, never the device.
function documentDate(value: string | null | undefined, what: string) {
  const today = businessCalendarDay()
  if (!value) return today
  const date = parseDate(value)
  if (date > today) throw new ApiError(422, `${what} cannot be in the future.`)
  return date
}

function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value ?? {})
  if (result.success) return result.data
  const issue = result.error.issues[0]!
  const field = issue.path.filter(part => typeof part === 'string').at(-1)
  throw new ApiError(422, field ? `${String(field)}: ${issue.message}` : issue.message)
}

const supplierSchema = z.object({
  code: text(30).pipe(z.string().min(1, 'Supplier code is required.')),
  name: text(150).pipe(z.string().min(1, 'Supplier name is required.')),
  contactPerson: optionalText(100),
  mobile: text(10).pipe(z.string().regex(/^\d{10}$/, 'Mobile must be 10 digits.')),
  alternateMobile: optionalText(10).refine(value => value === null || /^\d{10}$/.test(value), 'Alternate mobile must be 10 digits.'),
  email: optionalText(150).refine(value => value === null || z.email().safeParse(value).success, 'Enter a valid email.'),
  stateId: z.coerce.number().int().positive('Select a state.'),
  address: optionalText(1000), city: optionalText(100),
  pincode: optionalText(6).refine(value => value === null || /^\d{6}$/.test(value), 'Pin code must be 6 digits.'),
  gstRegistration: z.enum(GST_REGISTRATIONS, 'Select the GST registration.'),
  gstin: optionalText(15).transform(value => value?.toUpperCase() ?? null),
  pan: optionalText(10).transform(value => value?.toUpperCase() ?? null),
  creditDays: z.coerce.number().int('Credit days must be a whole number.').min(0, 'Credit days cannot be negative.').max(365).default(0),
  paymentTerms: optionalText(100),
  openingBalance: z.coerce.number().finite().min(0, 'Opening balance cannot be negative.').max(10_000_000_000).default(0),
  visitDay: z.union([z.enum(WEEKDAYS), z.literal(''), z.null()]).optional().transform(value => value ? value : null),
  status: z.union([z.literal(0), z.literal(1), z.literal('0'), z.literal('1')]).transform(Number).default(1),
}).superRefine((value, context) => {
  if (value.gstRegistration !== 'unregistered' && !value.gstin) context.addIssue({ code: 'custom', path: ['gstin'], message: 'GST No is required for a registered supplier.' })
  if (value.gstin && !GSTIN.test(value.gstin)) context.addIssue({ code: 'custom', path: ['gstin'], message: 'Enter a valid 15-character GST No.' })
  if (value.pan && !PAN.test(value.pan)) context.addIssue({ code: 'custom', path: ['pan'], message: 'Enter a valid PAN (e.g. ABCDE1234F).' })
  if (value.gstin && value.pan && GSTIN.test(value.gstin) && value.gstin.slice(2, 12) !== value.pan) context.addIssue({ code: 'custom', path: ['pan'], message: 'PAN does not match the GST No.' })
}).transform(value => ({
  ...value,
  gstin: value.gstRegistration === 'unregistered' ? null : value.gstin,
  // The PAN is part of the GSTIN; fill it in when it was left blank.
  pan: value.pan ?? (value.gstin && GSTIN.test(value.gstin) ? value.gstin.slice(2, 12) : null),
}))

const settingSchema = z.object({
  variantId: id, preferredSupplierId: optionalId, purchaseUnit: optionalText(30), packSize: z.coerce.number().finite().positive().max(100_000).default(1),
  minStock: qty.default(0), maxStock: qty.default(0), supplierMoq: qty.default(0), purchaseMultiple: qty.default(0),
  leadTimeDays: z.coerce.number().int().min(0).max(365).default(0), safetyStock: qty.default(0),
  autoPoEnabled: z.union([z.literal(0), z.literal(1), z.boolean()]).transform(Number).default(1), purchaseRate: money.default(0),
}).refine(value => value.maxStock === 0 || value.maxStock >= value.minStock, { message: 'Maximum stock must be at least the minimum stock.', path: ['maxStock'] })

const poLine = z.object({
  id: optionalId, variantId: id, qty: qty.refine(value => value > 0, 'Quantity must be more than 0.'), freeQty: qty.default(0), rate: money,
  discountPercent: percent.default(0), discountAmount: money.default(0), suggestedQty: optionalNumber(qty),
  reason: optionalText(100),
})
const poSchema = z.object({
  date: dateString.optional(), supplierId: id, expectedDate: z.union([dateString, z.literal(''), z.null()]).optional(), creditDays: z.coerce.number().int().min(0).max(365).default(0),
  paymentTerms: optionalText(100), referenceNo: optionalText(100), remarks: optionalText(2000), poType: z.enum(['manual', 'avg_sales', 'mbq']).default('manual'),
  sourceRef: optionalText(255), lines: z.array(poLine).min(1, 'Add at least one product.').max(500),
  action: z.enum(['save', 'submit', 'approve']).default('save'), amendReason: optionalText(255),
})
const reasonSchema = z.object({ reason: optionalText(255) })

const grnLine = z.object({
  poLineId: optionalId, variantId: id, receivedQty: qty, rejectedQty: qty.default(0), rejectionReason: optionalText(255), freeQty: qty.default(0),
  rate: money, mrp: money.default(0), discountPercent: percent.default(0), discountAmount: money.default(0), batchNo: optionalText(50),
  expiryDate: z.union([dateString, z.literal(''), z.null()]).optional(),
})
const grnSchema = z.object({
  date: dateString.optional(), poId: optionalId, supplierId: id, invoiceAvailable: flag, supplierInvoiceNo: optionalText(50),
  supplierInvoiceDate: z.union([dateString, z.literal(''), z.null()]).optional(), vehicleNo: optionalText(30), remarks: optionalText(2000),
  creditNoteExpected: flag, excessReason: optionalText(255), lines: z.array(grnLine).min(1, 'Add at least one product.').max(500), post: flag,
}).refine(value => !value.invoiceAvailable || (!!value.supplierInvoiceNo && !!value.supplierInvoiceDate), { message: 'Enter the supplier invoice number and date.', path: ['supplierInvoiceNo'] })

const discount = z.object({ type: z.enum(['percent', 'amount']).default('percent'), value: money.default(0) }).default({ type: 'percent', value: 0 })
const invoiceSchema = z.object({
  date: dateString.optional(), grnId: id, supplierInvoiceNo: text(50).pipe(z.string().min(1, 'Supplier invoice number is required.')), supplierInvoiceDate: dateString,
  creditDays: optionalNumber(z.coerce.number().int().min(0).max(365)), overall: discount, scheme: discount,
  roundOff: optionalNumber(z.coerce.number().finite().min(-1).max(1)), varianceReason: optionalText(255), remarks: optionalText(2000),
  lines: z.array(z.object({ grnLineId: id, qty: qty.refine(value => value > 0, 'Quantity must be more than 0.'), rate: money, discountPercent: percent.default(0), discountAmount: money.default(0) })).min(1, 'Add at least one product.').max(500),
  post: flag,
})

const returnSchema = z.object({
  date: dateString.optional(), supplierId: id, grnId: optionalId, returnReason: z.enum(RETURN_REASONS, 'Select the return reason.'), remarks: optionalText(2000),
  debitNoteRequired: z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(value => value === true || value === 1).default(true),
  lines: z.array(z.object({
    grnLineId: optionalId, variantId: id, returnQty: qty.default(0), rejectedQty: qty.default(0),
    rate: optionalNumber(money), discountPercent: optionalNumber(percent),
    batchNo: optionalText(50), expiryDate: z.union([dateString, z.literal(''), z.null()]).optional(),
  })).min(1, 'Add at least one product.').max(500),
  post: flag,
})

const creditNoteSchema = z.object({
  supplierId: id, creditNoteNo: text(50).pipe(z.string().min(1, 'Supplier credit note number is required.')), date: dateString,
  invoiceId: optionalId, grnId: optionalId, prnId: optionalId, reason: z.enum(CREDIT_REASONS, 'Select the reason.'), remarks: optionalText(2000),
  taxable: money.refine(value => value > 0, 'Taxable value must be more than 0.'), taxPercent: percent.default(0), post: flag,
})

const autoPoSchema = z.object({
  method: z.enum(['avg_sales', 'mbq']), supplierId: optionalId, fromDate: z.union([dateString, z.literal(''), z.null()]).optional(), toDate: z.union([dateString, z.literal(''), z.null()]).optional(),
  coverageDays: z.coerce.number().int().min(1).max(365).default(15), leadTimeDays: optionalNumber(z.coerce.number().int().min(0).max(365)),
  includePendingPo: flag.default(true), includePendingGrn: flag, categoryId: optionalId, subCategoryId: optionalId, brandId: optionalId, productId: optionalId,
})
const autoPoCreateSchema = z.object({
  method: z.enum(['avg_sales', 'mbq']), sourceRef: optionalText(255),
  rows: z.array(z.object({ variantId: id, supplierId: id, qty: qty.refine(value => value > 0, 'Quantity must be more than 0.'), rate: money, suggestedQty: optionalNumber(qty), reason: optionalText(100) })).min(1, 'Select at least one product.').max(1000),
})

const allocationSchema = z.array(z.object({ invoiceId: optionalId, amount: money.refine(value => value > 0, 'Each allocation must be more than 0.') })).max(500).default([])
const paymentSchema = z.object({
  date: dateString.optional(), supplierId: id, mode: z.enum(PAYMENT_MODES, 'Select the payment mode.'), bankAccount: optionalText(100), referenceNo: optionalText(50),
  chequeDate: z.union([dateString, z.literal(''), z.null()]).optional(), amount: money, tdsAmount: money.default(0), remarks: optionalText(2000), allocations: allocationSchema,
}).superRefine((value, context) => {
  if (value.amount + value.tdsAmount <= 0) context.addIssue({ code: 'custom', path: ['amount'], message: 'Enter the amount paid.' })
  if (['bank', 'upi', 'cheque'].includes(value.mode) && !value.referenceNo) context.addIssue({ code: 'custom', path: ['referenceNo'], message: value.mode === 'cheque' ? 'Enter the cheque number.' : 'Enter the UTR / transaction reference.' })
  if (['bank', 'cheque'].includes(value.mode) && !value.bankAccount) context.addIssue({ code: 'custom', path: ['bankAccount'], message: 'Enter the bank account the payment is made from.' })
  if (value.mode === 'cheque' && !value.chequeDate) context.addIssue({ code: 'custom', path: ['chequeDate'], message: 'Enter the cheque date.' })
})

const listSchema = z.object({
  status: optionalText(200), supplierId: optionalId, fromDate: z.union([dateString, z.literal('')]).optional(), toDate: z.union([dateString, z.literal('')]).optional(),
  search: z.union([z.string()]).optional().transform(value => (value ?? '').trim().slice(0, 50)), page: z.coerce.number().int().min(1).max(100_000).catch(1),
  pendingInvoice: flag, type: z.enum(['debit', 'credit']).catch('debit'),
})

export class PurchaseService {
  private readonly stores: PurchaseStores
  constructor(stores: PurchaseStores) { this.stores = stores }

  private filter(query: unknown) {
    const value = parse(listSchema, query)
    return { status: value.status, supplierId: value.supplierId, from: optionalDate(value.fromDate), to: optionalDate(value.toDate), search: value.search, page: value.page, pendingInvoice: value.pendingInvoice, type: value.type }
  }

  dashboard(account: Account) { return this.stores.masters.dashboard(account.client.id) }
  states() { return this.stores.masters.states() }

  // ---------------------------------------------------------------- suppliers & product settings
  listSuppliers(account: Account, query: unknown) {
    const value = parse(z.object({ search: z.string().optional(), status: z.union([z.literal('0'), z.literal('1'), z.literal('')]).optional(), page: z.coerce.number().int().min(1).catch(1) }), query)
    return this.stores.masters.listSuppliers(account.client.id, { search: (value.search ?? '').trim().slice(0, 50), status: value.status ? Number(value.status) : null, page: value.page })
  }
  supplierOptions(account: Account) { return this.stores.masters.supplierOptions(account.client.id) }
  getSupplier(account: Account, supplierId: bigint) { return this.stores.masters.getSupplier(account.client.id, supplierId) }
  async saveSupplier(account: Account, supplierId: bigint | null, body: unknown) {
    const savedId = await this.stores.masters.saveSupplier(account, supplierId, parse(supplierSchema, body))
    return this.stores.masters.getSupplier(account.client.id, savedId)
  }
  // ---------------------------------------------------------------- supplier import (Excel / CSV)
  async supplierTemplate() {
    const states = await this.stores.masters.states()
    return supplierTemplate(states.map(state => state.name))
  }

  async previewSupplierImport(account: Account, file: Buffer | undefined) {
    if (!file?.length) throw new ApiError(422, 'Choose the filled template (.xlsx or .csv).')
    let parsed: ReturnType<typeof readSupplierRows>
    try { parsed = readSupplierRows(file) } catch { throw new ApiError(422, 'This file could not be read. Upload the template saved as .xlsx or .csv.') }
    if (parsed.missing.length) throw new ApiError(422, `The file is missing these columns: ${parsed.missing.join(', ')}. Use the template.`)
    if (!parsed.rows.length) throw new ApiError(422, 'The file has no suppliers. Fill at least one row under the header.')
    if (parsed.rows.length > MAX_IMPORT_ROWS) throw new ApiError(422, `At most ${MAX_IMPORT_ROWS} suppliers can be imported at a time; this file has ${parsed.rows.length}.`)
    const rows = await this.checkImportRows(account, parsed.rows)
    return { columns: SUPPLIER_COLUMNS.map(({ key, title, required }) => ({ key, title, required })), rows: rows.map(({ input: _input, ...row }) => row), ready: rows.filter(row => !row.errors.length).length, withErrors: rows.filter(row => row.errors.length).length }
  }

  async importSuppliers(account: Account, body: unknown) {
    const value = parse(z.object({ rows: z.array(z.object({ row: z.coerce.number().int().min(1), values: z.record(z.string(), z.union([z.string(), z.number()]).transform(String)) })).min(1, 'Nothing to import.').max(MAX_IMPORT_ROWS) }), body)
    const rows: ImportRow[] = value.rows.map(row => ({ row: row.row, values: Object.fromEntries(SUPPLIER_COLUMNS.map(column => [column.key, String(row.values[column.key] ?? '').trim()])) as Record<SupplierColumnKey, string> }))
    const checked = await this.checkImportRows(account, rows)
    const bad = checked.filter(row => row.errors.length)
    if (bad.length) throw new ApiError(422, `Row ${bad[0]!.row}: ${bad[0]!.errors[0]} Fix the file and upload it again.`)
    const imported = await this.stores.masters.importSuppliers(account, checked.map(row => row.input!))
    return { imported }
  }

  // Same rules as the supplier form, plus duplicates inside the file and against saved suppliers.
  private async checkImportRows(account: Account, rows: ImportRow[]) {
    const states = await this.stores.masters.states()
    const stateIds = new Map(states.map(state => [state.name.toLowerCase(), state.id]))
    const checked = rows.map(row => {
      const result = supplierSchema.safeParse(supplierBody(row.values, stateIds))
      const errors = result.success ? [] : [...new Set(result.error.issues.map(issue => {
        const field = issue.path.filter(part => typeof part === 'string').at(-1) as string | undefined
        if (field === 'stateId') return row.values.state ? `State "${row.values.state}" is not in the list.` : 'State is required.'
        const title = field ? SUPPLIER_COLUMN_TITLE[field as SupplierColumnKey] ?? field : ''
        if (issue.code === 'invalid_value' || issue.code === 'invalid_type') return `${title}: ${row.values[field as SupplierColumnKey] ? `"${row.values[field as SupplierColumnKey]}" is not valid` : 'is required'}.`
        return /^[A-Z]/.test(issue.message) && title && !issue.message.toLowerCase().includes(title.toLowerCase().split(' ')[0]!) ? `${title}: ${issue.message}` : issue.message
      }))]
      return { row: row.row, values: row.values, errors, input: result.success ? result.data : undefined }
    })
    const codes = new Map<string, number>(), gstins = new Map<string, number>()
    for (const row of checked) {
      if (!row.input) continue
      const code = row.input.code.toLowerCase(), gstin = row.input.gstin
      if (codes.has(code)) row.errors.push(`Supplier Code ${row.input.code} is also on row ${codes.get(code)}.`)
      else codes.set(code, row.row)
      if (gstin) { if (gstins.has(gstin)) row.errors.push(`GST No ${gstin} is also on row ${gstins.get(gstin)}.`); else gstins.set(gstin, row.row) }
    }
    const taken = await this.stores.masters.takenSupplierKeys(account.client.id, [...codes.keys()].map(code => checked.find(row => row.input?.code.toLowerCase() === code)!.input!.code), [...gstins.keys()])
    for (const row of checked) {
      if (!row.input) continue
      const byCode = taken.codes.get(row.input.code.toLowerCase())
      if (byCode) row.errors.push(`Supplier Code ${row.input.code} is already used by ${byCode}.`)
      const byGstin = row.input.gstin ? taken.gstins.get(row.input.gstin) : undefined
      if (byGstin) row.errors.push(`GST No ${row.input.gstin} is already used by ${byGstin}.`)
    }
    return checked
  }

  supplierReferences(account: Account, supplierId: bigint) { return this.stores.returns.creditNoteReferences(account.client.id, supplierId) }

  lookupProducts(account: Account, query: unknown) {
    const value = parse(z.object({ search: z.string().optional(), supplierId: optionalId, variantIds: z.string().optional() }), query)
    const variantIds = (value.variantIds ?? '').split(',').filter(part => /^[1-9]\d{0,18}$/.test(part)).slice(0, 200).map(BigInt)
    return this.stores.masters.lookupProducts(account.client.id, { search: (value.search ?? '').trim().slice(0, 50), supplierId: value.supplierId, variantIds })
  }
  listProductSettings(account: Account, query: unknown) {
    const value = parse(z.object({ search: z.string().optional(), supplierId: optionalId, page: z.coerce.number().int().min(1).catch(1) }), query)
    return this.stores.masters.listProductSettings(account.client.id, { search: (value.search ?? '').trim().slice(0, 50), supplierId: value.supplierId, page: value.page })
  }
  async saveProductSettings(account: Account, body: unknown) {
    const value = parse(z.object({ items: z.array(settingSchema).min(1).max(200) }), body)
    return { saved: await this.stores.masters.saveProductSettings(account, value.items) }
  }

  // ---------------------------------------------------------------- Auto PO
  autoPoSuggest(account: Account, body: unknown) {
    const value = parse(autoPoSchema, body)
    let fromDate: Date | null = null, toDate: Date | null = null
    if (value.method === 'avg_sales') {
      if (!value.fromDate || !value.toDate) throw new ApiError(422, 'Select the sales period (from and to date).')
      fromDate = parseDate(value.fromDate); toDate = parseDate(value.toDate)
      if (fromDate > toDate) throw new ApiError(422, 'From date must be on or before the to date.')
      if (calendarDays(fromDate, toDate) > 366) throw new ApiError(422, 'The sales period can be at most a year.')
      if (toDate > businessCalendarDay()) throw new ApiError(422, 'The sales period cannot end in the future.')
    }
    return this.stores.masters.autoPoSuggestions(account.client.id, { ...value, fromDate, toDate })
  }

  // One draft PO per supplier from the selected Auto PO rows.
  async autoPoCreate(account: Account, body: unknown) {
    const value = parse(autoPoCreateSchema, body)
    const bySupplier = new Map<bigint, typeof value.rows>()
    for (const row of value.rows) bySupplier.set(row.supplierId, [...(bySupplier.get(row.supplierId) ?? []), row])
    const suppliers = new Map((await this.stores.masters.supplierOptions(account.client.id)).map(row => [row.id, row]))
    for (const supplierId of bySupplier.keys()) if (!suppliers.has(supplierId)) throw new ApiError(422, 'A selected supplier is inactive or missing.')
    const created = []
    for (const [supplierId, rows] of bySupplier) {
      const supplier = suppliers.get(supplierId)!
      created.push(await this.stores.orders.save(account, null, {
        date: businessCalendarDay(), supplierId, expectedDate: null, creditDays: supplier.creditDays, paymentTerms: supplier.paymentTerms, referenceNo: null, remarks: null,
        poType: value.method, sourceRef: value.sourceRef ?? (value.method === 'avg_sales' ? 'Auto PO (average sales)' : 'Auto PO (min/max stock)'),
        lines: rows.map(row => ({ id: null, variantId: row.variantId, qty: row.qty, freeQty: 0, rate: row.rate, discountPercent: 0, discountAmount: 0, suggestedQty: row.suggestedQty, reason: row.reason })),
      }, 'save', null))
    }
    return { created }
  }

  // ---------------------------------------------------------------- Purchase orders
  listOrders(account: Account, query: unknown) { return this.stores.orders.list(account.client.id, this.filter(query)) }
  getOrder(account: Account, orderId: bigint) { return this.stores.orders.get(account.client.id, orderId) }
  async saveOrder(account: Account, orderId: bigint | null, body: unknown) {
    const value = parse(poSchema, body)
    const date = documentDate(value.date, 'PO date'), expectedDate = optionalDate(value.expectedDate || null)
    if (expectedDate && expectedDate < date) throw new ApiError(422, 'Expected delivery cannot be before the PO date.')
    return this.stores.orders.save(account, orderId, { ...value, date, expectedDate }, value.action, value.amendReason)
  }
  orderAction(account: Account, orderId: bigint, action: string, body: unknown) {
    if (!['submit', 'approve', 'reject', 'cancel'].includes(action)) throw new ApiError(404, 'Unknown action.')
    return this.stores.orders.action(account, orderId, action as 'submit' | 'approve' | 'reject' | 'cancel', parse(reasonSchema, body).reason)
  }

  // ---------------------------------------------------------------- GRN
  listGrns(account: Account, query: unknown) { return this.stores.receipts.listGrns(account.client.id, this.filter(query)) }
  getGrn(account: Account, grnId: bigint) { return this.stores.receipts.getGrn(account.client.id, grnId) }
  saveGrn(account: Account, grnId: bigint | null, body: unknown) {
    const value = parse(grnSchema, body)
    const date = documentDate(value.date, 'GRN date')
    const supplierInvoiceDate = value.invoiceAvailable ? optionalDate(value.supplierInvoiceDate || null) : null
    if (supplierInvoiceDate && supplierInvoiceDate > businessCalendarDay()) throw new ApiError(422, 'Supplier invoice date cannot be in the future.')
    const lines = value.lines.map(line => ({ ...line, expiryDate: optionalDate(line.expiryDate || null) }))
    return this.stores.receipts.saveGrn(account, grnId, { ...value, date, supplierInvoiceNo: value.invoiceAvailable ? value.supplierInvoiceNo : null, supplierInvoiceDate, lines }, value.post)
  }
  postGrn(account: Account, grnId: bigint) { return this.stores.receipts.postGrn(account, grnId) }
  cancelGrn(account: Account, grnId: bigint, body: unknown) { return this.stores.receipts.cancelGrn(account, grnId, this.reason(body)) }

  private reason(body: unknown) {
    const reason = parse(reasonSchema, body).reason
    if (!reason) throw new ApiError(422, 'Give a reason.')
    return reason
  }

  // ---------------------------------------------------------------- Purchase invoices
  listInvoices(account: Account, query: unknown) { return this.stores.receipts.listInvoices(account.client.id, this.filter(query)) }
  getInvoice(account: Account, invoiceId: bigint) { return this.stores.receipts.getInvoice(account.client.id, invoiceId) }
  saveInvoice(account: Account, invoiceId: bigint | null, body: unknown) {
    const value = parse(invoiceSchema, body)
    const date = documentDate(value.date, 'Invoice entry date'), supplierInvoiceDate = parseDate(value.supplierInvoiceDate)
    if (supplierInvoiceDate > businessCalendarDay()) throw new ApiError(422, 'Supplier invoice date cannot be in the future.')
    return this.stores.receipts.saveInvoice(account, invoiceId, { ...value, date, supplierInvoiceDate }, value.post)
  }
  postInvoice(account: Account, invoiceId: bigint) { return this.stores.receipts.postInvoice(account, invoiceId) }
  cancelInvoice(account: Account, invoiceId: bigint, body: unknown) { return this.stores.receipts.cancelInvoice(account, invoiceId, this.reason(body)) }

  // ---------------------------------------------------------------- Purchase returns
  listReturns(account: Account, query: unknown) { return this.stores.returns.listReturns(account.client.id, this.filter(query)) }
  getReturn(account: Account, returnId: bigint) { return this.stores.returns.getReturn(account.client.id, returnId) }
  saveReturn(account: Account, returnId: bigint | null, body: unknown) {
    const value = parse(returnSchema, body)
    const lines = value.lines.map(line => ({ ...line, expiryDate: optionalDate(line.expiryDate || null) }))
    return this.stores.returns.saveReturn(account, returnId, { ...value, date: documentDate(value.date, 'Return date'), lines }, value.post)
  }
  postReturn(account: Account, returnId: bigint) { return this.stores.returns.postReturn(account, returnId) }
  cancelReturn(account: Account, returnId: bigint, body: unknown) { return this.stores.returns.cancelReturn(account, returnId, this.reason(body)) }

  // ---------------------------------------------------------------- Debit / credit notes
  listNotes(account: Account, query: unknown) { const filter = this.filter(query); return this.stores.returns.listNotes(account.client.id, filter) }
  getDebitNote(account: Account, noteId: bigint) { return this.stores.returns.getDebitNote(account.client.id, noteId) }
  debitNoteAction(account: Account, noteId: bigint, action: string, body: unknown) {
    if (!['post', 'sent', 'acknowledged', 'settled', 'cancel'].includes(action)) throw new ApiError(404, 'Unknown action.')
    return this.stores.returns.debitNoteAction(account, noteId, action as 'post', parse(reasonSchema, body).reason)
  }
  getCreditNote(account: Account, noteId: bigint) { return this.stores.returns.getCreditNote(account.client.id, noteId) }
  saveCreditNote(account: Account, noteId: bigint | null, body: unknown) {
    const value = parse(creditNoteSchema, body)
    return this.stores.returns.saveCreditNote(account, noteId, { ...value, date: documentDate(value.date, 'Credit note date') }, value.post)
  }
  postCreditNote(account: Account, noteId: bigint) { return this.stores.returns.postCreditNote(account, noteId) }

  // ---------------------------------------------------------------- Supplier outstanding
  async outstanding(account: Account, query: unknown) {
    const value = parse(z.object({
      asOn: z.union([dateString, z.literal('')]).optional(), supplierId: optionalId, dueFrom: z.union([dateString, z.literal('')]).optional(), dueTo: z.union([dateString, z.literal('')]).optional(),
      overdueOnly: flag, search: z.string().optional(),
    }), query)
    const today = businessCalendarDay()
    const asOn = value.asOn ? parseDate(value.asOn) : today
    if (asOn > today) throw new ApiError(422, 'As on date cannot be in the future.')
    const dueFrom = optionalDate(value.dueFrom || null), dueTo = optionalDate(value.dueTo || null)
    if (dueFrom && dueTo && dueFrom > dueTo) throw new ApiError(422, 'Due from must be on or before due to.')
    return this.stores.accounts.outstanding(account.client.id, { asOn, supplierId: value.supplierId, dueFrom, dueTo, overdueOnly: value.overdueOnly, search: (value.search ?? '').trim().slice(0, 50) })
  }

  // ---------------------------------------------------------------- Purchase reports
  reportList() { return reportCatalogue() }
  async report(account: Account, key: string, query: unknown) {
    if (!isReportKey(key)) throw new ApiError(404, 'Unknown report.')
    const value = parse(z.object({
      fromDate: z.union([dateString, z.literal('')]).optional(), toDate: z.union([dateString, z.literal('')]).optional(), supplierId: optionalId,
      status: optionalText(200), categoryId: optionalId, brandId: optionalId,
    }), query)
    const today = businessCalendarDay()
    const from = value.fromDate ? parseDate(value.fromDate) : new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
    const to = value.toDate ? parseDate(value.toDate) : today
    if (from > to) throw new ApiError(422, 'From date must be on or before the to date.')
    if (to > today) throw new ApiError(422, 'To date cannot be in the future.')
    if ((to.getTime() - from.getTime()) / 86_400_000 > 366) throw new ApiError(422, 'Choose a period of at most a year.')
    return this.stores.reports.run(account.client.id, key, { from, to, supplierId: value.supplierId, status: value.status, categoryId: value.categoryId, brandId: value.brandId })
  }

  // Charts for purchase orders, suppliers and supplier bills. Payables are as of today.
  async analytics(account: Account, query: unknown) {
    const value = parse(z.object({
      period: z.enum(ANALYTICS_PERIODS).optional(), fromDate: z.union([dateString, z.literal('')]).optional(), toDate: z.union([dateString, z.literal('')]).optional(),
    }), query)
    const today = businessCalendarDay()
    const to = value.toDate ? parseDate(value.toDate) : today
    // Named periods end today on the store calendar (the device clock is never used).
    const year = today.getUTCFullYear(), month = today.getUTCMonth()
    const periodStart: Record<(typeof ANALYTICS_PERIODS)[number], Date> = {
      this_month: new Date(Date.UTC(year, month, 1)), last_30: new Date(today.getTime() - 29 * 86_400_000), last_90: new Date(today.getTime() - 89 * 86_400_000),
      last_180: new Date(today.getTime() - 179 * 86_400_000), this_fy: new Date(Date.UTC(month >= 3 ? year : year - 1, 3, 1)),
    }
    const from = value.period ? periodStart[value.period] : value.fromDate ? parseDate(value.fromDate) : periodStart.last_90
    if (value.period && value.toDate) throw new ApiError(422, 'Send a period or dates, not both.')
    if (from > to) throw new ApiError(422, 'From date must be on or before the to date.')
    if (to > today) throw new ApiError(422, 'To date cannot be in the future.')
    if ((to.getTime() - from.getTime()) / 86_400_000 > 366) throw new ApiError(422, 'Choose a period of at most a year.')
    const clientId = account.client.id
    const [charts, payables] = await Promise.all([
      this.stores.reports.analytics(clientId, from, to),
      this.stores.accounts.outstanding(clientId, { asOn: today, supplierId: null, dueFrom: null, dueTo: null, overdueOnly: false, search: '' }),
    ])
    const { totals } = payables
    return {
      ...charts,
      payables: {
        balance: totals.balance, overdue: totals.overdue,
        ageing: [
          { key: 'not_due', label: 'Not due', amount: totals.not_due }, { key: 'd1_30', label: '1–30 days', amount: totals.d1_30 },
          { key: 'd31_60', label: '31–60 days', amount: totals.d31_60 }, { key: 'd61_90', label: '61–90 days', amount: totals.d61_90 },
          { key: 'd90_plus', label: '90+ days', amount: totals.d90_plus },
        ],
        topSuppliers: payables.suppliers.filter(row => row.balance > 0).slice(0, 6).map(row => ({ supplierId: row.supplierId, name: row.name, balance: row.balance, overdue: row.overdue })),
      },
    }
  }

  // ---------------------------------------------------------------- Supplier ledger
  async ledger(account: Account, supplierId: bigint, query: unknown) {
    const value = parse(z.object({ fromDate: z.union([dateString, z.literal('')]).optional(), toDate: z.union([dateString, z.literal('')]).optional() }), query)
    const today = businessCalendarDay()
    // Default: the current financial year (1 April) up to today, on the store's calendar.
    const fyStart = new Date(Date.UTC(today.getUTCMonth() >= 3 ? today.getUTCFullYear() : today.getUTCFullYear() - 1, 3, 1))
    const from = value.fromDate ? parseDate(value.fromDate) : fyStart, to = value.toDate ? parseDate(value.toDate) : today
    if (from > to) throw new ApiError(422, 'From date must be on or before the to date.')
    if (to > today) throw new ApiError(422, 'To date cannot be in the future.')
    const result = await this.stores.accounts.ledger(account.client.id, supplierId, from, to)
    if (!result) throw new ApiError(404, 'Supplier was not found.')
    return result
  }

  // ---------------------------------------------------------------- Supplier payments
  listPayments(account: Account, query: unknown) { return this.stores.payments.list(account.client.id, this.filter(query)) }
  getPayment(account: Account, paymentId: bigint) { return this.stores.payments.get(account.client.id, paymentId) }
  openItems(account: Account, supplierId: bigint) { return this.stores.payments.openItems(account.client.id, supplierId) }
  async savePayment(account: Account, body: unknown) {
    const value = parse(paymentSchema, body)
    const chequeDate = optionalDate(value.chequeDate || null)
    return this.stores.payments.save(account, { ...value, date: documentDate(value.date, 'Payment date'), chequeDate: value.mode === 'cheque' ? chequeDate : null })
  }
  async allocateAdvance(account: Account, paymentId: bigint, body: unknown) {
    const value = parse(z.object({ date: dateString.optional(), allocations: allocationSchema.refine(rows => rows.length > 0, 'Choose what to allocate.') }), body)
    return this.stores.payments.allocateAdvance(account, paymentId, documentDate(value.date, 'Allocation date'), value.allocations)
  }
  async cancelPayment(account: Account, paymentId: bigint, body: unknown) { return this.stores.payments.reverse(account, paymentId, this.reason(body), false) }
  async chequeStatus(account: Account, paymentId: bigint, body: unknown) {
    const value = parse(z.object({ status: z.enum(['cleared', 'bounced']), reason: optionalText(255) }), body)
    if (value.status === 'cleared') return this.stores.payments.chequeCleared(account, paymentId)
    return this.stores.payments.reverse(account, paymentId, value.reason ?? 'Cheque bounced', true)
  }
  cancelCreditNote(account: Account, noteId: bigint, body: unknown) { return this.stores.returns.cancelCreditNote(account, noteId, this.reason(body)) }
}
