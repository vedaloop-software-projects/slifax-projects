import { z } from 'zod'
import type { Account, AuthStore } from '../../models/auth/contracts.ts'
import type { ReportStore, SalesSourceRow } from '../../models/reports/contracts.ts'
import { ApiError } from '../auth/service.ts'

const id = z.coerce.number().int().positive().safe()
const optionalId = z.union([id, z.literal(''), z.null()]).optional().transform((value) => value === '' || value == null ? undefined : value)
const optionalText = z.union([z.string().trim().max(255), z.null()]).optional().transform((value) => value || undefined)
const date = z.string().regex(/^\d{2}-\d{2}-\d{4}$/)
const page = z.coerce.number().int().positive().max(1_000_000).default(1)
const salesSchema = z.object({
  fromDate: date, toDate: date, page, reportType: z.enum(['summary', 'detailed']).default('detailed'),
  groupByTax: z.coerce.boolean().default(false), categoryId: optionalId, subCategoryId: optionalId,
  brandId: optionalId, variantId: optionalId, itemCode: optionalText, itemName: optionalText,
  gstPercentage: z.union([z.coerce.number().finite().min(0).max(100), z.literal(''), z.null()]).optional().transform((value) => value === '' || value == null ? undefined : value),
}).strict()
const paymentSchema = z.object({ fromDate: date, toDate: date, page, crossTab: z.coerce.boolean().default(false), paymentModeId: optionalId, userId: optionalId }).strict()
const taxSchema = z.object({ fromDate: date, toDate: date, page, reportType: z.enum(['summary', 'detailed']).default('summary'), gstRegister: z.coerce.boolean().default(true) }).strict()
const billWiseSchema = z.object({ fromDate: date, toDate: date, page, variantId: optionalId, itemCode: optionalText, itemName: optionalText, billNo: optionalText }).strict()
const transferSchema = z.object({
  fromDate: date, toDate: date, page, reportType: z.enum(['summary', 'detailed']).default('summary'),
  categoryId: optionalId, subCategoryId: optionalId, brandId: optionalId, variantId: optionalId,
  itemCode: optionalText, itemName: optionalText,
}).strict()
const billSummarySchema = z.object({ fromDate: date, toDate: date, page, paymentModeId: optionalId, userId: optionalId }).strict()
const stockSchema = salesSchema
const kotSchema = z.object({ fromDate: date, toDate: date, page, reportType: z.enum(['summary', 'detailed']).default('summary'), userId: optionalId }).strict()
const salesmanSchema = z.object({ fromDate: date, toDate: date, page, reportType: z.enum(['commission', 'sale']).default('commission'), salesmanId: optionalId }).strict()
const customerSchema = z.object({ fromDate: date, toDate: date, page, reportType: z.enum(['summary', 'detailed']).default('summary'), customerId: optionalId }).strict()
const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
const round = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000
const formatDate = (value: Date) => `${String(value.getDate()).padStart(2, '0')}-${String(value.getMonth() + 1).padStart(2, '0')}-${value.getFullYear()}`
function parseDate(value: string, end = false) {
  const [day, month, year] = value.split('-').map(Number)
  const result = new Date(year!, month! - 1, day!, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0)
  if (result.getFullYear() !== year || result.getMonth() !== month! - 1 || result.getDate() !== day) throw new ApiError(422, 'Invalid report date.')
  return result
}
const lineValue = (row: SalesSourceRow) => {
  const gross = row.qty * row.salePrice
  const inclusive = gross - row.discountAmount
  return { inclusive, exclusive: inclusive - row.gstAmount }
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
      return targets.some((target) => subFeature.includes(target))
    })
    const allowed = matching.length
      ? matching.some((row) => row.view === 1)
      : reportPermissions.some((row) => row.subFeature === null && row.view === 1)
    if (!allowed) throw new ApiError(403, 'You do not have permission to view this report.')
  }
  private range(fromDate: string, toDate: string) {
    const from = parseDate(fromDate), to = parseDate(toDate, true)
    if (from > to) throw new ApiError(422, 'From date must be on or before To date.')
    const days = (to.getTime() - from.getTime()) / 86_400_000
    if (days > 366) throw new ApiError(422, 'Report date range cannot exceed 366 days.')
    return { from, to }
  }
  private pagination(total: number, currentPage: number) { return { currentPage, lastPage: Math.max(1, Math.ceil(total / this.perPage)), perPage: this.perPage, totalRecords: total } }

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
      const grouped = new Map<number, { tax: number; exclusive: number; inclusive: number }>()
      for (const row of rows) { const value = lineValue(row), current = grouped.get(row.gstPercentage) ?? { tax: 0, exclusive: 0, inclusive: 0 }; current.tax += row.gstAmount; current.exclusive += value.exclusive; current.inclusive += value.inclusive; grouped.set(row.gstPercentage, current) }
      reportRows = [...grouped].sort(([a], [b]) => a - b).map(([rate, value], index) => ({ id: index + 1, taxName: 'GST', taxPercent: rate, netExcl: round(value.exclusive), netIncl: round(value.inclusive), salePercent: totalInclusive ? round(value.inclusive * 100 / totalInclusive) : 0 }))
    } else if (parsed.data.reportType === 'summary') {
      const grouped = new Map<string, SalesSourceRow & { qtySold: number; qtyRefund: number; taxAmount: number; netExcl: number; netIncl: number }>()
      for (const row of rows) { const key = `${row.productId}:${row.variantId ?? 0n}:${row.gstPercentage}`, value = lineValue(row), current = grouped.get(key) ?? { ...row, qtySold: 0, qtyRefund: 0, taxAmount: 0, netExcl: 0, netIncl: 0 }; if (row.billMode === 4 || row.qty < 0) current.qtyRefund += Math.abs(row.qty); else current.qtySold += row.qty; current.taxAmount += row.gstAmount; current.netExcl += value.exclusive; current.netIncl += value.inclusive; grouped.set(key, current) }
      reportRows = [...grouped.values()].map((row, index) => ({ id: index + 1, date: '', category: row.category, subCategory: row.subCategory, brand: row.brand, gst: row.gstPercentage, itemCode: row.productCode, variantCode: row.variantCode, itemName: row.productName, qtySold: round(row.qtySold), qtyRefund: round(row.qtyRefund), taxAmount: round(row.taxAmount), netExcl: round(row.netExcl), netIncl: round(row.netIncl) }))
    } else {
      reportRows = rows.map((row, index) => { const value = lineValue(row), refund = row.billMode === 4 || row.qty < 0; return { id: index + 1, date: formatDate(row.billDate), billNumber: row.billNumber, category: row.category, subCategory: row.subCategory, brand: row.brand, gst: row.gstPercentage, itemCode: row.productCode, variantCode: row.variantCode, itemName: row.productName, qtySold: refund ? 0 : round(row.qty), qtyRefund: refund ? Math.abs(round(row.qty)) : 0, taxAmount: round(row.gstAmount), netExcl: round(value.exclusive), netIncl: round(value.inclusive) } })
    }
    const total = reportRows.length, start = (parsed.data.page - 1) * this.perPage
    return { rows: reportRows.slice(start, start + this.perPage), totals: { qtySold: round(rows.filter((row) => row.billMode !== 4 && row.qty >= 0).reduce((sum, row) => sum + row.qty, 0)), qtyRefund: round(rows.filter((row) => row.billMode === 4 || row.qty < 0).reduce((sum, row) => sum + Math.abs(row.qty), 0)), taxAmount: round(rows.reduce((sum, row) => sum + row.gstAmount, 0)), netExcl: round(rows.reduce((sum, row) => sum + lineValue(row).exclusive, 0)), netIncl: totalInclusive }, pagination: this.pagination(total, parsed.data.page), options }
  }

  async paymentCollection(account: Account, input: unknown) {
    await this.authorize(account, ['paymentcollection', 'paymentwise'])
    const parsed = paymentSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid payment collection filters.')
    const range = this.range(parsed.data.fromDate, parsed.data.toDate)
    const filters = { ...range, page: parsed.data.page, perPage: this.perPage, crossTab: parsed.data.crossTab, ...(parsed.data.paymentModeId ? { paymentModeId: BigInt(parsed.data.paymentModeId) } : {}), ...(parsed.data.userId ? { userId: BigInt(parsed.data.userId) } : {}) }
    const [{ rows, truncated }, options] = await Promise.all([this.store.paymentSource(account.client.id, filters, this.scanLimit), this.store.paymentOptions(account.client.id)])
    if (truncated) throw new ApiError(422, `Payment report exceeds the ${this.scanLimit} row limit. Narrow the filters.`)
    const grouped = new Map<string, { date: string; paymentMode: string; totalCollection: number }>()
    for (const row of rows) { const dateValue = parsed.data.crossTab ? '' : formatDate(row.billDate), key = `${dateValue}:${row.paymentModeId}`, current = grouped.get(key) ?? { date: dateValue, paymentMode: row.paymentMode, totalCollection: 0 }; current.totalCollection += row.tenderedChange === 2 ? -row.amount : row.amount; grouped.set(key, current) }
    const reportRows = [...grouped.values()].map((row, index) => ({ id: index + 1, ...row, totalCollection: round(row.totalCollection) }))
    const total = reportRows.length, start = (parsed.data.page - 1) * this.perPage
    return { rows: reportRows.slice(start, start + this.perPage), totalCollection: round(reportRows.reduce((sum, row) => sum + row.totalCollection, 0)), pagination: this.pagination(total, parsed.data.page), options }
  }

  async taxBreakup(account: Account, input: unknown) {
    await this.authorize(account, ['taxbreakup', 'taxreport'])
    const parsed = taxSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid tax breakup report filters.')
    const range = this.range(parsed.data.fromDate, parsed.data.toDate)
    const source = await this.store.salesSource(account.client.id, { ...range, page: parsed.data.page, perPage: this.perPage, reportType: 'detailed', groupByTax: false }, this.scanLimit)
    if (source.truncated) throw new ApiError(422, `Tax breakup report exceeds the ${this.scanLimit} row limit. Narrow the filters.`)
    const sourceRows = parsed.data.gstRegister ? source.rows.filter((row) => row.gstPercentage > 0) : source.rows
    type TaxGroup = { date: string; billNo?: number; billAmount: number; gst5Sales: number; salesTax5: number; gst12Sales: number; salesTax12: number; basicValue: number; totalAmount: number }
    const groups = new Map<string, TaxGroup>()
    for (const row of sourceRows) {
      const dateValue = formatDate(row.billDate)
      const key = parsed.data.reportType === 'detailed' ? `${dateValue}:${row.billNumber}` : dateValue
      const current = groups.get(key) ?? { date: dateValue, ...(parsed.data.reportType === 'detailed' ? { billNo: row.billNumber } : {}), billAmount: 0, gst5Sales: 0, salesTax5: 0, gst12Sales: 0, salesTax12: 0, basicValue: 0, totalAmount: 0 }
      const value = lineValue(row)
      current.billAmount += value.inclusive
      current.basicValue += value.exclusive
      current.totalAmount += value.inclusive
      if (row.gstPercentage === 5) { current.gst5Sales += value.exclusive; current.salesTax5 += row.gstAmount }
      if (row.gstPercentage === 12) { current.gst12Sales += value.exclusive; current.salesTax12 += row.gstAmount }
      groups.set(key, current)
    }
    const reportRows = [...groups.values()].map((row, index) => ({
      id: index + 1, date: row.date, ...(row.billNo === undefined ? {} : { billNo: row.billNo }),
      billAmount: round(row.billAmount), gst5Sales: round(row.gst5Sales), salesTax5: round(row.salesTax5),
      gst12Sales: round(row.gst12Sales), salesTax12: round(row.salesTax12), basicValue: round(row.basicValue), totalAmount: round(row.totalAmount),
    }))
    const totals = { count: reportRows.length, gst5Sales: round(sourceRows.filter((row) => row.gstPercentage === 5).reduce((sum, row) => sum + lineValue(row).exclusive, 0)), salesTax5: round(sourceRows.filter((row) => row.gstPercentage === 5).reduce((sum, row) => sum + row.gstAmount, 0)), gst12Sales: round(sourceRows.filter((row) => row.gstPercentage === 12).reduce((sum, row) => sum + lineValue(row).exclusive, 0)), salesTax12: round(sourceRows.filter((row) => row.gstPercentage === 12).reduce((sum, row) => sum + row.gstAmount, 0)), basicValue: round(sourceRows.reduce((sum, row) => sum + lineValue(row).exclusive, 0)), totalAmount: round(sourceRows.reduce((sum, row) => sum + lineValue(row).inclusive, 0)) }
    const total = reportRows.length, start = (parsed.data.page - 1) * this.perPage
    return { rows: reportRows.slice(start, start + this.perPage), totals, pagination: this.pagination(total, parsed.data.page) }
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
    const reportRows = rows.map((row, index) => { const refund = row.billMode === 4 || row.qty < 0, value = lineValue(row); return { id: index + 1, billNo: row.billNumber, date: formatDate(row.billDate), itemCode: row.productCode, variantCode: row.variantCode, variantId: row.variantId === null ? null : Number(row.variantId), itemName: row.productName, unitPrice: round(row.salePrice), qty: refund ? 0 : round(row.qty), qtyRefund: refund ? Math.abs(round(row.qty)) : 0, discountPercentage: round(row.discountAmount && row.qty * row.salePrice ? row.discountAmount * 100 / Math.abs(row.qty * row.salePrice) : 0), discountAmount: round(row.discountAmount), gst: round(row.gstPercentage), gstAmount: round(row.gstAmount), paymentMode: row.paymentMode, totalAmount: round(value.inclusive) } })
    const totals = { qty: round(reportRows.reduce((sum, row) => sum + row.qty, 0)), qtyRefund: round(reportRows.reduce((sum, row) => sum + row.qtyRefund, 0)), discountAmount: round(rows.reduce((sum, row) => sum + row.discountAmount, 0)), gstAmount: round(rows.reduce((sum, row) => sum + row.gstAmount, 0)), totalAmount: round(reportRows.reduce((sum, row) => sum + row.totalAmount, 0)) }
    const total = reportRows.length, start = (parsed.data.page - 1) * this.perPage
    return { rows: reportRows.slice(start, start + this.perPage), totals, pagination: this.pagination(total, parsed.data.page), options: { variants: options.variants } }
  }

  async transfer(account: Account, direction: 'in' | 'out', input: unknown) {
    await this.authorize(account, direction === 'in' ? ['transferinreport', 'transferin'] : ['transferoutreport', 'transferout'])
    const parsed = transferSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, `Invalid Transfer ${direction === 'in' ? 'In' : 'Out'} report filters.`)
    const range = this.range(parsed.data.fromDate, parsed.data.toDate)
    const filters = {
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
    type Group = (typeof rows)[number] & { qtyTotal: number; freeQtyTotal: number }
    let grouped: Group[]
    if (parsed.data.reportType === 'summary') {
      const map = new Map<string, Group>()
      for (const row of rows) {
        const key = `${row.productId}:${row.variantId}`
        const current = map.get(key) ?? { ...row, qtyTotal: 0, freeQtyTotal: 0 }
        current.qtyTotal += row.qty
        current.freeQtyTotal += row.freeQty
        map.set(key, current)
      }
      grouped = [...map.values()]
    } else grouped = rows.map((row) => ({ ...row, qtyTotal: row.qty, freeQtyTotal: row.freeQty }))
    const reportRows = grouped.map((row, index) => ({
      id: index + 1, transferNumber: Number(row.transferNumber), date: formatDate(row.transferDate),
      groupType: parsed.data.reportType === 'summary' ? 'Product' : 'Transfer', category: row.category,
      subCategory: row.subCategory, brand: row.brand, itemCode: row.productCode, variantCode: row.variantCode,
      variantId: Number(row.variantId), itemName: row.productName, eanNo: row.eanCode, hsnCode: row.hsnCode,
      qty: round(row.qtyTotal), freeQty: round(row.freeQtyTotal), mrp: round(row.mrp), cp: round(row.costPrice),
      totalAmount: round(row.costPrice * row.qtyTotal),
    }))
    const totals = {
      qty: round(rows.reduce((sum, row) => sum + row.qty, 0)),
      freeQty: round(rows.reduce((sum, row) => sum + row.freeQty, 0)),
      totalAmount: round(rows.reduce((sum, row) => sum + row.costPrice * row.qty, 0)),
    }
    const total = reportRows.length, start = (parsed.data.page - 1) * this.perPage
    return { rows: reportRows.slice(start, start + this.perPage), totals, pagination: this.pagination(total, parsed.data.page), options }
  }

  async billSummary(account: Account, input: unknown) {
    await this.authorize(account, ['billsummaryreport', 'billsummary'])
    const parsed = billSummarySchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid bill summary report filters.')
    const source = await this.store.billSummarySource(account.client.id, { ...this.range(parsed.data.fromDate, parsed.data.toDate), page: parsed.data.page, perPage: this.perPage, ...(parsed.data.paymentModeId ? { paymentModeId: BigInt(parsed.data.paymentModeId) } : {}), ...(parsed.data.userId ? { userId: BigInt(parsed.data.userId) } : {}) }, this.scanLimit)
    if (source.truncated) throw new ApiError(422, `Bill summary report exceeds the ${this.scanLimit} row limit. Narrow the filters.`)
    const payments = new Map<string, Array<{ mode: string; amount: number }>>()
    for (const row of source.payments) { const key = `${row.billNumber}:${row.billDate.toISOString().slice(0, 10)}`, list = payments.get(key) ?? []; list.push({ mode: row.paymentMode, amount: round(row.tenderedChange === 2 ? -row.amount : row.amount) }); payments.set(key, list) }
    const allRows = source.bills.map((row, index) => ({ id: index + 1, billNo: row.billNumber, billDate: formatDate(row.billDate), billAmount: round(row.amount), payments: payments.get(`${row.billNumber}:${row.billDate.toISOString().slice(0, 10)}`) ?? [], smCode: row.salesmanId ? source.salesmanCodes.get(row.salesmanId) ?? '' : '' }))
    const start = (parsed.data.page - 1) * this.perPage
    return { rows: allRows.slice(start, start + this.perPage), totals: { count: allRows.length, amount: round(allRows.reduce((sum, row) => sum + row.payments.reduce((paymentSum, payment) => paymentSum + payment.amount, 0), 0)) }, pagination: this.pagination(allRows.length, parsed.data.page), options: await this.store.paymentOptions(account.client.id) }
  }

  async stockStatus(account: Account, input: unknown) {
    await this.authorize(account, ['stockstatusreport', 'stockstatus'])
    const parsed = stockSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid stock status report filters.')
    const filters = { ...this.range(parsed.data.fromDate, parsed.data.toDate), page: parsed.data.page, perPage: this.perPage, reportType: parsed.data.reportType, groupByTax: parsed.data.groupByTax, ...(parsed.data.categoryId ? { categoryId: BigInt(parsed.data.categoryId) } : {}), ...(parsed.data.subCategoryId ? { subCategoryId: BigInt(parsed.data.subCategoryId) } : {}), ...(parsed.data.brandId ? { brandId: BigInt(parsed.data.brandId) } : {}), ...(parsed.data.variantId ? { variantId: BigInt(parsed.data.variantId) } : {}), ...(parsed.data.itemCode ? { itemCode: parsed.data.itemCode } : {}), ...(parsed.data.itemName ? { itemName: parsed.data.itemName } : {}), ...(parsed.data.gstPercentage === undefined ? {} : { gstPercentage: parsed.data.gstPercentage }) }
    const [{ rows, truncated }, options] = await Promise.all([this.store.stockSource(account.client.id, filters, this.scanLimit), this.store.salesOptions(account.client.id)])
    if (truncated) throw new ApiError(422, `Stock status report exceeds the ${this.scanLimit} row limit. Narrow the filters.`)
    const totalValue = rows.reduce((sum, row) => sum + row.salesValue, 0)
    let reportRows: Array<Record<string, unknown>>
    if (parsed.data.groupByTax) {
      const groups = new Map<number, { tax: number; inclusive: number }>()
      for (const row of rows) { const current = groups.get(row.gstPercentage) ?? { tax: 0, inclusive: 0 }; current.tax += row.gstAmount; current.inclusive += row.salesValue; groups.set(row.gstPercentage, current) }
      reportRows = [...groups].map(([rate, value], index) => ({ id: index + 1, taxName: 'GST', taxPercent: rate, netExcl: round(value.inclusive - value.tax), netIncl: round(value.inclusive), salePercent: totalValue ? round(value.inclusive * 100 / totalValue) : 0 }))
    } else reportRows = rows.map((row, index) => ({ id: index + 1, date: formatDate(row.stockDate), category: row.category, subCategory: row.subCategory, brand: row.brand, gst: row.gstPercentage, itemCode: row.productCode, variantCode: row.variantCode, itemName: row.productName, qtySold: round(row.sales), qtyRefund: round(row.purchaseReturn), taxAmount: round(row.gstAmount), netExcl: round(row.salesValue - row.gstAmount), netIncl: round(row.salesValue) }))
    const start = (parsed.data.page - 1) * this.perPage
    return { rows: reportRows.slice(start, start + this.perPage), totals: { qtySold: round(rows.reduce((sum, row) => sum + row.sales, 0)), qtyRefund: round(rows.reduce((sum, row) => sum + row.purchaseReturn, 0)), taxAmount: round(rows.reduce((sum, row) => sum + row.gstAmount, 0)), netExcl: round(rows.reduce((sum, row) => sum + row.salesValue - row.gstAmount, 0)), netIncl: round(totalValue) }, pagination: this.pagination(reportRows.length, parsed.data.page), options }
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
    const start = (parsed.data.page - 1) * this.perPage
    return { rows: reportRows.slice(start, start + this.perPage), pagination: this.pagination(reportRows.length, parsed.data.page), options: { users: options.users } }
  }

  async salesman(account: Account, input: unknown) {
    await this.authorize(account, ['salesmanreport', 'salesman'])
    const parsed = salesmanSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid salesman report filters.')
    const filters = { ...this.range(parsed.data.fromDate, parsed.data.toDate), page: parsed.data.page, perPage: this.perPage, reportType: parsed.data.reportType, ...(parsed.data.salesmanId ? { salesmanId: BigInt(parsed.data.salesmanId) } : {}) }
    const [{ rows, truncated }, options] = await Promise.all([this.store.salesmanSource(account.client.id, filters, this.scanLimit), this.store.salesmanOptions(account.client.id)])
    if (truncated) throw new ApiError(422, `Salesman report exceeds the ${this.scanLimit} row limit. Narrow the filters.`)
    let reportRows: Array<Record<string, unknown>>
    if (parsed.data.reportType === 'commission') { const groups = new Map<string, (typeof rows)[number]>(); for (const row of rows) groups.set(`${formatDate(row.billDate)}:${row.salesmanId}`, row); reportRows = [...groups.values()].map((row, index) => ({ id: index + 1, date: formatDate(row.billDate), salesmanCode: row.salesmanCode, salesmanName: row.salesmanName, commission: round(row.commission) })) } else reportRows = rows.map((row, index) => ({ id: index + 1, date: formatDate(row.billDate), salesmanCode: row.salesmanCode, salesmanName: row.salesmanName, itemName: row.productName, qty: round(row.qty), unitPrice: round(row.unitPrice), discount: round(row.discount), amount: round(row.qty * row.unitPrice * (1 - row.discount / 100)) }))
    const start = (parsed.data.page - 1) * this.perPage
    return { rows: reportRows.slice(start, start + this.perPage), pagination: this.pagination(reportRows.length, parsed.data.page), options: { salesmen: options } }
  }

  async customerSales(account: Account, input: unknown) {
    await this.authorize(account, ['customersalesreport', 'customersales'])
    const parsed = customerSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid customer sales report filters.')
    const filters = { ...this.range(parsed.data.fromDate, parsed.data.toDate), page: parsed.data.page, perPage: this.perPage, reportType: parsed.data.reportType, ...(parsed.data.customerId ? { customerId: BigInt(parsed.data.customerId) } : {}) }
    const [{ rows, truncated }, options] = await Promise.all([this.store.customerSalesSource(account.client.id, filters, this.scanLimit), this.store.customerOptions(account.client.id)])
    if (truncated) throw new ApiError(422, `Customer sales report exceeds the ${this.scanLimit} row limit. Narrow the filters.`)
    const details = rows.map((row, index) => { const refund = row.billMode === 4 || row.qty < 0, value = lineValue(row); return { id: index + 1, date: formatDate(row.billDate), customerName: row.customerName, category: row.category, subCategory: row.subCategory, brand: row.brand, itemCode: row.productCode, variantCode: row.variantCode, itemName: row.productName, gst: row.gstPercentage, qtyRecieved: refund ? 0 : round(row.qty), qtyRef: refund ? Math.abs(round(row.qty)) : 0, qtyRefund: refund ? Math.abs(round(row.qty)) : 0, taxAmt: round(row.gstAmount), netExcl: round(value.exclusive) } })
    let reportRows: Array<Record<string, unknown>> = details
    if (parsed.data.reportType === 'summary') { const groups = new Map<string, typeof details[number]>(); for (const row of details) { const key = `${row.date}:${row.customerName}:${row.category}:${row.subCategory}:${row.brand}:${row.gst}`, current = groups.get(key) ?? { ...row, qtyRecieved: 0, qtyRef: 0, qtyRefund: 0, taxAmt: 0, netExcl: 0 }; current.qtyRecieved += row.qtyRecieved; current.qtyRefund += row.qtyRefund; current.taxAmt += row.taxAmt; current.netExcl += row.netExcl; groups.set(key, current) } reportRows = [...groups.values()].map((row, index) => ({ ...row, id: index + 1, qtyRecieved: round(row.qtyRecieved), qtyRefund: round(row.qtyRefund), taxAmt: round(row.taxAmt), netExcl: round(row.netExcl) })) }
    const start = (parsed.data.page - 1) * this.perPage
    return { rows: reportRows.slice(start, start + this.perPage), pagination: this.pagination(reportRows.length, parsed.data.page), options: { customers: options } }
  }
}
