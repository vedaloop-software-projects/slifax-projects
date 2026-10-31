import { Prisma, type PrismaClient } from '@prisma/client'
import { businessDateText, zonedParts, zonedTime, zoneOffsetText } from '../system/business-time.ts'
import type { StockMovementSource } from './stock-movement.ts'
import type { StockMovementFilters, BillSummaryFilters, BillWiseReportFilters, CustomerSalesReportFilters, DashboardData, KotReportFilters, PaymentCollectionFilters, ReportStore, SalesmanReportFilters, SalesReportFilters, StockReportFilters, TransferReportFilters } from './contracts.ts'

const safe = (value: bigint) => {
  const result = Number(value)
  if (!Number.isSafeInteger(result)) throw new Error('Database ID exceeds the JSON number range.')
  return result
}
const billKey = (number: number, date: Date) => `${number}:${businessDateText(date)}`

export class PrismaReportStore implements ReportStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  async dashboard(clientId: bigint, now: Date): Promise<DashboardData> {
    // Days follow the tenant's timezone; the container clock runs on UTC.
    const today = zonedParts(now), year = Number(today.year), month = Number(today.month), day = Number(today.day)
    const startToday = zonedTime(year, month, day), endToday = new Date(zonedTime(year, month, day + 1).getTime() - 1)
    const startYesterday = zonedTime(year, month, day - 1), endYesterday = new Date(startToday.getTime() - 1)
    const weekStart = zonedTime(year, month, day - 6), yearStart = zonedTime(year, 1, 1), historyStart = zonedTime(year - 3, 1, 1)
    const calendarToday = new Date(Date.UTC(year, month - 1, day))
    // DATETIME values are saved in the connection's DB_TIMEZONE; group them by the tenant's local day. The
    // conversion happens once in the CTE: with bound offsets repeated in GROUP BY, ONLY_FULL_GROUP_BY cannot
    // match the SELECT expression to it and rejects the query.
    const dbZone = process.env.DB_TIMEZONE ?? '+05:30', tenantZone = zoneOffsetText(now)
    type SeriesRow = { period_type: string; period_key: string; total: Prisma.Decimal | number }
    const seriesPromise = this.prisma.$queryRaw<SeriesRow[]>(Prisma.sql`
      WITH sales AS (
        SELECT bill_date, CONVERT_TZ(bill_date, ${dbZone}, ${tenantZone}) AS local_date, net_amount FROM bill_master WHERE client_id = ${clientId} AND bill_mode = 1 AND bill_date >= ${historyStart}
        UNION ALL
        SELECT bill_date, CONVERT_TZ(bill_date, ${dbZone}, ${tenantZone}), net_amount FROM prev_bill_master WHERE client_id = ${clientId} AND bill_mode = 1 AND bill_date >= ${historyStart}
      )
      SELECT 'weekly' AS period_type, DATE_FORMAT(local_date, '%Y-%m-%d') AS period_key, SUM(net_amount) AS total FROM sales WHERE bill_date >= ${weekStart} GROUP BY DATE_FORMAT(local_date, '%Y-%m-%d')
      UNION ALL
      SELECT 'monthly', DATE_FORMAT(local_date, '%Y-%m'), SUM(net_amount) FROM sales WHERE bill_date >= ${yearStart} GROUP BY DATE_FORMAT(local_date, '%Y-%m')
      UNION ALL
      SELECT 'yearly', DATE_FORMAT(local_date, '%Y'), SUM(net_amount) FROM sales GROUP BY DATE_FORMAT(local_date, '%Y')
    `)
    const salesWhere = { client_id: clientId, bill_date: { gte: startToday, lte: endToday }, bill_mode: 1 }
    const yesterdayWhere = { client_id: clientId, bill_date: { gte: startYesterday, lte: endYesterday }, bill_mode: 1 }
    const recentWhere = { client_id: clientId, bill_date: { gte: startToday, lte: endToday }, bill_mode: { not: 5 } }
    const [series, currentSales, archivedSales, currentYesterday, archivedYesterday, currentRecent, archivedRecent, currentPayments, archivedPayments, paymentModes, expenseRows] = await Promise.all([
      seriesPromise,
      this.prisma.billMaster.findMany({ where: salesWhere, select: { bill_num: true, bill_date: true, net_amount: true } }),
      this.prisma.prevBillMaster.findMany({ where: salesWhere, select: { bill_num: true, bill_date: true, net_amount: true } }),
      this.prisma.billMaster.findMany({ where: yesterdayWhere, select: { net_amount: true } }),
      this.prisma.prevBillMaster.findMany({ where: yesterdayWhere, select: { net_amount: true } }),
      this.prisma.billMaster.findMany({ where: recentWhere, orderBy: [{ bill_date: 'desc' }, { bill_num: 'desc' }], take: 10, select: { id: true, bill_num: true, bill_date: true, net_amount: true, bill_mode: true, customer_id: true } }),
      this.prisma.prevBillMaster.findMany({ where: recentWhere, orderBy: [{ bill_date: 'desc' }, { bill_num: 'desc' }], take: 10, select: { id: true, bill_num: true, bill_date: true, net_amount: true, bill_mode: true, customer_id: true } }),
      this.prisma.billPayments.findMany({ where: { client_id: clientId, bill_date: { gte: startToday, lte: endToday } }, select: { bill_num: true, bill_date: true, payment_mode_id: true, amount: true, tendered_change: true } }),
      this.prisma.prevBillPayments.findMany({ where: { client_id: clientId, bill_date: { gte: startToday, lte: endToday } }, select: { bill_num: true, bill_date: true, payment_mode_id: true, amount: true, tendered_change: true } }),
      this.prisma.paymentModes.findMany({ where: { client_id: clientId, status: 1, trash: 0 }, select: { id: true, payment_mode: true } }),
      this.prisma.expenses.findMany({ where: { client_id: clientId, transaction_date: calendarToday, status: 1, trash: 0 }, select: { expense_type: true, amount: true } }),
    ])
    const recent = [...currentRecent, ...archivedRecent].sort((a, b) => b.bill_date.getTime() - a.bill_date.getTime() || b.bill_num - a.bill_num).slice(0, 10)
    const recentBillNumbers = [...new Set(recent.map((bill) => bill.bill_num))], customerIds = [...new Set(recent.flatMap((bill) => bill.customer_id ? [bill.customer_id] : []))]
    const [currentLines, archivedLines, customers] = await Promise.all([
      recentBillNumbers.length ? this.prisma.billTran.findMany({ where: { client_id: clientId, bill_date: { gte: startToday, lte: endToday }, bill_num: { in: recentBillNumbers }, void_flag: 0 }, select: { bill_num: true, bill_date: true, qty: true } }) : [],
      recentBillNumbers.length ? this.prisma.prevBillTran.findMany({ where: { client_id: clientId, bill_date: { gte: startToday, lte: endToday }, bill_num: { in: recentBillNumbers }, void_flag: 0 }, select: { bill_num: true, bill_date: true, qty: true } }) : [],
      customerIds.length ? this.prisma.customers.findMany({ where: { client_id: clientId, id: { in: customerIds } }, select: { id: true, customer_name: true } }) : [],
    ])
    const key = (billNumber: number, billDate: Date) => `${billNumber}:${billDate.toISOString().slice(0, 10)}`
    const saleKeys = new Set([...currentSales, ...archivedSales].map((bill) => key(bill.bill_num, bill.bill_date)))
    const modeNames = new Map(paymentModes.map((mode) => [mode.id, mode.payment_mode])), paymentTotals = new Map<bigint, number>(), paymentsByBill = new Map<string, Set<string>>()
    for (const payment of [...currentPayments, ...archivedPayments]) {
      const amount = payment.tendered_change === 2 ? -Number(payment.amount) : Number(payment.amount)
      const billKey = key(payment.bill_num, payment.bill_date), modes = paymentsByBill.get(billKey) ?? new Set<string>(); modes.add(modeNames.get(payment.payment_mode_id) ?? 'Unknown'); paymentsByBill.set(billKey, modes)
      if (saleKeys.has(billKey)) paymentTotals.set(payment.payment_mode_id, (paymentTotals.get(payment.payment_mode_id) ?? 0) + amount)
    }
    const quantities = new Map<string, number>()
    for (const line of [...currentLines, ...archivedLines]) quantities.set(key(line.bill_num, line.bill_date), (quantities.get(key(line.bill_num, line.bill_date)) ?? 0) + Math.abs(Number(line.qty)))
    const customerNames = new Map(customers.map((customer) => [customer.id, customer.customer_name ?? 'Walk-in Customer']))
    const totalSales = [...currentSales, ...archivedSales].reduce((sum, bill) => sum + Number(bill.net_amount), 0), yesterdaySales = [...currentYesterday, ...archivedYesterday].reduce((sum, bill) => sum + Number(bill.net_amount), 0)
    const totalIncome = expenseRows.filter((row) => row.expense_type === 1).reduce((sum, row) => sum + Number(row.amount), 0), totalExpense = expenseRows.filter((row) => row.expense_type === 2).reduce((sum, row) => sum + Number(row.amount), 0)
    const seriesMap = new Map(series.map((row) => [`${row.period_type}:${row.period_key}`, Number(row.total)]))
    const weekDays = Array.from({ length: 7 }, (_, index) => new Date(Date.UTC(year, month - 1, day - 6 + index))), months = Array.from({ length: 12 }, (_, index) => index), years = Array.from({ length: 4 }, (_, index) => year - 3 + index)
    return {
      totalSales, yesterdaySales, salesPercentage: yesterdaySales ? Math.round((totalSales - yesterdaySales) * 10_000 / yesterdaySales) / 100 : 0, totalBills: currentSales.length + archivedSales.length,
      paymentSummary: [...paymentTotals].map(([paymentModeId, amount]) => ({ paymentModeId: safe(paymentModeId), paymentMode: modeNames.get(paymentModeId) ?? 'Unknown', amount })),
      income: { totalIncome }, expenses: { totalExpense }, collectionSummary: { sales: totalSales, income: totalIncome, expenses: totalExpense, netProfit: totalSales + totalIncome - totalExpense },
      salesComparison: {
        weekly: weekDays.map((day) => ({ label: day.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }), value: seriesMap.get(`weekly:${day.toISOString().slice(0, 10)}`) ?? 0 })),
        monthly: months.map((month) => ({ label: new Date(2000, month, 1).toLocaleDateString('en-US', { month: 'short' }), value: seriesMap.get(`monthly:${year}-${String(month + 1).padStart(2, '0')}`) ?? 0 })),
        yearly: years.map((year) => ({ label: String(year), value: seriesMap.get(`yearly:${year}`) ?? 0 })),
      },
      recentOrders: recent.map((bill) => ({ id: `${bill.bill_date.toISOString()}-${bill.bill_num}-${bill.id}`, bill: String(bill.bill_num), qty: quantities.get(key(bill.bill_num, bill.bill_date)) ?? 0, amount: Number(bill.net_amount), payment: [...(paymentsByBill.get(key(bill.bill_num, bill.bill_date)) ?? [])].join(', ') || 'Unpaid', name: bill.customer_id ? customerNames.get(bill.customer_id) ?? 'Customer' : 'Walk-in Customer', type: bill.bill_mode === 4 ? 'Refund' : 'Sale', date: bill.bill_date.toISOString() })),
    }
  }

  private async codeScope(clientId: bigint, itemCode?: string) {
    if (!itemCode) return { productWhere: {}, variantWhere: {}, productIds: [] as bigint[], variantIds: [] as bigint[] }
    const codes = [...new Set([itemCode, ...( /^\d{11}$/.test(itemCode) ? [`${itemCode.slice(0, 3)}-${itemCode.slice(3, 8)}-${itemCode.slice(8)}`] : []), ...( /^\d{8}$/.test(itemCode) ? [`${itemCode.slice(0, 3)}-${itemCode.slice(3)}`] : [])])]
    const exact = await this.prisma.products.findMany({ where: { client_id: clientId, product_code: { in: codes } }, select: { id: true } })
    const variants = await this.prisma.productVariants.findMany({ where: { client_id: clientId, OR: [{ variant_code: { in: codes } }, { ean_code: itemCode }] }, select: { id: true, product_id: true } })
    const productIds = exact.map(row => row.id), variantIds = variants.map(row => row.id)
    return { productIds, variantIds,
      productWhere: { OR: [{ product_code: { in: codes } }, { id: { in: variants.map(row => row.product_id) } }] },
      variantWhere: { OR: [{ product_id: { in: productIds } }, { variant_id: { in: variantIds } }] },
    }
  }

  async salesSource(clientId: bigint, filters: SalesReportFilters, limit: number) {
    return this.prisma.$transaction(transaction => new PrismaReportStore(transaction as unknown as PrismaClient).salesSourceSnapshot(clientId, filters, limit), { isolationLevel: 'RepeatableRead', timeout: 30000 })
  }

  private async salesSourceSnapshot(clientId: bigint, filters: SalesReportFilters, limit: number) {
    const scope = await this.codeScope(clientId, filters.itemCode)
    const productWhere = {
      client_id: clientId,
      ...(filters.categoryId ? { category_id: filters.categoryId } : {}),
      ...(filters.subCategoryId ? { sub_category_id: filters.subCategoryId } : {}),
      ...(filters.brandId ? { brand_id: filters.brandId } : {}),
      ...scope.productWhere,
      ...(filters.itemName ? { product_full_name: { contains: filters.itemName } } : {}),
    }
    const products = await this.prisma.products.findMany({ where: productWhere })
    if (!products.length) return { rows: [], truncated: false }
    const productIds = products.map((row) => row.id)
    const [transactions, activeBills, variants, categories, subCategories, brands] = await Promise.all([
      Promise.all([this.prisma.billTran.findMany({
        where: {
          client_id: clientId, bill_date: { gte: filters.from, lte: filters.to }, void_flag: 0,
          product_id: { in: productIds }, ...scope.variantWhere, ...(filters.variantId ? { variant_id: filters.variantId } : {}),
          ...(filters.billNumber ? { bill_num: filters.billNumber } : {}),
          ...(filters.gstPercentage === undefined ? {} : { gst_percentage: filters.gstPercentage }),
        }, orderBy: [{ bill_date: 'desc' }, { bill_num: 'desc' }, { line_num: 'asc' }], take: limit + 1,
      }), this.prisma.prevBillTran.findMany({
        where: {
          client_id: clientId, bill_date: { gte: filters.from, lte: filters.to }, void_flag: 0,
          product_id: { in: productIds }, ...scope.variantWhere, ...(filters.variantId ? { variant_id: filters.variantId } : {}),
          ...(filters.billNumber ? { bill_num: filters.billNumber } : {}),
          ...(filters.gstPercentage === undefined ? {} : { gst_percentage: filters.gstPercentage }),
        }, orderBy: [{ bill_date: 'desc' }, { bill_num: 'desc' }, { line_num: 'asc' }], take: limit + 1,
      })]).then(([current, archived]) => [...current, ...archived]),
      Promise.all([this.prisma.billMaster.findMany({
        where: { client_id: clientId, bill_date: { gte: filters.from, lte: filters.to }, bill_mode: { not: 5 } },
        select: { bill_num: true, bill_date: true, net_amount: true, sub_total_amount: true, other_charges: true, round_off_value: true, gst_amount: true, bill_mode: true, refund_against_bill_num: true, sm_id: true },
      }), this.prisma.prevBillMaster.findMany({
        where: { client_id: clientId, bill_date: { gte: filters.from, lte: filters.to }, bill_mode: { not: 5 } },
        select: { bill_num: true, bill_date: true, net_amount: true, sub_total_amount: true, other_charges: true, round_off_value: true, gst_amount: true, bill_mode: true, refund_against_bill_num: true, sm_id: true },
      })]).then(([current, archived]) => [...current, ...archived]),
      this.prisma.productVariants.findMany({ where: { client_id: clientId, product_id: { in: productIds } } }),
      this.prisma.categories.findMany({ where: { client_id: clientId } }),
      this.prisma.subCategories.findMany({ where: { client_id: clientId } }),
      this.prisma.brands.findMany({ where: { client_id: clientId } }),
    ])
    const billMap = new Map(activeBills.map(row => [billKey(row.bill_num, row.bill_date), row]))
    const active = new Set(activeBills.map((row) => billKey(row.bill_num, row.bill_date)))
    const productMap = new Map(products.map((row) => [row.id, row]))
    const variantMap = new Map(variants.map((row) => [row.id, row]))
    const categoryMap = new Map(categories.map((row) => [row.id, row.category_name]))
    const subCategoryMap = new Map(subCategories.map((row) => [row.id, row.sub_category_name]))
    const brandMap = new Map(brands.map((row) => [row.id, row.brand_name]))
    transactions.sort((a, b) => b.bill_date.getTime() - a.bill_date.getTime() || b.bill_num - a.bill_num || a.line_num - b.line_num)
    const truncated = transactions.length > limit
    return {
      truncated,
      rows: transactions.slice(0, limit).filter((row) => active.has(billKey(row.bill_num, row.bill_date))).map((row) => {
        const product = productMap.get(row.product_id)!
        const variant = row.variant_id ? variantMap.get(row.variant_id) : undefined
        const bill = billMap.get(billKey(row.bill_num, row.bill_date))
        const refund = row.bill_mode === 3 || !!bill?.refund_against_bill_num || Number(row.qty) < 0
        return {
          id: row.id, billNumber: row.bill_num, billDate: row.bill_date, productId: row.product_id,
          variantId: row.variant_id, qty: refund ? -Math.abs(Number(row.qty)) : Number(row.qty), salePrice: Number(row.price_override) > 0 ? Number(row.price_override) : Number(row.sale_price),
          discountAmount: refund ? -Math.abs(Number(row.manual_discount_value)) : Number(row.manual_discount_value), gstPercentage: Number(row.gst_percentage),
          // Infer the saved tax mode from bill totals, never today's mutable setting.
          exclusiveGst: (() => { const bill = billMap.get(billKey(row.bill_num, row.bill_date)); return !!bill && Math.abs(Number(bill.gst_amount)) > 0 && Math.abs(Math.abs(Number(bill.net_amount)) - Number(bill.other_charges) - Number(bill.round_off_value) - Math.abs(Number(bill.sub_total_amount))) > 0.02 })(),
          gstAmount: refund ? -Math.abs(Number(row.gst_amount)) : Number(row.gst_amount), billMode: row.bill_mode, productCode: product.product_code,
          productName: product.product_full_name, category: categoryMap.get(product.category_id ?? 0n) ?? '',
          subCategory: product.sub_category_id ? subCategoryMap.get(product.sub_category_id ?? 0n) ?? '' : '',
          brand: product.brand_id ? brandMap.get(product.brand_id ?? 0n) ?? '' : '',
          variantCode: variant?.variant_code ?? '', costPrice: Number(row.cost_price ?? 0), masterCostPrice: Number(variant?.cost_price ?? 0), salesmanId: row.sm_id || bill?.sm_id || null,
        }
      }),
    }
  }

  async reportVariants(clientId: bigint, itemCode: string) {
    const scope = await this.codeScope(clientId, itemCode)
    const products = await this.prisma.products.findMany({ where: { client_id: clientId, ...scope.productWhere }, select: { id: true, product_code: true, product_full_name: true } })
    if (!products.length) return []
    const productMap = new Map(products.map(row => [row.id, row]))
    const variants = await this.prisma.productVariants.findMany({ where: { client_id: clientId, product_id: { in: products.map(row => row.id) }, trash: 0 }, orderBy: { id: 'asc' } })
    const exactProducts = new Set(scope.productIds), exactVariants = new Set(scope.variantIds)
    return variants.filter(row => exactProducts.has(row.product_id) || exactVariants.has(row.id)).map(row => ({ label: row.pack_size, value: safe(row.id), code: row.variant_code,
      productId: safe(row.product_id), productCode: productMap.get(row.product_id)?.product_code ?? '', productName: productMap.get(row.product_id)?.product_full_name ?? '' }))
  }


  async salesOptions(clientId: bigint) {
    const [categories, subCategories, brands, taxes] = await Promise.all([
      this.prisma.categories.findMany({ where: { client_id: clientId, status: 1, trash: 0 }, orderBy: { category_name: 'asc' } }),
      this.prisma.subCategories.findMany({ where: { client_id: clientId, status: 1, trash: 0 }, orderBy: { sub_category_name: 'asc' } }),
      this.prisma.brands.findMany({ where: { client_id: clientId, status: 1, trash: 0 }, orderBy: { brand_name: 'asc' } }),
      this.prisma.taxes.findMany({ where: { client_id: clientId, status: 1, trash: 0 }, orderBy: { tax_percent: 'asc' } }),
    ])
    return {
      categories: categories.map((row) => ({ label: row.category_name, value: safe(row.id) })),
      subCategories: subCategories.map((row) => ({ label: row.sub_category_name, value: safe(row.id), categoryId: safe(row.category_id) })),
      brands: brands.map((row) => ({ label: row.brand_name, value: safe(row.id) })),
      variants: [],
      taxes: taxes.map((row) => ({ label: `${row.tax_name} ${row.tax_percent}%`, value: row.tax_percent })),
    }
  }

  async paymentSource(clientId: bigint, filters: PaymentCollectionFilters, limit: number) {
    const [payments, activeBills, modes] = await Promise.all([
      Promise.all([this.prisma.billPayments.findMany({
        where: {
          client_id: clientId, bill_date: { gte: filters.from, lte: filters.to },
          ...(filters.paymentModeId ? { payment_mode_id: filters.paymentModeId } : {}),
          ...(filters.userId ? { user_id: filters.userId } : {}),
        }, orderBy: [{ bill_date: 'desc' }, { id: 'desc' }], take: limit + 1,
      }), this.prisma.prevBillPayments.findMany({
        where: {
          client_id: clientId, bill_date: { gte: filters.from, lte: filters.to },
          ...(filters.paymentModeId ? { payment_mode_id: filters.paymentModeId } : {}),
          ...(filters.userId ? { user_id: filters.userId } : {}),
        }, orderBy: [{ bill_date: 'desc' }, { id: 'desc' }], take: limit + 1,
      })]).then(([current, archived]) => [...current, ...archived]),
      Promise.all([this.prisma.billMaster.findMany({ where: { client_id: clientId, bill_date: { gte: filters.from, lte: filters.to }, bill_mode: { not: 5 } }, select: { bill_num: true, bill_date: true } }), this.prisma.prevBillMaster.findMany({ where: { client_id: clientId, bill_date: { gte: filters.from, lte: filters.to }, bill_mode: { not: 5 } }, select: { bill_num: true, bill_date: true } })]).then(([current, archived]) => [...current, ...archived]),
      this.prisma.paymentModes.findMany({ where: { client_id: clientId } }),
    ])
    const active = new Set(activeBills.map((row) => billKey(row.bill_num, row.bill_date)))
    const names = new Map(modes.map((row) => [row.id, row.payment_mode]))
    const truncated = payments.length > limit
    return {
      truncated,
      rows: payments.slice(0, limit).filter((row) => active.has(billKey(row.bill_num, row.bill_date))).map((row) => ({
        id: row.id, billNumber: row.bill_num, billDate: row.bill_date, paymentModeId: row.payment_mode_id,
        paymentMode: names.get(row.payment_mode_id) ?? 'Unknown', userId: row.user_id,
        amount: Number(row.amount), tenderedChange: row.tendered_change,
      })),
    }
  }

  async paymentOptions(clientId: bigint) {
    const [modes, users] = await Promise.all([
      this.prisma.paymentModes.findMany({ where: { client_id: clientId, status: 1, trash: 0 }, orderBy: { payment_mode: 'asc' } }),
      this.prisma.clientUsers.findMany({ where: { client_id: clientId, status: 1, trash: 0 }, orderBy: { name: 'asc' } }),
    ])
    return {
      paymentModes: modes.map((row) => ({ label: row.payment_mode, value: safe(row.id) })),
      users: users.map((row) => ({ label: row.name || `User ${safe(row.id)}`, value: safe(row.id) })),
    }
  }

  async billWiseSource(clientId: bigint, filters: BillWiseReportFilters, limit: number) {
    const source = await this.salesSource(clientId, { ...filters, reportType: 'detailed', groupByTax: false }, limit)
    if (!source.rows.length) return { rows: [], truncated: source.truncated }
    const [payments, modes] = await Promise.all([
      Promise.all([this.prisma.billPayments.findMany({
        where: { client_id: clientId, bill_date: { gte: filters.from, lte: filters.to } },
        select: { bill_num: true, bill_date: true, payment_mode_id: true },
      }), this.prisma.prevBillPayments.findMany({
        where: { client_id: clientId, bill_date: { gte: filters.from, lte: filters.to } },
        select: { bill_num: true, bill_date: true, payment_mode_id: true },
      })]).then(([current, archived]) => [...current, ...archived]),
      this.prisma.paymentModes.findMany({ where: { client_id: clientId } }),
    ])
    const modeNames = new Map(modes.map((row) => [row.id, row.payment_mode]))
    const byBill = new Map<string, Set<string>>()
    for (const payment of payments) {
      const key = billKey(payment.bill_num, payment.bill_date)
      const names = byBill.get(key) ?? new Set<string>()
      names.add(modeNames.get(payment.payment_mode_id) ?? 'Unknown')
      byBill.set(key, names)
    }
    return {
      truncated: source.truncated,
      rows: source.rows.map((row) => ({ ...row, paymentMode: [...(byBill.get(billKey(row.billNumber, row.billDate)) ?? [])].join(', ') || 'Unpaid' })),
    }
  }

  async transferSource(clientId: bigint, direction: 'in' | 'out' | 'adjustment', filters: TransferReportFilters, limit: number) {
    const scope = await this.codeScope(clientId, filters.itemCode)
    const products = await this.prisma.products.findMany({ where: {
      client_id: clientId,
      ...(filters.categoryId ? { category_id: filters.categoryId } : {}),
      ...(filters.subCategoryId ? { sub_category_id: filters.subCategoryId } : {}),
      ...(filters.brandId ? { brand_id: filters.brandId } : {}),
      ...scope.productWhere,
      ...(filters.itemName ? { product_full_name: { contains: filters.itemName } } : {}),
    } })
    if (!products.length) return { rows: [], truncated: false }
    const productIds = products.map((row) => row.id)
    const masters = direction === 'adjustment'
      ? await this.prisma.stockAdjustmentsMast.findMany({ where: { client_id: clientId, status: 1, ...(filters.stockType ? { stock_type: filters.stockType === 'IN' ? 1 : 2 } : {}), stock_adjustment_date: { gte: filters.from, lte: filters.to } } })
      : direction === 'in'
      ? await this.prisma.transferInMast.findMany({ where: { client_id: clientId, status: 1, transfer_in_date: { gte: filters.from, lte: filters.to } } })
      : await this.prisma.transferOutMast.findMany({ where: { client_id: clientId, status: 1, transfer_out_date: { gte: filters.from, lte: filters.to } } })
    if (!masters.length) return { rows: [], truncated: false }
    const transferIds = masters.map((row) => row.id)
    const commonWhere = {
      client_id: clientId, product_id: { in: productIds }, ...scope.variantWhere,
      ...(filters.variantId ? { variant_id: filters.variantId } : {}),
    }
    const transactions = direction === 'adjustment'
      ? await this.prisma.stockAdjustmentsTran.findMany({ where: { ...commonWhere, stock_adjustment_id: { in: transferIds } }, orderBy: { id: 'desc' }, take: limit + 1 })
      : direction === 'in'
      ? await this.prisma.transferInTran.findMany({ where: { ...commonWhere, transfer_in_id: { in: transferIds } }, orderBy: { id: 'desc' }, take: limit + 1 })
      : await this.prisma.transferOutTran.findMany({ where: { ...commonWhere, transfer_out_id: { in: transferIds } }, orderBy: { id: 'desc' }, take: limit + 1 })
    const masterDates = new Map(masters.map((row) => direction === 'adjustment'
      ? [(row as { id: bigint }).id, (row as { stock_adjustment_date: Date }).stock_adjustment_date]
      : direction === 'in'
      ? [(row as { id: bigint; transfer_in_date: Date }).id, (row as { transfer_in_date: Date }).transfer_in_date]
      : [(row as { id: bigint; transfer_out_date: Date }).id, (row as { transfer_out_date: Date }).transfer_out_date]))
    const [variants, categories, subCategories, brands] = await Promise.all([
      this.prisma.productVariants.findMany({ where: { client_id: clientId, product_id: { in: productIds } } }),
      this.prisma.categories.findMany({ where: { client_id: clientId } }),
      this.prisma.subCategories.findMany({ where: { client_id: clientId } }),
      this.prisma.brands.findMany({ where: { client_id: clientId } }),
    ])
    const productMap = new Map(products.map((row) => [row.id, row]))
    const variantMap = new Map(variants.map((row) => [row.id, row]))
    const categoryMap = new Map(categories.map((row) => [row.id, row.category_name]))
    const subCategoryMap = new Map(subCategories.map((row) => [row.id, row.sub_category_name]))
    const brandMap = new Map(brands.map((row) => [row.id, row.brand_name]))
    transactions.sort((a, b) => { const masterA = 'stock_adjustment_id' in a ? a.stock_adjustment_id : 'transfer_in_id' in a ? a.transfer_in_id : a.transfer_out_id; const masterB = 'stock_adjustment_id' in b ? b.stock_adjustment_id : 'transfer_in_id' in b ? b.transfer_in_id : b.transfer_out_id; return (masterDates.get(masterB)?.getTime() ?? 0) - (masterDates.get(masterA)?.getTime() ?? 0) || Number(a.id - b.id) })
    const truncated = transactions.length > limit
    return { truncated, rows: transactions.slice(0, limit).flatMap((row) => {
      const masterId = direction === 'adjustment' ? (row as { stock_adjustment_id: bigint }).stock_adjustment_id : direction === 'in' ? (row as { transfer_in_id: bigint }).transfer_in_id : (row as { transfer_out_id: bigint }).transfer_out_id
      const transferDate = masterDates.get(masterId)
      const product = productMap.get(row.product_id)
      const variant = variantMap.get(row.variant_id)
      if (!transferDate || !product || !variant) return []
      const transferNumber = direction === 'adjustment' ? masterId : direction === 'in' ? (row as { transfer_in_number: bigint }).transfer_in_number : (row as { transfer_out_number: bigint }).transfer_out_number
      return [{
        id: row.id, transferNumber, transferDate,
        ...(direction === 'adjustment' ? { stockType: (masters.find(master => master.id === masterId) as { stock_type: number }).stock_type === 1 ? 'IN' : 'OUT', reason: (row as { reason: string }).reason } : {}), productId: row.product_id, variantId: row.variant_id,
        qty: Number(row.qty), freeQty: direction === 'in' ? Number((row as { free_qty: unknown }).free_qty) : 0,
        mrp: Number(row.mrp), costPrice: Number(row.cost_price), salePrice: Number(row.sale_price ?? variant.sale_price ?? 0), salePriceBasis: row.sale_price == null ? 'master' as const : 'transaction' as const, productCode: product.product_code,
        productName: product.product_full_name, eanCode: variant.ean_code ?? '', hsnCode: product.hsn_code,
        category: categoryMap.get(product.category_id ?? 0n) ?? '', subCategory: product.sub_category_id ? subCategoryMap.get(product.sub_category_id ?? 0n) ?? '' : '',
        brand: product.brand_id ? brandMap.get(product.brand_id ?? 0n) ?? '' : '', variantCode: variant.variant_code,
      }]
    }) }
  }

  async billSummarySource(clientId: bigint, filters: BillSummaryFilters, limit: number) {
    const [bills, payments, modes, salesmen] = await Promise.all([
      Promise.all([this.prisma.billMaster.findMany({ where: { client_id: clientId, bill_date: { gte: filters.from, lte: filters.to }, bill_mode: { not: 5 }, ...(filters.userId ? { user_id: filters.userId } : {}) }, orderBy: [{ bill_date: 'desc' }, { bill_num: 'desc' }], take: limit + 1 }), this.prisma.prevBillMaster.findMany({ where: { client_id: clientId, bill_date: { gte: filters.from, lte: filters.to }, bill_mode: { not: 5 }, ...(filters.userId ? { user_id: filters.userId } : {}) }, orderBy: [{ bill_date: 'desc' }, { bill_num: 'desc' }], take: limit + 1 })]).then(([current, archived]) => [...current, ...archived]),
      Promise.all([this.prisma.billPayments.findMany({ where: { client_id: clientId, bill_date: { gte: filters.from, lte: filters.to }, ...(filters.userId ? { user_id: filters.userId } : {}), ...(filters.paymentModeId ? { payment_mode_id: filters.paymentModeId } : {}) } }), this.prisma.prevBillPayments.findMany({ where: { client_id: clientId, bill_date: { gte: filters.from, lte: filters.to }, ...(filters.userId ? { user_id: filters.userId } : {}), ...(filters.paymentModeId ? { payment_mode_id: filters.paymentModeId } : {}) } })]).then(([current, archived]) => [...current, ...archived]),
      this.prisma.paymentModes.findMany({ where: { client_id: clientId } }),
      this.prisma.salesMans.findMany({ where: { client_id: clientId } }),
    ])
    const names = new Map(modes.map((row) => [row.id, row.payment_mode]))
    const allowedBills = filters.paymentModeId ? new Set(payments.map((row) => billKey(row.bill_num, row.bill_date))) : null
    return {
      truncated: bills.length > limit,
      bills: bills.slice(0, limit).filter((row) => !allowedBills || allowedBills.has(billKey(row.bill_num, row.bill_date))).map((row) => ({ billNumber: row.bill_num, billDate: row.bill_date, userId: row.user_id, salesmanId: row.sm_id, amount: Number(row.net_amount) })),
      payments: payments.map((row) => ({ id: row.id, billNumber: row.bill_num, billDate: row.bill_date, paymentModeId: row.payment_mode_id, paymentMode: names.get(row.payment_mode_id) ?? 'Unknown', userId: row.user_id, amount: Number(row.amount), tenderedChange: row.tendered_change })),
      salesmanCodes: new Map(salesmen.map((row) => [row.id, row.sm_code])),
    }
  }

  // Every stock-changing document from `from` until now: later movements are needed to work the
  // closing balance back from the current quantity. Cancelled bills are skipped (cancelling
  // returns the stock), as are void lines and refunded free items, which never return stock.
  async stockMovementSource(clientId: bigint, filters: StockMovementFilters, limit: number): Promise<StockMovementSource> {
    const scope = await this.codeScope(clientId, filters.itemCode)
    const products = await this.prisma.products.findMany({ where: {
      client_id: clientId, trash: 0,
      ...(filters.categoryId ? { category_id: filters.categoryId } : {}),
      ...(filters.subCategoryId ? { sub_category_id: filters.subCategoryId } : {}),
      ...(filters.brandId ? { brand_id: filters.brandId } : {}),
      ...scope.productWhere,
      ...(filters.itemName ? { product_full_name: { contains: filters.itemName } } : {}),
    } })
    if (!products.length) return { variants: [], movements: [], truncated: false }
    const productIds = products.map(row => row.id)
    const lineWhere = { client_id: clientId, product_id: { in: productIds }, ...scope.variantWhere, ...(filters.variantId ? { variant_id: filters.variantId } : {}) }
    const [variants, categories, subCategories, brands, inMasters, outMasters, adjustMasters, saleMasters, prevSaleMasters, kotMasters] = await Promise.all([
      this.prisma.productVariants.findMany({ where: { ...lineWhere, trash: 0 } }),
      this.prisma.categories.findMany({ where: { client_id: clientId } }),
      this.prisma.subCategories.findMany({ where: { client_id: clientId } }),
      this.prisma.brands.findMany({ where: { client_id: clientId } }),
      this.prisma.transferInMast.findMany({ where: { client_id: clientId, status: 1, transfer_in_date: { gte: filters.fromDay } }, select: { id: true, transfer_in_date: true } }),
      this.prisma.transferOutMast.findMany({ where: { client_id: clientId, status: 1, transfer_out_date: { gte: filters.fromDay } }, select: { id: true, transfer_out_date: true } }),
      this.prisma.stockAdjustmentsMast.findMany({ where: { client_id: clientId, status: 1, stock_adjustment_date: { gte: filters.fromDay } }, select: { id: true, stock_adjustment_date: true, stock_type: true } }),
      this.prisma.billMaster.findMany({ where: { client_id: clientId, bill_date: { gte: filters.from }, bill_mode: { in: [1, 4] } }, select: { bill_num: true, bill_date: true, bill_mode: true } }),
      this.prisma.prevBillMaster.findMany({ where: { client_id: clientId, bill_date: { gte: filters.from }, bill_mode: { in: [1, 4] } }, select: { bill_num: true, bill_date: true, bill_mode: true } }),
      this.prisma.kotBillMast.findMany({ where: { client_id: clientId, bill_date: { gte: filters.from }, bill_mode: { not: 5 } }, select: { bill_no: true } }),
    ])
    const take = limit + 1
    const [inLines, outLines, adjustLines, saleLines, prevSaleLines, kotLines] = await Promise.all([
      inMasters.length ? this.prisma.transferInTran.findMany({ where: { ...lineWhere, transfer_in_id: { in: inMasters.map(row => row.id) } }, select: { transfer_in_id: true, variant_id: true, qty: true, free_qty: true }, take }) : [],
      outMasters.length ? this.prisma.transferOutTran.findMany({ where: { ...lineWhere, transfer_out_id: { in: outMasters.map(row => row.id) } }, select: { transfer_out_id: true, variant_id: true, qty: true }, take }) : [],
      adjustMasters.length ? this.prisma.stockAdjustmentsTran.findMany({ where: { ...lineWhere, stock_adjustment_id: { in: adjustMasters.map(row => row.id) } }, select: { stock_adjustment_id: true, variant_id: true, qty: true }, take }) : [],
      this.prisma.billTran.findMany({ where: { ...lineWhere, bill_date: { gte: filters.from }, void_flag: 0 }, select: { bill_num: true, bill_date: true, variant_id: true, qty: true, bill_mode: true, mrp: true, sale_price: true }, take }),
      this.prisma.prevBillTran.findMany({ where: { ...lineWhere, bill_date: { gte: filters.from }, void_flag: 0 }, select: { bill_num: true, bill_date: true, variant_id: true, qty: true, bill_mode: true, mrp: true, sale_price: true }, take }),
      kotMasters.length ? this.prisma.kotBillTran.findMany({ where: { ...lineWhere, bill_no: { in: kotMasters.map(row => row.bill_no) }, bill_date: { gte: filters.from } }, select: { bill_date: true, variant_id: true, qty: true }, take }) : [],
    ])
    const lineCount = inLines.length + outLines.length + adjustLines.length + saleLines.length + prevSaleLines.length + kotLines.length
    if (lineCount > limit) return { variants: [], movements: [], truncated: true }
    const calendar = (value: Date) => value.toISOString().slice(0, 10)
    const businessDay = (value: Date) => { const { year, month, day } = zonedParts(value); return `${year}-${month}-${day}` }
    const inDates = new Map(inMasters.map(row => [row.id, calendar(row.transfer_in_date)]))
    const outDates = new Map(outMasters.map(row => [row.id, calendar(row.transfer_out_date)]))
    const adjustments = new Map(adjustMasters.map(row => [row.id, { day: calendar(row.stock_adjustment_date), sign: row.stock_type === 1 ? 1 : -1 }]))
    const billModes = new Map([...saleMasters, ...prevSaleMasters].map(row => [billKey(row.bill_num, row.bill_date), row.bill_mode]))
    const movements: StockMovementSource['movements'] = []
    for (const line of inLines) {
      const day = inDates.get(line.transfer_in_id); if (!day) continue
      movements.push({ variantId: line.variant_id, day, kind: 'stockIn', qty: Number(line.qty) }, { variantId: line.variant_id, day, kind: 'freeIn', qty: Number(line.free_qty) })
    }
    for (const line of outLines) { const day = outDates.get(line.transfer_out_id); if (day) movements.push({ variantId: line.variant_id, day, kind: 'stockOut', qty: Number(line.qty) }) }
    for (const line of adjustLines) { const master = adjustments.get(line.stock_adjustment_id); if (master) movements.push({ variantId: line.variant_id, day: master.day, kind: 'adjust', qty: master.sign * Number(line.qty) }) }
    for (const line of [...saleLines, ...prevSaleLines]) {
      const mode = billModes.get(billKey(line.bill_num, line.bill_date))
      if (!mode || !line.variant_id) continue
      const day = businessDay(line.bill_date), qty = Number(line.qty)
      if (mode === 4) { if (Number(line.mrp) > 0 || Number(line.sale_price) > 0) movements.push({ variantId: line.variant_id, day, kind: 'refund', qty: -qty }) }
      else movements.push({ variantId: line.variant_id, day, kind: line.bill_mode === 4 ? 'freeSales' : 'sales', qty })
    }
    for (const line of kotLines) movements.push({ variantId: line.variant_id, day: businessDay(line.bill_date), kind: 'sales', qty: Number(line.qty) })
    const productMap = new Map(products.map(row => [row.id, row]))
    const names = (rows: Array<{ id: bigint }>, field: string) => new Map(rows.map(row => [row.id, String((row as Record<string, unknown>)[field] ?? '')]))
    const categoryMap = names(categories, 'category_name'), subCategoryMap = names(subCategories, 'sub_category_name'), brandMap = names(brands, 'brand_name')
    return { truncated: false, movements, variants: variants.flatMap(variant => {
      const product = productMap.get(variant.product_id)
      return product ? [{
        productId: product.id, variantId: variant.id, productCode: product.product_code, variantCode: variant.variant_code ?? '', productName: product.product_full_name,
        category: categoryMap.get(product.category_id ?? 0n) ?? '', subCategory: subCategoryMap.get(product.sub_category_id ?? 0n) ?? '', brand: brandMap.get(product.brand_id ?? 0n) ?? '',
        currentQty: Number(variant.variant_qty),
      }] : []
    }) }
  }

  async stockSource(clientId: bigint, filters: StockReportFilters, limit: number) {
    return this.prisma.$transaction(transaction => new PrismaReportStore(transaction as unknown as PrismaClient).stockSourceSnapshot(clientId, filters, limit), { isolationLevel: 'RepeatableRead', timeout: 30000 })
  }

  private async stockSourceSnapshot(clientId: bigint, filters: StockReportFilters, limit: number) {
    const scope = await this.codeScope(clientId, filters.itemCode)
    const products = await this.prisma.products.findMany({ where: { client_id: clientId, trash: 0,
      ...(filters.categoryId ? { category_id: filters.categoryId } : {}), ...(filters.subCategoryId ? { sub_category_id: filters.subCategoryId } : {}),
      ...(filters.brandId ? { brand_id: filters.brandId } : {}), ...scope.productWhere, ...(filters.itemName ? { product_full_name: { contains: filters.itemName } } : {}) } })
    if (!products.length) return { rows: [], truncated: false }
    const ids = products.map(row => row.id)
    const [variants, categories, subCategories, brands, taxes, unitTypes] = await Promise.all([
      this.prisma.productVariants.findMany({ where: { client_id: clientId, product_id: { in: ids }, trash: 0,
        ...(filters.variantId ? { id: filters.variantId } : {}),
        ...(filters.itemCode ? { OR: [{ product_id: { in: scope.productIds } }, { id: { in: scope.variantIds } }] } : {}) }, orderBy: { id: 'asc' }, take: limit + 1 }),
      this.prisma.categories.findMany({ where: { client_id: clientId } }), this.prisma.subCategories.findMany({ where: { client_id: clientId } }),
      this.prisma.brands.findMany({ where: { client_id: clientId } }), this.prisma.taxes.findMany({ where: { client_id: clientId } }),
      this.prisma.unitTypes.findMany({ where: { client_id: clientId } }),
    ])
    // Reverse movements AFTER the selected day's close from the current balance.
    // Do not rely on legacy stock.closeing_balance: old writers overwrote other
    // movement types, and billing did not always create a daily stock record.
    type Delta = { variant_id: bigint; qty: Prisma.Decimal | number }
    const nextDay = new Date((filters.asOnDate ?? filters.to).getTime() + 1)
    const dateOnly = new Date(filters.to.toISOString().slice(0, 10))
    const deltas = filters.asOnDate && variants.length ? await this.prisma.$queryRaw<Delta[]>(Prisma.sql`
      SELECT variant_id, SUM(qty) qty FROM (
        SELECT t.variant_id, -SUM(CASE WHEN t.bill_mode = 3 OR COALESCE(m.refund_against_bill_num, '') <> '' OR t.qty < 0 THEN -ABS(t.qty) ELSE t.qty END) qty
          FROM bill_tran t JOIN bill_master m ON m.client_id=t.client_id AND m.bill_num=t.bill_num AND m.bill_date=t.bill_date
          WHERE t.client_id=${clientId} AND t.bill_date >= ${nextDay} AND t.void_flag=0 AND m.bill_mode<>5 GROUP BY t.variant_id
        UNION ALL
        SELECT t.variant_id, -SUM(CASE WHEN t.bill_mode = 3 OR COALESCE(m.refund_against_bill_num, '') <> '' OR t.qty < 0 THEN -ABS(t.qty) ELSE t.qty END)
          FROM prev_bill_tran t JOIN prev_bill_master m ON m.client_id=t.client_id AND m.bill_num=t.bill_num AND m.bill_date=t.bill_date
          WHERE t.client_id=${clientId} AND t.bill_date >= ${nextDay} AND t.void_flag=0 AND m.bill_mode<>5 GROUP BY t.variant_id
        UNION ALL
        SELECT t.variant_id, SUM(t.qty+t.free_qty) FROM transfer_in_tran t JOIN transfer_in_mast m ON m.id=t.transfer_in_id AND m.client_id=t.client_id
          WHERE t.client_id=${clientId} AND m.status=1 AND m.transfer_in_date>${dateOnly} GROUP BY t.variant_id
        UNION ALL
        SELECT t.variant_id, -SUM(t.qty) FROM transfer_out_tran t JOIN transfer_out_mast m ON m.id=t.transfer_out_id AND m.client_id=t.client_id
          WHERE t.client_id=${clientId} AND m.status=1 AND m.transfer_out_date>${dateOnly} GROUP BY t.variant_id
        UNION ALL
        SELECT t.variant_id, SUM(CASE WHEN m.stock_type=1 THEN t.qty ELSE -t.qty END) FROM stock_adjustments_tran t JOIN stock_adjustments_mast m ON m.id=t.stock_adjustment_id AND m.client_id=t.client_id
          WHERE t.client_id=${clientId} AND m.status=1 AND m.stock_adjustment_date>${dateOnly} GROUP BY t.variant_id
        UNION ALL
        SELECT variant_id, SUM(purchase+free_qty-purchase_return) FROM stock WHERE client_id=${clientId} AND stock_date>${dateOnly} GROUP BY variant_id
      ) movements WHERE variant_id IN (${Prisma.join(variants.map(v => v.id))}) GROUP BY variant_id
    `) : []
    // Stock date = the last day stock came in (purchase, transfer in or stock
    // adjustment IN) on or before the report date; stock days count from it.
    type Inward = { variant_id: bigint; stock_date: Date | null }
    const inwards = filters.asOnDate && variants.length ? await this.prisma.$queryRaw<Inward[]>(Prisma.sql`
      SELECT variant_id, MAX(inward_date) stock_date FROM (
        SELECT t.variant_id, m.transfer_in_date inward_date FROM transfer_in_tran t JOIN transfer_in_mast m ON m.id=t.transfer_in_id AND m.client_id=t.client_id
          WHERE t.client_id=${clientId} AND m.status=1 AND m.transfer_in_date<=${dateOnly}
        UNION ALL
        SELECT t.variant_id, m.stock_adjustment_date FROM stock_adjustments_tran t JOIN stock_adjustments_mast m ON m.id=t.stock_adjustment_id AND m.client_id=t.client_id
          WHERE t.client_id=${clientId} AND m.status=1 AND m.stock_type=1 AND m.stock_adjustment_date<=${dateOnly}
        UNION ALL
        SELECT variant_id, stock_date FROM stock WHERE client_id=${clientId} AND purchase+free_qty>0 AND stock_date<=${dateOnly}
      ) inward WHERE variant_id IN (${Prisma.join(variants.map(v => v.id))}) GROUP BY variant_id
    `) : []
    const dm = new Map(deltas.map(row => [row.variant_id, Number(row.qty)]))
    const im = new Map(inwards.flatMap(row => row.stock_date ? [[row.variant_id, new Date(row.stock_date)] as const] : []))
    const um = new Map(unitTypes.map(r => [r.id, r.unit_type_code || r.unit_type_name]))
    const pm = new Map(products.map(r => [r.id, r])), cm = new Map(categories.map(r => [r.id, r.category_name])), sm = new Map(subCategories.map(r => [r.id, r.sub_category_name])), bm = new Map(brands.map(r => [r.id, r.brand_name])), tm = new Map(taxes.map(r => [r.id, r.tax_percent]))
    const rows = variants.slice(0, limit).flatMap(variant => {
      const product = pm.get(variant.product_id), rate = product ? tm.get(product.tax_id) ?? 0 : 0
      if (!product || (filters.gstPercentage !== undefined && rate !== filters.gstPercentage)) return []
      if (variant.created_at && variant.created_at >= nextDay) return []
      return [{ id: variant.id, stockDate: filters.to, productId: product.id, variantId: variant.id,
        productCode: product.product_code, productName: product.product_full_name, packSize: variant.pack_size,
        category: cm.get(product.category_id) ?? '', subCategory: product.sub_category_id ? sm.get(product.sub_category_id) ?? '' : '', brand: product.brand_id ? bm.get(product.brand_id) ?? '' : '',
        variantCode: variant.variant_code, eanCode: variant.ean_code ?? '', hsnCode: product.hsn_code, gstPercentage: rate,
        uom: product.unit_type_id ? um.get(product.unit_type_id) ?? '' : '',
        costPrice: Number(variant.cost_price ?? 0), mrp: Number(variant.mrp ?? 0), salePrice: Number(variant.sale_price ?? 0),
        lastInwardDate: im.get(variant.id) ?? variant.created_at ?? null,
        availableQty: Number(variant.variant_qty) - (dm.get(variant.id) ?? 0), sales: 0, purchaseReturn: 0, gstAmount: 0, salesValue: 0, discount: 0 }]
    })
    return { truncated: variants.length > limit, rows }
  }

  async kotSource(clientId: bigint, filters: KotReportFilters, limit: number) {
    const masters = await this.prisma.kotMast.findMany({ where: { client_id: clientId, kot_date: { gte: filters.from, lte: filters.to }, ...(filters.userId ? { OR: [{ created_by: filters.userId }, { waiter_id: filters.userId }] } : {}) }, orderBy: [{ kot_date: 'desc' }, { id: 'desc' }], take: limit + 1 })
    const ids = masters.slice(0, limit).map((r) => r.id)
    const [items, products, users] = await Promise.all([this.prisma.kotTran.findMany({ where: { client_id: clientId, kot_id: { in: ids } } }), this.prisma.products.findMany({ where: { client_id: clientId } }), this.prisma.clientUsers.findMany({ where: { client_id: clientId } })])
    const pn = new Map(products.map((r) => [r.id, r.product_full_name])), un = new Map(users.map((r) => [r.id, r.name || `User ${safe(r.id)}`])), grouped = new Map<bigint, Array<{ name: string; qty: number }>>()
    for (const row of items) { const list = grouped.get(row.kot_id) ?? []; list.push({ name: pn.get(row.product_id) ?? 'Unknown item', qty: Number(row.qty) }); grouped.set(row.kot_id, list) }
    return { truncated: masters.length > limit, rows: masters.slice(0, limit).flatMap((row) => row.kot_date ? [{ id: row.id, kotNo: row.kot_no, kotDate: row.kot_date, userId: row.created_by ?? row.waiter_id, userName: un.get(row.created_by ?? row.waiter_id ?? 0n) ?? 'Unknown', status: row.kot_status, items: grouped.get(row.id) ?? [] }] : []) }
  }

  async salesmanSource(clientId: bigint, filters: SalesmanReportFilters, limit: number) {
    const salesmen = await this.prisma.salesMans.findMany({ where: { client_id: clientId, ...(filters.salesmanId ? { id: filters.salesmanId } : {}) } })
    if (!salesmen.length) return { rows: [], truncated: false }
    const people = new Map(salesmen.map(person => [person.id, person]))
    const source = await this.salesSource(clientId, { ...filters, reportType: 'detailed', groupByTax: false }, limit)
    return { truncated: source.truncated, rows: source.rows.flatMap(row => {
      const person = row.salesmanId ? people.get(row.salesmanId) : undefined
      if (!person) return []
      return [{ id: row.id, billDate: row.billDate, salesmanId: person.id, salesmanCode: person.sm_code, salesmanName: person.sm_name,
        commission: Number(person.commission_percent ?? 0), productId: row.productId, variantId: row.variantId, productCode: row.productCode, variantCode: row.variantCode,
        productName: row.productName, qty: row.qty, unitPrice: row.salePrice, discountAmount: row.discountAmount,
        discount: row.qty * row.salePrice ? row.discountAmount * 100 / (row.qty * row.salePrice) : 0 }]
    }) }
  }

  async salesmanOptions(clientId: bigint) { return (await this.prisma.salesMans.findMany({ where: { client_id: clientId, status: 1, trash: 0 }, orderBy: { sm_name: 'asc' } })).map((row) => ({ label: `${row.sm_code} · ${row.sm_name}`, value: safe(row.id) })) }

  async customerSalesSource(clientId: bigint, filters: CustomerSalesReportFilters, limit: number) {
    const masters = await Promise.all([this.prisma.billMaster.findMany({ where: { client_id: clientId, bill_date: { gte: filters.from, lte: filters.to }, bill_mode: { not: 5 }, customer_id: filters.customerId ?? { not: null } }, select: { bill_num: true, bill_date: true, customer_id: true } }), this.prisma.prevBillMaster.findMany({ where: { client_id: clientId, bill_date: { gte: filters.from, lte: filters.to }, bill_mode: { not: 5 }, customer_id: filters.customerId ?? { not: null } }, select: { bill_num: true, bill_date: true, customer_id: true } })]).then(([current, archived]) => [...current, ...archived])
    if (!masters.length) return { rows: [], truncated: false }
    const keys = new Map(masters.map((r) => [billKey(r.bill_num, r.bill_date), r.customer_id!]))
    const source = await this.salesSource(clientId, { from: filters.from, to: filters.to, page: filters.page, perPage: filters.perPage, reportType: 'detailed', groupByTax: false, ...(filters.itemCode ? { itemCode: filters.itemCode } : {}), ...(filters.itemName ? { itemName: filters.itemName } : {}), ...(filters.variantId ? { variantId: filters.variantId } : {}) }, limit)
    const customers = await this.prisma.customers.findMany({ where: { client_id: clientId } }), names = new Map(customers.map((r) => [r.id, r.customer_name ?? `Customer ${safe(r.id)}`]))
    return { truncated: source.truncated, rows: source.rows.flatMap((row) => { const customerId = keys.get(billKey(row.billNumber, row.billDate)); return customerId ? [{ ...row, customerId, customerName: names.get(customerId) ?? 'Unknown customer' }] : [] }) }
  }

  async customerOptions(clientId: bigint) { return (await this.prisma.customers.findMany({ where: { client_id: clientId, status: 1, trash: 0 }, orderBy: { customer_name: 'asc' } })).map((row) => ({ label: row.customer_name ?? `Customer ${safe(row.id)}`, value: safe(row.id) })) }
}
