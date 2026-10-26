import { z } from 'zod'
import type { Account, AuthStore } from '../../models/auth/contracts.ts'
import type { ReportStore, SalesSourceRow } from '../../models/reports/contracts.ts'
import { ApiError } from '../auth/service.ts'

const id = z.coerce.number().int().positive().safe()
const optionalId = z.union([id, z.literal(''), z.null()]).optional().transform((value) => value === '' || value == null ? undefined : value)
const optionalText = z.union([z.string().trim().max(255), z.null()]).optional().transform((value) => value || undefined)
const date = z.string().regex(/^\d{2}-\d{2}-\d{4}$/)
const reportBoolean = z.preprocess(value => value === 'false' || value === '0' || value === 0 ? false : value === 'true' || value === '1' || value === 1 ? true : value, z.boolean())
const page = z.coerce.number().int().positive().max(1_000_000).default(1)
const exportAll = reportBoolean.default(false)
const salesSchema = z.object({
  fromDate: date, toDate: date, page, exportAll, reportType: z.enum(['summary', 'detailed']).default('detailed'),
  groupByTax: reportBoolean.default(false), categoryId: optionalId, subCategoryId: optionalId,
  brandId: optionalId, variantId: optionalId, itemCode: optionalText, itemName: optionalText,
  gstPercentage: z.preprocess(value => value === '' || value == null ? undefined : value, z.coerce.number().finite().min(0).max(100).optional()),
}).strict()
const paymentSchema = z.object({ fromDate: date, toDate: date, page, exportAll, crossTab: reportBoolean.default(false), paymentModeId: optionalId, userId: optionalId }).strict()
const taxSchema = salesSchema.omit({ groupByTax: true }).extend({ reportType: z.enum(['summary', 'detailed']).default('summary'), gstRegister: reportBoolean.optional() })
const billWiseSchema = z.object({ fromDate: date, toDate: date, page, exportAll, variantId: optionalId, itemCode: optionalText, itemName: optionalText, billNo: z.preprocess(value => typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value, optionalText) }).strict()
const transferSchema = z.object({
  fromDate: date, toDate: date, page, exportAll, reportType: z.enum(['summary', 'detailed']).default('summary'),
  categoryId: optionalId, subCategoryId: optionalId, brandId: optionalId, variantId: optionalId,
  itemCode: optionalText, itemName: optionalText, stockType: z.enum(['IN', 'OUT']).nullable().optional(),
}).strict()
const billSummarySchema = z.object({ fromDate: date, toDate: date, page, exportAll, paymentModeId: optionalId, userId: optionalId }).strict()
const stockSchema = salesSchema.extend({
  fromDate: date.optional(), toDate: date.optional(), asOnDate: date.optional(),
  quantityOperator: z.enum(['=', '<', '>']).optional(),
  quantity: z.preprocess(v => v === '' || v == null ? undefined : v, z.coerce.number().finite().optional()),
}).refine(v => !!(v.asOnDate || v.toDate), { message: 'As on date is required.' })
  .refine(v => !v.quantityOperator || v.quantity !== undefined, { message: 'Enter a quantity to compare.' })
const profitSchema = salesSchema.omit({ groupByTax: true }).extend({ costBasis: z.enum(['transaction', 'master']).default('transaction') })
const kotSchema = z.object({ fromDate: date, toDate: date, page, exportAll, reportType: z.enum(['summary', 'detailed']).default('summary'), userId: optionalId }).strict()
const salesmanSchema = z.object({ fromDate: date, toDate: date, page, exportAll, reportType: z.enum(['commission', 'sale']).default('commission'), salesmanId: optionalId, itemCode: optionalText, itemName: optionalText, variantId: optionalId }).strict()
const customerSchema = z.object({ fromDate: date, toDate: date, page, exportAll, reportType: z.enum(['summary', 'detailed']).default('summary'), customerId: optionalId, itemCode: optionalText, itemName: optionalText, variantId: optionalId }).strict()
const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
const round = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000
const formatDate = (value: Date) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' }).format(value).replaceAll('/', '-')
function parseDate(value: string, end = false) {
  const [day, month, year] = value.split('-').map(Number)
  const check = new Date(Date.UTC(year!, month! - 1, day!))
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month! - 1 || check.getUTCDate() !== day) throw new ApiError(422, 'Invalid report date.')
  const start = new Date(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T00:00:00+05:30`)
  return end ? new Date(start.getTime() + 86_400_000 - 1) : start
}
const lineValue = (row: SalesSourceRow) => {
  const gross = row.qty * row.salePrice
  const discounted = gross - row.discountAmount
  return row.exclusiveGst ? { inclusive: discounted + row.gstAmount, exclusive: discounted } : { inclusive: discounted, exclusive: discounted - row.gstAmount }
}

export class ReportService {
  private readonly store: ReportStore
  private readonly auth: AuthStore
  private readonly perPage: number
  private readonly scanLimit: number
  constructor(store: ReportStore, auth: AuthStore, perPage = 25, scanLimit = 50_000) {
    this.store = store; this.auth = auth; this.perPage = perPage; this.scanLimit = scanLimit
    if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) throw new Error('REPORT_PAGE_SIZE must be between 1 and 100.')
    if (!Number.isInteger(scanLimit) || scanLimit < 100 || scanLimit > 500_000) throw new Error('REPORT_SCAN_LIMIT must be between 100 and 500000.')
  }
  private async authorize(account: Account, aliases: string[]) {
    const permissions = await this.auth.listPermissions(account.client.id, account.user.roleId)
    const reportPermissions = permissions.filter((row) => normalized(row.feature).includes('report'))
    const targets = aliases.map(normalized)
    const matching = reportPermissions.filter((row) => {
      const subFeature = normalized(row.subFeature ?? '')
      return targets.some((target) => subFeature.replace(/report$/, '') === target.replace(/report$/, ''))
    })
    const allowed = matching.length
      ? matching.some((row) => row.view === 1)
      : reportPermissions.some((row) => row.subFeature === null && row.view === 1)
    if (!allowed) throw new ApiError(403, 'You do not have permission to view this report.')
  }
  private range(fromDate: string, toDate: string, dateOnly = false) {
    const offset = dateOnly ? 19_800_000 : 0
    const from = new Date(parseDate(fromDate).getTime() + offset), to = new Date(parseDate(toDate, true).getTime() + offset)
    if (from > to) throw new ApiError(422, 'From date must be on or before To date.')
    const days = (to.getTime() - from.getTime()) / 86_400_000
    if (days > 366) throw new ApiError(422, 'Report date range cannot exceed 366 days.')
    return { from, to }
  }
  private pagination(total: number, currentPage: number) { return { currentPage, lastPage: Math.max(1, Math.ceil(total / this.perPage)), perPage: this.perPage, totalRecords: total } }
  private pageRows<T>(rows: T[], request: { page: number; exportAll?: boolean }) {
    return request.exportAll ? rows : rows.slice((request.page - 1) * this.perPage, request.page * this.perPage)
  }

  async variants(account: Account, input: unknown) {
    await this.authorize(account, ['salesreport', 'stockstatusreport', 'transferinreport', 'transferoutreport', 'stockadjustmentreport', 'billwisesalesreport', 'customersalesreport', 'salesmanreport', 'profitmarginreport'])
    const parsed = z.object({ itemCode: z.string().trim().min(1).max(255) }).strict().safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Enter a valid item code.')
    return { variants: await this.store.reportVariants(account.client.id, parsed.data.itemCode) }
  }

  async dashboard(account: Account) {
    return this.store.dashboard(account.client.id, new Date())
  }

  async sales(account: Account, input: unknown) {
    await this.authorize(account, ['salesreport', 'sales'])
    const parsed = salesSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid sales report filters.')
    const range = this.range(parsed.data.fromDate, parsed.data.toDate)
    const filters = { ...range, page: parsed.data.page, perPage: this.perPage, reportType: parsed.data.reportType, groupByTax: parsed.data.groupByTax,
      ...(parsed.data.categoryId ? { categoryId: BigInt(parsed.data.categoryId) } : {}), ...(parsed.data.subCategoryId ? { subCategoryId: BigInt(parsed.data.subCategoryId) } : {}),
      ...(parsed.data.brandId ? { brandId: BigInt(parsed.data.brandId) } : {}), ...(parsed.data.variantId ? { variantId: BigInt(parsed.data.variantId) } : {}),
      ...(parsed.data.itemCode ? { itemCode: parsed.data.itemCode } : {}), ...(parsed.data.itemName ? { itemName: parsed.data.itemName } : {}),
      ...(parsed.data.gstPercentage === undefined ? {} : { gstPercentage: parsed.data.gstPercentage }),
    }
    const [{ rows, truncated }, options] = await Promise.all([this.store.salesSource(account.client.id, filters, this.scanLimit), this.store.salesOptions(account.client.id)])
    if (truncated) throw new ApiError(422, `Sales report exceeds the ${this.scanLimit} row limit. Narrow the filters.`)
    const totalInclusive = round(rows.reduce((sum, row) => sum + lineValue(row).inclusive, 0))
    let reportRows: Array<Record<string, unknown>>
    if (parsed.data.groupByTax) {
      const grouped = new Map<string, { date: string; rate: number; tax: number; exclusive: number; inclusive: number }>()
      const dailySales = new Map<string, number>()
      for (const row of rows) {
        const dateValue = formatDate(row.billDate), value = lineValue(row), key = `${dateValue}:${row.gstPercentage}`
        const current = grouped.get(key) ?? { date: dateValue, rate: row.gstPercentage, tax: 0, exclusive: 0, inclusive: 0 }
        current.tax += row.gstAmount; current.exclusive += value.exclusive; current.inclusive += value.inclusive
        grouped.set(key, current); dailySales.set(dateValue, (dailySales.get(dateValue) ?? 0) + value.inclusive)
      }
      reportRows = [...grouped.values()].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime() || a.rate - b.rate).map((value, index) => ({
        id: index + 1, date: value.date, taxName: 'GST', taxPercent: value.rate, taxAmount: round(value.tax), netExcl: round(value.exclusive), netIncl: round(value.inclusive),
        salePercent: dailySales.get(value.date) ? round(value.inclusive * 100 / dailySales.get(value.date)!) : 0 }))
    } else {
      const grouped = new Map<string, SalesSourceRow & { qtySold: number; qtyRefund: number; taxAmount: number; netExcl: number; netIncl: number }>()
      for (const row of rows) {
        const dimensions = parsed.data.reportType === 'summary'
          ? [row.category, row.subCategory, row.brand, row.gstPercentage]
          : [String(row.productId), String(row.variantId)]
        const key = JSON.stringify([formatDate(row.billDate), ...dimensions]), value = lineValue(row)
        const current = grouped.get(key) ?? { ...row, qtySold: 0, qtyRefund: 0, taxAmount: 0, netExcl: 0, netIncl: 0 }
        if (row.qty < 0) current.qtyRefund += Math.abs(row.qty); else current.qtySold += row.qty
        current.taxAmount += row.gstAmount; current.netExcl += value.exclusive; current.netIncl += value.inclusive
        grouped.set(key, current)
      }
      reportRows = [...grouped.values()].map((row, index) => ({ id: index + 1, date: formatDate(row.billDate), category: row.category,
        subCategory: row.subCategory, brand: row.brand, gst: row.gstPercentage,
        ...(parsed.data.reportType === 'detailed' ? { itemCode: row.productCode, variantCode: row.variantCode, itemName: row.productName } : {}),
        qtySold: round(row.qtySold), qtyRefund: round(row.qtyRefund), taxAmount: round(row.taxAmount), netExcl: round(row.netExcl), netIncl: round(row.netIncl) }))
    }
    const total = reportRows.length
    return { rows: this.pageRows(reportRows, parsed.data), totals: { qtySold: round(rows.filter((row) => row.qty >= 0).reduce((sum, row) => sum + row.qty, 0)), qtyRefund: round(rows.filter((row) => row.qty < 0).reduce((sum, row) => sum + Math.abs(row.qty), 0)), taxAmount: round(rows.reduce((sum, row) => sum + row.gstAmount, 0)), netExcl: round(rows.reduce((sum, row) => sum + lineValue(row).exclusive, 0)), netIncl: totalInclusive }, pagination: this.pagination(total, parsed.data.page), options }
  }

  async paymentCollection(account: Account, input: unknown) {
    await this.authorize(account, ['paymentcollection', 'paymentwise', 'paymentwisecollection'])
    const parsed = paymentSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid payment collection filters.')
    const range = this.range(parsed.data.fromDate, parsed.data.toDate)
    const filters = { ...range, page: parsed.data.page, perPage: this.perPage, crossTab: parsed.data.crossTab, ...(parsed.data.paymentModeId ? { paymentModeId: BigInt(parsed.data.paymentModeId) } : {}), ...(parsed.data.userId ? { userId: BigInt(parsed.data.userId) } : {}) }
    const [{ rows, truncated }, options] = await Promise.all([this.store.paymentSource(account.client.id, filters, this.scanLimit), this.store.paymentOptions(account.client.id)])
    if (truncated) throw new ApiError(422, `Payment report exceeds the ${this.scanLimit} row limit. Narrow the filters.`)
    const grouped = new Map<string, { date: string; paymentMode: string; totalCollection: number }>()
    for (const row of rows) { const dateValue = parsed.data.crossTab ? '' : formatDate(row.billDate), key = `${dateValue}:${row.paymentModeId}`, current = grouped.get(key) ?? { date: dateValue, paymentMode: row.paymentMode, totalCollection: 0 }; current.totalCollection += row.tenderedChange === 2 ? -row.amount : row.amount; grouped.set(key, current) }
    const reportRows = [...grouped.values()].map((row, index) => ({ id: index + 1, ...row, totalCollection: round(row.totalCollection) }))
    const total = reportRows.length
    return { rows: this.pageRows(reportRows, parsed.data), totalCollection: round(reportRows.reduce((sum, row) => sum + row.totalCollection, 0)), pagination: this.pagination(total, parsed.data.page), options }
  }

  async taxBreakup(account: Account, input: unknown) {
    await this.authorize(account, ['taxbreakup', 'taxreport'])
    const parsed = taxSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid tax breakup report filters.')
    const range = this.range(parsed.data.fromDate, parsed.data.toDate)
    const [source, options] = await Promise.all([
      this.store.salesSource(account.client.id, { ...range, page: 1, perPage: this.perPage, reportType: 'detailed', groupByTax: false,
        ...(parsed.data.categoryId ? { categoryId: BigInt(parsed.data.categoryId) } : {}), ...(parsed.data.subCategoryId ? { subCategoryId: BigInt(parsed.data.subCategoryId) } : {}),
        ...(parsed.data.brandId ? { brandId: BigInt(parsed.data.brandId) } : {}), ...(parsed.data.variantId ? { variantId: BigInt(parsed.data.variantId) } : {}),
        ...(parsed.data.itemCode ? { itemCode: parsed.data.itemCode } : {}), ...(parsed.data.itemName ? { itemName: parsed.data.itemName } : {}),
        ...(parsed.data.gstPercentage === undefined ? {} : { gstPercentage: parsed.data.gstPercentage }) }, this.scanLimit),
      this.store.salesOptions(account.client.id),
    ])
    if (source.truncated) throw new ApiError(422, `Tax breakup report exceeds the ${this.scanLimit} row limit. Narrow the filters.`)
    // Include zero-rated, inactive historical rates, and all configured current rates.
    const rates = [...new Set([...options.taxes.map(t => t.value), ...source.rows.map(r => r.gstPercentage)])].sort((a, b) => a - b)
    const blank = () => Object.fromEntries(rates.flatMap(rate => [[`gst${rate}Sales`, 0], [`salesTax${rate}`, 0]])) as Record<string, number>
    type Group = { date: string; billNo?: number; billAmount: number; basicValue: number; totalAmount: number; values: Record<string, number> }
    const groups = new Map<string, Group>(), totalValues = blank()
    for (const row of source.rows) {
      const dateValue = formatDate(row.billDate), key = parsed.data.reportType === 'detailed' ? `${dateValue}:${row.billNumber}` : dateValue
      const current = groups.get(key) ?? { date: dateValue, ...(parsed.data.reportType === 'detailed' ? { billNo: row.billNumber } : {}), billAmount: 0, basicValue: 0, totalAmount: 0, values: blank() }
      const value = lineValue(row), salesKey = `gst${row.gstPercentage}Sales`, taxKey = `salesTax${row.gstPercentage}`
      current.billAmount += value.inclusive; current.basicValue += value.exclusive; current.totalAmount += value.inclusive
      current.values[salesKey]! += value.exclusive; current.values[taxKey]! += row.gstAmount
      totalValues[salesKey]! += value.exclusive; totalValues[taxKey]! += row.gstAmount
      groups.set(key, current)
    }
    const reportRows: Array<Record<string, unknown>> = [...groups.values()].map(({ values, ...row }, index) => ({ ...row, id: index + 1,
      billAmount: round(row.billAmount), basicValue: round(row.basicValue), totalAmount: round(row.totalAmount),
      ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, round(value)])) }))
    const totals: Record<string, number> = { count: reportRows.length, billAmount: round(source.rows.reduce((sum, row) => sum + lineValue(row).inclusive, 0)),
      basicValue: round(source.rows.reduce((sum, row) => sum + lineValue(row).exclusive, 0)), totalAmount: round(source.rows.reduce((sum, row) => sum + lineValue(row).inclusive, 0)),
      ...Object.fromEntries(Object.entries(totalValues).map(([key, value]) => [key, round(value)])) }
    return { rows: this.pageRows(reportRows, parsed.data), totals, taxRates: rates, options, pagination: this.pagination(reportRows.length, parsed.data.page) }
  }

  async billWiseSales(account: Account, input: unknown) {
    await this.authorize(account, ['billwisesales', 'billwise'])
    const parsed = billWiseSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid billwise sales report filters.')
    const range = this.range(parsed.data.fromDate, parsed.data.toDate)
    let billNumber: number | undefined
    if (parsed.data.billNo) {
      const match = parsed.data.billNo.match(/\d+/)
      if (!match) throw new ApiError(422, 'Bill number must contain a valid number.')
      billNumber = Number(match[0])
    }
    const filters = { ...range, page: parsed.data.page, perPage: this.perPage,
      ...(parsed.data.variantId ? { variantId: BigInt(parsed.data.variantId) } : {}),
      ...(parsed.data.itemCode ? { itemCode: parsed.data.itemCode } : {}),
      ...(parsed.data.itemName ? { itemName: parsed.data.itemName } : {}),
      ...(billNumber ? { billNumber } : {}),
    }
    const [{ rows, truncated }, options] = await Promise.all([this.store.billWiseSource(account.client.id, filters, this.scanLimit), this.store.salesOptions(account.client.id)])
    if (truncated) throw new ApiError(422, `Billwise sales report exceeds the ${this.scanLimit} row limit. Narrow the filters.`)
    const reportRows = rows.map((row, index) => { const refund = row.qty < 0, value = lineValue(row); return { id: index + 1, billNo: row.billNumber, date: formatDate(row.billDate), itemCode: row.productCode, variantCode: row.variantCode, variantId: row.variantId === null ? null : Number(row.variantId), itemName: row.productName, unitPrice: round(row.salePrice), qty: refund ? 0 : round(row.qty), qtyRefund: refund ? Math.abs(round(row.qty)) : 0, discountPercentage: round(row.discountAmount && row.qty * row.salePrice ? row.discountAmount * 100 / Math.abs(row.qty * row.salePrice) : 0), discountAmount: round(row.discountAmount), gst: round(row.gstPercentage), gstAmount: round(row.gstAmount), paymentMode: row.paymentMode, totalAmount: round(value.inclusive) } })
    const totals = { qty: round(reportRows.reduce((sum, row) => sum + row.qty, 0)), qtyRefund: round(reportRows.reduce((sum, row) => sum + row.qtyRefund, 0)), discountAmount: round(rows.reduce((sum, row) => sum + row.discountAmount, 0)), gstAmount: round(rows.reduce((sum, row) => sum + row.gstAmount, 0)), totalAmount: round(reportRows.reduce((sum, row) => sum + row.totalAmount, 0)) }
    const total = reportRows.length
    return { rows: this.pageRows(reportRows, parsed.data), totals, pagination: this.pagination(total, parsed.data.page), options: { variants: options.variants } }
  }

  async transfer(account: Account, direction: 'in' | 'out' | 'adjustment', input: unknown) {
    if (direction === 'adjustment') {
      const grants = await this.auth.listPermissions(account.client.id, account.user.roleId)
      const explicit = grants.filter(row => normalized(row.feature).includes('report') && normalized(row.subFeature ?? '') === 'stockadjustmentreport')
      if (explicit.length && !explicit.some(row => row.view === 1)) throw new ApiError(403, 'You do not have permission to view this report.')
    }
    await this.authorize(account, direction === 'adjustment' ? ['stockadjustmentreport', 'stockadjustment', 'stockstatusreport', 'transferinreport', 'transferoutreport'] : direction === 'in' ? ['transferinreport', 'transferin'] : ['transferoutreport', 'transferout'])
    const parsed = transferSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, direction === 'adjustment' ? 'Invalid stock adjustment report filters.' : `Invalid Transfer ${direction === 'in' ? 'In' : 'Out'} report filters.`)
    const range = this.range(parsed.data.fromDate, parsed.data.toDate, true)
    const filters = {
      ...(parsed.data.stockType ? { stockType: parsed.data.stockType } : {}),
      ...range, page: parsed.data.page, perPage: this.perPage, reportType: parsed.data.reportType,
      ...(parsed.data.categoryId ? { categoryId: BigInt(parsed.data.categoryId) } : {}),
      ...(parsed.data.subCategoryId ? { subCategoryId: BigInt(parsed.data.subCategoryId) } : {}),
      ...(parsed.data.brandId ? { brandId: BigInt(parsed.data.brandId) } : {}),
      ...(parsed.data.variantId ? { variantId: BigInt(parsed.data.variantId) } : {}),
      ...(parsed.data.itemCode ? { itemCode: parsed.data.itemCode } : {}),
      ...(parsed.data.itemName ? { itemName: parsed.data.itemName } : {}),
    }
    const [{ rows, truncated }, options] = await Promise.all([
      this.store.transferSource(account.client.id, direction, filters, this.scanLimit),
      this.store.salesOptions(account.client.id),
    ])
    if (truncated) throw new ApiError(422, `Transfer ${direction === 'in' ? 'In' : 'Out'} report exceeds the ${this.scanLimit} row limit. Narrow the filters.`)
    type Group = (typeof rows)[number] & { qtyTotal: number; freeQtyTotal: number; mrpValue: number; cpValue: number; salesValue: number }
    const map = new Map<string, Group>()
    for (const row of rows) {
      const key = JSON.stringify([formatDate(row.transferDate), ...(parsed.data.reportType === 'summary'
        ? [row.category, row.subCategory, row.brand] : [String(row.productId), String(row.variantId)]), row.stockType ?? ''])
      const current = map.get(key) ?? { ...row, qtyTotal: 0, freeQtyTotal: 0, mrpValue: 0, cpValue: 0, salesValue: 0 }
      current.qtyTotal += row.qty; current.freeQtyTotal += row.freeQty
      current.mrpValue += row.mrp * row.qty; current.cpValue += row.costPrice * row.qty
      current.salesValue += (row.salePrice ?? 0) * row.qty
      if (current.reason !== row.reason) current.reason = 'Multiple reasons'
      map.set(key, current)
    }
    const reportRows = [...map.values()].map((row, index) => ({ id: index + 1, date: formatDate(row.transferDate),
      groupType: parsed.data.reportType === 'summary' ? 'Product' : 'Transfer', category: row.category, subCategory: row.subCategory, brand: row.brand,
      ...(parsed.data.reportType === 'detailed' ? { itemCode: row.productCode, variantCode: row.variantCode, variantId: Number(row.variantId), itemName: row.productName, eanNo: row.eanCode, hsnCode: row.hsnCode } : {}),
      qty: round(row.qtyTotal), freeQty: round(row.freeQtyTotal), mrpValue: round(row.mrpValue), cpValue: round(row.cpValue), salesValue: round(row.salesValue),
      stockType: row.stockType, reason: row.reason, totalAmount: round(row.salesValue) }))
    const totals = { qty: round(rows.reduce((sum, row) => sum + row.qty, 0)), freeQty: round(rows.reduce((sum, row) => sum + row.freeQty, 0)),
      mrpValue: round(rows.reduce((sum, row) => sum + row.mrp * row.qty, 0)), cpValue: round(rows.reduce((sum, row) => sum + row.costPrice * row.qty, 0)),
      salesValue: round(rows.reduce((sum, row) => sum + (row.salePrice ?? 0) * row.qty, 0)), totalAmount: round(rows.reduce((sum, row) => sum + (row.salePrice ?? 0) * row.qty, 0)) }
    return { rows: this.pageRows(reportRows, parsed.data), totals, valuationNote: rows.some(row => row.salePriceBasis === 'master') ? 'Historical movements without a saved sale price use the current master sale price.' : null, pagination: this.pagination(reportRows.length, parsed.data.page), options }
  }

  async billSummary(account: Account, input: unknown) {
    await this.authorize(account, ['billsummaryreport', 'billsummary'])
    const parsed = billSummarySchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid bill summary report filters.')
    const source = await this.store.billSummarySource(account.client.id, { ...this.range(parsed.data.fromDate, parsed.data.toDate), page: parsed.data.page, perPage: this.perPage, ...(parsed.data.paymentModeId ? { paymentModeId: BigInt(parsed.data.paymentModeId) } : {}), ...(parsed.data.userId ? { userId: BigInt(parsed.data.userId) } : {}) }, this.scanLimit)
    if (source.truncated) throw new ApiError(422, `Bill summary report exceeds the ${this.scanLimit} row limit. Narrow the filters.`)
    const payments = new Map<string, Array<{ mode: string; amount: number }>>()
    for (const row of source.payments) { const key = `${row.billNumber}:${formatDate(row.billDate)}`, list = payments.get(key) ?? []; list.push({ mode: row.paymentMode, amount: round(row.tenderedChange === 2 ? -row.amount : row.amount) }); payments.set(key, list) }
    const allRows = source.bills.map((row, index) => ({ id: index + 1, billNo: row.billNumber, billDate: formatDate(row.billDate), billAmount: round(row.amount), payments: payments.get(`${row.billNumber}:${formatDate(row.billDate)}`) ?? [], smCode: row.salesmanId ? source.salesmanCodes.get(row.salesmanId) ?? '' : '' }))
    return { rows: this.pageRows(allRows, parsed.data), totals: { count: allRows.length, billAmount: round(allRows.reduce((sum, row) => sum + row.billAmount, 0)), amount: round(allRows.reduce((sum, row) => sum + row.payments.reduce((paymentSum, payment) => paymentSum + payment.amount, 0), 0)) }, pagination: this.pagination(allRows.length, parsed.data.page), options: await this.store.paymentOptions(account.client.id) }
  }

  async stockStatus(account: Account, input: unknown) {
    await this.authorize(account, ['stockstatusreport', 'stockstatus'])
    const parsed = stockSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid stock status filters. Select As on Date and a valid quantity comparison.')
    const request = parsed.data, asOnDate = request.asOnDate ?? request.toDate!
    if (parseDate(asOnDate) > parseDate(formatDate(new Date()))) throw new ApiError(422, 'As on Date cannot be in the future.')
    const filters = { ...this.range(asOnDate, asOnDate, true), asOnDate: parseDate(asOnDate, true), page: request.page, perPage: this.perPage, reportType: request.reportType, groupByTax: false,
      ...(request.categoryId ? { categoryId: BigInt(request.categoryId) } : {}), ...(request.subCategoryId ? { subCategoryId: BigInt(request.subCategoryId) } : {}),
      ...(request.brandId ? { brandId: BigInt(request.brandId) } : {}), ...(request.variantId ? { variantId: BigInt(request.variantId) } : {}),
      ...(request.itemCode ? { itemCode: request.itemCode } : {}), ...(request.itemName ? { itemName: request.itemName } : {}),
      ...(request.gstPercentage === undefined ? {} : { gstPercentage: request.gstPercentage }) }
    const [source, options] = await Promise.all([this.store.stockSource(account.client.id, filters, this.scanLimit), this.store.salesOptions(account.client.id)])
    if (source.truncated) throw new ApiError(422, `Stock status report exceeds the ${this.scanLimit} row limit. Narrow the filters.`)
    const rows = source.rows.filter(row => {
      const qty = round(row.availableQty ?? 0), target = request.quantity!
      return !request.quantityOperator || (request.quantityOperator === '=' ? qty === target : request.quantityOperator === '<' ? qty < target : qty > target)
    })
    const map = new Map<string, { category: string; subCategory: string; brand: string; availableQty: number }>()
    for (const row of rows) { const key = JSON.stringify([row.category, row.subCategory, row.brand]), current = map.get(key) ?? { category: row.category, subCategory: row.subCategory, brand: row.brand, availableQty: 0 }; current.availableQty += row.availableQty ?? 0; map.set(key, current) }
    const reportRows: Array<Record<string, unknown>> = request.reportType === 'summary'
      ? [...map.values()].map((row, index) => ({ ...row, id: index + 1, availableQty: round(row.availableQty) }))
      : rows.map((row, index) => ({ id: index + 1, category: row.category, subCategory: row.subCategory, brand: row.brand,
        itemCode: row.productCode, variantCode: row.variantCode, itemName: row.productName, packSize: row.packSize ?? '', eanCode: row.eanCode ?? '',
        gst: row.gstPercentage, hsnCode: row.hsnCode ?? '', availableQty: round(row.availableQty ?? 0) }))
    return { rows: this.pageRows(reportRows, request), asOnDate, availability: 'asOf', totals: { availableQty: round(rows.reduce((sum, row) => sum + (row.availableQty ?? 0), 0)) }, pagination: this.pagination(reportRows.length, request.page), options }
  }

  async kot(account: Account, input: unknown) {
    await this.authorize(account, ['kotreport', 'kot'])
    const parsed = kotSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid KOT report filters.')
    const filters = { ...this.range(parsed.data.fromDate, parsed.data.toDate), page: parsed.data.page, perPage: this.perPage, reportType: parsed.data.reportType, ...(parsed.data.userId ? { userId: BigInt(parsed.data.userId) } : {}) }
    const [{ rows, truncated }, options] = await Promise.all([this.store.kotSource(account.client.id, filters, this.scanLimit), this.store.paymentOptions(account.client.id)])
    if (truncated) throw new ApiError(422, `KOT report exceeds the ${this.scanLimit} row limit. Narrow the filters.`)
    let reportRows: Array<Record<string, unknown>>
    if (parsed.data.reportType === 'summary') { const groups = new Map<string, { date: string; userId: string; kotCount: number; kotCancelled: number }>(); for (const row of rows) { const key = `${formatDate(row.kotDate)}:${row.userId ?? 0n}`, current = groups.get(key) ?? { date: formatDate(row.kotDate), userId: row.userName, kotCount: 0, kotCancelled: 0 }; current.kotCount += 1; if (row.status !== 1) current.kotCancelled += 1; groups.set(key, current) } reportRows = [...groups.values()].map((row, index) => ({ id: index + 1, ...row })) } else reportRows = rows.map((row, index) => ({ id: index + 1, date: formatDate(row.kotDate), userId: row.userName, kotNo: row.kotNo, items: row.items.map((item) => ({ ...item, qty: round(item.qty) })) }))
    return { rows: this.pageRows(reportRows, parsed.data), pagination: this.pagination(reportRows.length, parsed.data.page), options: { users: options.users } }
  }

  async salesman(account: Account, input: unknown) {
    await this.authorize(account, ['salesmanreport', 'salesman'])
    const parsed = salesmanSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid salesman report filters.')
    const filters = { ...this.range(parsed.data.fromDate, parsed.data.toDate), page: parsed.data.page, perPage: this.perPage, reportType: parsed.data.reportType,
      ...(parsed.data.salesmanId ? { salesmanId: BigInt(parsed.data.salesmanId) } : {}), ...(parsed.data.variantId ? { variantId: BigInt(parsed.data.variantId) } : {}),
      ...(parsed.data.itemCode ? { itemCode: parsed.data.itemCode } : {}), ...(parsed.data.itemName ? { itemName: parsed.data.itemName } : {}) }
    const [{ rows, truncated }, options] = await Promise.all([this.store.salesmanSource(account.client.id, filters, this.scanLimit), this.store.salesmanOptions(account.client.id)])
    if (truncated) throw new ApiError(422, `Salesman report exceeds the ${this.scanLimit} row limit. Narrow the filters.`)
    let reportRows: Array<Record<string, unknown>>
    if (parsed.data.reportType === 'commission') {
      const groups = new Map<string, { date: string; salesmanCode: string; salesmanName: string; commission: number; netSales: number; commissionAmount: number }>()
      for (const row of rows) {
        const key = `${formatDate(row.billDate)}:${row.salesmanId}`
        const net = row.qty * row.unitPrice - (row.discountAmount ?? row.qty * row.unitPrice * row.discount / 100)
        const current = groups.get(key) ?? { date: formatDate(row.billDate), salesmanCode: row.salesmanCode, salesmanName: row.salesmanName, commission: row.commission, netSales: 0, commissionAmount: 0 }
        current.netSales += net; current.commissionAmount += net * row.commission / 100
        groups.set(key, current)
      }
      reportRows = [...groups.values()].map((row, index) => ({ ...row, id: index + 1, netSales: round(row.netSales), commissionAmount: round(row.commissionAmount) }))
    } else {
      const groups = new Map<string, Record<string, any>>()
      for (const row of rows) {
        const key = JSON.stringify([formatDate(row.billDate), String(row.salesmanId), String(row.productId ?? row.productName), String(row.variantId ?? '')])
        const current = groups.get(key) ?? { date: formatDate(row.billDate), salesmanCode: row.salesmanCode, salesmanName: row.salesmanName,
          itemCode: row.productCode ?? '', variantCode: row.variantCode ?? '', itemName: row.productName, qty: 0, qtyRefund: 0, salesValue: 0, discountAmount: 0, amount: 0 }
        const gross = row.qty * row.unitPrice, discount = row.discountAmount ?? gross * row.discount / 100
        if (row.qty < 0) current.qtyRefund += Math.abs(row.qty); else current.qty += row.qty
        current.salesValue += gross; current.discountAmount += discount; current.amount += gross - discount
        groups.set(key, current)
      }
      const keys = ['qty', 'qtyRefund', 'salesValue', 'discountAmount', 'amount']
      reportRows = [...groups.values()].map((row, index) => ({ ...row, id: index + 1, ...Object.fromEntries(keys.map(key => [key, round(row[key])])) }))
    }
    const totals = { qty: round(rows.filter(r => r.qty >= 0).reduce((sum, r) => sum + r.qty, 0)), qtyRefund: round(rows.filter(r => r.qty < 0).reduce((sum, r) => sum - r.qty, 0)),
      salesValue: round(rows.reduce((sum, r) => sum + r.qty * r.unitPrice, 0)),
      discountAmount: round(rows.reduce((sum, r) => sum + (r.discountAmount ?? r.qty * r.unitPrice * r.discount / 100), 0)),
      netSales: round(rows.reduce((sum, r) => sum + r.qty * r.unitPrice - (r.discountAmount ?? r.qty * r.unitPrice * r.discount / 100), 0)),
      commissionAmount: round(rows.reduce((sum, r) => sum + (r.qty * r.unitPrice - (r.discountAmount ?? r.qty * r.unitPrice * r.discount / 100)) * r.commission / 100, 0)),
      amount: round(rows.reduce((sum, r) => sum + r.qty * r.unitPrice - (r.discountAmount ?? r.qty * r.unitPrice * r.discount / 100), 0)) }
    return { rows: this.pageRows(reportRows, parsed.data), totals, pagination: this.pagination(reportRows.length, parsed.data.page), options: { salesmen: options } }
  }

  async customerSales(account: Account, input: unknown) {
    await this.authorize(account, ['customersalesreport', 'customersales'])
    const parsed = customerSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid customer sales report filters.')
    const filters = { ...this.range(parsed.data.fromDate, parsed.data.toDate), page: parsed.data.page, perPage: this.perPage, reportType: parsed.data.reportType,
      ...(parsed.data.customerId ? { customerId: BigInt(parsed.data.customerId) } : {}),
      ...(parsed.data.itemCode ? { itemCode: parsed.data.itemCode } : {}), ...(parsed.data.itemName ? { itemName: parsed.data.itemName } : {}),
      ...(parsed.data.variantId ? { variantId: BigInt(parsed.data.variantId) } : {}) }
    const [{ rows, truncated }, options] = await Promise.all([this.store.customerSalesSource(account.client.id, filters, this.scanLimit), this.store.customerOptions(account.client.id)])
    if (truncated) throw new ApiError(422, `Customer sales report exceeds the ${this.scanLimit} row limit. Narrow the filters.`)
    const map = new Map<string, Record<string, any>>()
    for (const row of rows) {
      const value = lineValue(row), key = JSON.stringify([formatDate(row.billDate), String(row.customerId), ...(parsed.data.reportType === 'summary'
        ? [row.category, row.subCategory, row.brand, row.gstPercentage] : [String(row.productId), String(row.variantId)])])
      const current = map.get(key) ?? { date: formatDate(row.billDate), customerId: Number(row.customerId), customerName: row.customerName, category: row.category,
        subCategory: row.subCategory, brand: row.brand, gst: row.gstPercentage,
        ...(parsed.data.reportType === 'detailed' ? { itemCode: row.productCode, variantCode: row.variantCode, itemName: row.productName } : {}),
        qtyRecieved: 0, qtyRefund: 0, taxAmt: 0, netExcl: 0, netIncl: 0 }
      if (row.qty < 0) current.qtyRefund += Math.abs(row.qty); else current.qtyRecieved += row.qty
      current.taxAmt += row.gstAmount; current.netExcl += value.exclusive; current.netIncl += value.inclusive; map.set(key, current)
    }
    const keys = ['qtyRecieved', 'qtyRefund', 'taxAmt', 'netExcl', 'netIncl']
    const reportRows: Array<Record<string, unknown>> = [...map.values()].map((row, index) => ({ ...row, id: index + 1, ...Object.fromEntries(keys.map(key => [key, round(row[key])])) }))
    const totals = Object.fromEntries(keys.map(key => [key, round([...map.values()].reduce((sum, row) => sum + row[key], 0))]))
    return { rows: this.pageRows(reportRows, parsed.data), totals, pagination: this.pagination(reportRows.length, parsed.data.page), options: { customers: options } }
  }

  async profitMargin(account: Account, input: unknown) {
    await this.authorize(account, ['profitmarginreport'])
    const parsed = profitSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid profit margin report filters.')
    const p = parsed.data
    const filters = { ...this.range(p.fromDate, p.toDate), page: p.page, perPage: this.perPage, reportType: p.reportType, groupByTax: false,
      ...(p.categoryId ? { categoryId: BigInt(p.categoryId) } : {}), ...(p.subCategoryId ? { subCategoryId: BigInt(p.subCategoryId) } : {}),
      ...(p.brandId ? { brandId: BigInt(p.brandId) } : {}), ...(p.variantId ? { variantId: BigInt(p.variantId) } : {}),
      ...(p.itemCode ? { itemCode: p.itemCode } : {}), ...(p.itemName ? { itemName: p.itemName } : {}), ...(p.gstPercentage === undefined ? {} : { gstPercentage: p.gstPercentage }) }
    const [source, options] = await Promise.all([this.store.salesSource(account.client.id, filters, this.scanLimit), this.store.salesOptions(account.client.id)])
    if (source.truncated) throw new ApiError(422, `Profit report exceeds the ${this.scanLimit} row limit. Narrow the filters.`)
    const map = new Map<string, Record<string, any>>()
    for (const row of source.rows) {
      const key = JSON.stringify([formatDate(row.billDate), ...(p.reportType === 'summary' ? [row.category, row.subCategory, row.brand] : [String(row.productId), String(row.variantId)])])
      const current = map.get(key) ?? { date: formatDate(row.billDate), category: row.category, subCategory: row.subCategory, brand: row.brand,
        ...(p.reportType === 'detailed' ? { itemCode: row.productCode, variantCode: row.variantCode, itemName: row.productName } : {}),
        qtySold: 0, qtyRefund: 0, costValue: 0, salesValue: 0, discountAmount: 0, netSales: 0 }
      const net = lineValue(row).exclusive
      if (row.qty < 0) current.qtyRefund += Math.abs(row.qty); else current.qtySold += row.qty
      current.costValue += row.qty * (p.costBasis === 'master' ? row.masterCostPrice ?? 0 : row.costPrice ?? 0)
      const gross = row.qty * row.salePrice / (row.exclusiveGst ? 1 : 1 + row.gstPercentage / 100)
      current.salesValue += gross; current.discountAmount += gross - net; current.netSales += net; map.set(key, current)
    }
    const keys = ['qtySold', 'qtyRefund', 'costValue', 'salesValue', 'discountAmount', 'netSales']
    const finish = (row: Record<string, any>): Record<string, any> => { const profit = row.netSales - row.costValue; return { ...row,
      ...Object.fromEntries(keys.map(key => [key, round(row[key])])), netProfit: round(profit), profitPercent: row.netSales ? round(profit * 100 / row.netSales) : 0 } }
    const reportRows = [...map.values()].map((row, index) => ({ ...finish(row), id: index + 1 }))
    const totals = finish(Object.fromEntries(keys.map(key => [key, [...map.values()].reduce((sum, row) => sum + row[key], 0)])))
    return { rows: this.pageRows(reportRows, p), totals, costBasis: p.costBasis, salesBasis: 'excludingGST', pagination: this.pagination(reportRows.length, p.page), options }
  }

}
