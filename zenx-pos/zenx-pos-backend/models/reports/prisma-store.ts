import type { PrismaClient } from '@prisma/client'
import type { BillSummaryFilters, BillWiseReportFilters, CustomerSalesReportFilters, KotReportFilters, PaymentCollectionFilters, ReportStore, SalesmanReportFilters, SalesReportFilters, StockReportFilters, TransferReportFilters } from './contracts.ts'

const safe = (value: bigint) => {
  const result = Number(value)
  if (!Number.isSafeInteger(result)) throw new Error('Database ID exceeds the JSON number range.')
  return result
}
const billKey = (number: number, date: Date) => `${number}:${date.toISOString().slice(0, 10)}`

export class PrismaReportStore implements ReportStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  async salesSource(clientId: bigint, filters: SalesReportFilters, limit: number) {
    const productWhere = {
      client_id: clientId,
      ...(filters.categoryId ? { category_id: filters.categoryId } : {}),
      ...(filters.subCategoryId ? { sub_category_id: filters.subCategoryId } : {}),
      ...(filters.brandId ? { brand_id: filters.brandId } : {}),
      ...(filters.itemCode ? { product_code: { contains: filters.itemCode } } : {}),
      ...(filters.itemName ? { product_full_name: { contains: filters.itemName } } : {}),
    }
    const products = await this.prisma.products.findMany({ where: productWhere })
    if (!products.length) return { rows: [], truncated: false }
    const productIds = products.map((row) => row.id)
    const [transactions, activeBills, variants, categories, subCategories, brands] = await Promise.all([
      this.prisma.billTran.findMany({
        where: {
          client_id: clientId, bill_date: { gte: filters.from, lte: filters.to }, void_flag: 0,
          product_id: { in: productIds }, ...(filters.variantId ? { variant_id: filters.variantId } : {}),
          ...(filters.billNumber ? { bill_num: filters.billNumber } : {}),
          ...(filters.gstPercentage === undefined ? {} : { gst_percentage: filters.gstPercentage }),
        }, orderBy: [{ bill_date: 'desc' }, { bill_num: 'desc' }, { line_num: 'asc' }], take: limit + 1,
      }),
      this.prisma.billMaster.findMany({
        where: { client_id: clientId, bill_date: { gte: filters.from, lte: filters.to }, bill_mode: { not: 5 } },
        select: { bill_num: true, bill_date: true },
      }),
      this.prisma.productVariants.findMany({ where: { client_id: clientId, product_id: { in: productIds } } }),
      this.prisma.categories.findMany({ where: { client_id: clientId } }),
      this.prisma.subCategories.findMany({ where: { client_id: clientId } }),
      this.prisma.brands.findMany({ where: { client_id: clientId } }),
    ])
    const active = new Set(activeBills.map((row) => billKey(row.bill_num, row.bill_date)))
    const productMap = new Map(products.map((row) => [row.id, row]))
    const variantMap = new Map(variants.map((row) => [row.id, row]))
    const categoryMap = new Map(categories.map((row) => [row.id, row.category_name]))
    const subCategoryMap = new Map(subCategories.map((row) => [row.id, row.sub_category_name]))
    const brandMap = new Map(brands.map((row) => [row.id, row.brand_name]))
    const truncated = transactions.length > limit
    return {
      truncated,
      rows: transactions.slice(0, limit).filter((row) => active.has(billKey(row.bill_num, row.bill_date))).map((row) => {
        const product = productMap.get(row.product_id)!
        const variant = row.variant_id ? variantMap.get(row.variant_id) : undefined
        return {
          id: row.id, billNumber: row.bill_num, billDate: row.bill_date, productId: row.product_id,
          variantId: row.variant_id, qty: Number(row.qty), salePrice: Number(row.sale_price),
          discountAmount: Number(row.manual_discount_value), gstPercentage: Number(row.gst_percentage),
          gstAmount: Number(row.gst_amount), billMode: row.bill_mode, productCode: product.product_code,
          productName: product.product_full_name, category: categoryMap.get(product.category_id) ?? '',
          subCategory: product.sub_category_id ? subCategoryMap.get(product.sub_category_id) ?? '' : '',
          brand: product.brand_id ? brandMap.get(product.brand_id) ?? '' : '',
          variantCode: variant ? String(safe(variant.id)) : '',
        }
      }),
    }
  }

  async salesOptions(clientId: bigint) {
    const [categories, subCategories, brands, variants, taxes] = await Promise.all([
      this.prisma.categories.findMany({ where: { client_id: clientId, status: 1, trash: 0 }, orderBy: { category_name: 'asc' } }),
      this.prisma.subCategories.findMany({ where: { client_id: clientId, status: 1, trash: 0 }, orderBy: { sub_category_name: 'asc' } }),
      this.prisma.brands.findMany({ where: { client_id: clientId, status: 1, trash: 0 }, orderBy: { brand_name: 'asc' } }),
      this.prisma.productVariants.findMany({ where: { client_id: clientId, status: 1, trash: 0 }, orderBy: { id: 'asc' }, take: 1000 }),
      this.prisma.taxes.findMany({ where: { client_id: clientId, status: 1, trash: 0 }, orderBy: { tax_percent: 'asc' } }),
    ])
    return {
      categories: categories.map((row) => ({ label: row.category_name, value: safe(row.id) })),
      subCategories: subCategories.map((row) => ({ label: row.sub_category_name, value: safe(row.id), categoryId: safe(row.category_id) })),
      brands: brands.map((row) => ({ label: row.brand_name, value: safe(row.id) })),
      variants: variants.map((row) => ({ label: row.pack_size, value: safe(row.id), code: String(safe(row.id)), productId: safe(row.product_id) })),
      taxes: taxes.map((row) => ({ label: `${row.tax_name} ${row.tax_percent}%`, value: row.tax_percent })),
    }
  }

  async paymentSource(clientId: bigint, filters: PaymentCollectionFilters, limit: number) {
    const [payments, activeBills, modes] = await Promise.all([
      this.prisma.billPayments.findMany({
        where: {
          client_id: clientId, bill_date: { gte: filters.from, lte: filters.to },
          ...(filters.paymentModeId ? { payment_mode_id: filters.paymentModeId } : {}),
          ...(filters.userId ? { user_id: filters.userId } : {}),
        }, orderBy: [{ bill_date: 'desc' }, { id: 'desc' }], take: limit + 1,
      }),
      this.prisma.billMaster.findMany({ where: { client_id: clientId, bill_date: { gte: filters.from, lte: filters.to }, bill_mode: { not: 5 } }, select: { bill_num: true, bill_date: true } }),
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
      this.prisma.billPayments.findMany({
        where: { client_id: clientId, bill_date: { gte: filters.from, lte: filters.to } },
        select: { bill_num: true, bill_date: true, payment_mode_id: true },
      }),
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

  async transferSource(clientId: bigint, direction: 'in' | 'out', filters: TransferReportFilters, limit: number) {
    const products = await this.prisma.products.findMany({ where: {
      client_id: clientId,
      ...(filters.categoryId ? { category_id: filters.categoryId } : {}),
      ...(filters.subCategoryId ? { sub_category_id: filters.subCategoryId } : {}),
      ...(filters.brandId ? { brand_id: filters.brandId } : {}),
      ...(filters.itemCode ? { product_code: { contains: filters.itemCode } } : {}),
      ...(filters.itemName ? { product_full_name: { contains: filters.itemName } } : {}),
    } })
    if (!products.length) return { rows: [], truncated: false }
    const productIds = products.map((row) => row.id)
    const masters = direction === 'in'
      ? await this.prisma.transferInMast.findMany({ where: { client_id: clientId, transfer_in_date: { gte: filters.from, lte: filters.to } } })
      : await this.prisma.transferOutMast.findMany({ where: { client_id: clientId, transfer_out_date: { gte: filters.from, lte: filters.to } } })
    if (!masters.length) return { rows: [], truncated: false }
    const transferIds = masters.map((row) => row.id)
    const commonWhere = {
      client_id: clientId, product_id: { in: productIds },
      ...(filters.variantId ? { variant_id: filters.variantId } : {}),
    }
    const transactions = direction === 'in'
      ? await this.prisma.transferInTran.findMany({ where: { ...commonWhere, transfer_in_id: { in: transferIds } }, orderBy: { id: 'desc' }, take: limit + 1 })
      : await this.prisma.transferOutTran.findMany({ where: { ...commonWhere, transfer_out_id: { in: transferIds } }, orderBy: { id: 'desc' }, take: limit + 1 })
    const masterDates = new Map(masters.map((row) => direction === 'in'
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
    const truncated = transactions.length > limit
    return { truncated, rows: transactions.slice(0, limit).flatMap((row) => {
      const masterId = direction === 'in' ? (row as { transfer_in_id: bigint }).transfer_in_id : (row as { transfer_out_id: bigint }).transfer_out_id
      const transferDate = masterDates.get(masterId)
      const product = productMap.get(row.product_id)
      const variant = variantMap.get(row.variant_id)
      if (!transferDate || !product || !variant) return []
      const transferNumber = direction === 'in' ? (row as { transfer_in_number: bigint }).transfer_in_number : (row as { transfer_out_number: bigint }).transfer_out_number
      return [{
        id: row.id, transferNumber, transferDate, productId: row.product_id, variantId: row.variant_id,
        qty: Number(row.qty), freeQty: direction === 'in' ? Number((row as { free_qty: unknown }).free_qty) : 0,
        mrp: Number(row.mrp), costPrice: Number(row.cost_price), productCode: product.product_code,
        productName: product.product_full_name, eanCode: variant.ean_code ?? '', hsnCode: product.hsn_code,
        category: categoryMap.get(product.category_id) ?? '', subCategory: product.sub_category_id ? subCategoryMap.get(product.sub_category_id) ?? '' : '',
        brand: product.brand_id ? brandMap.get(product.brand_id) ?? '' : '', variantCode: variant.variant_code,
      }]
    }) }
  }

  async billSummarySource(clientId: bigint, filters: BillSummaryFilters, limit: number) {
    const [bills, payments, modes, salesmen] = await Promise.all([
      this.prisma.billMaster.findMany({ where: { client_id: clientId, bill_date: { gte: filters.from, lte: filters.to }, bill_mode: { not: 5 }, ...(filters.userId ? { user_id: filters.userId } : {}) }, orderBy: [{ bill_date: 'desc' }, { bill_num: 'desc' }], take: limit + 1 }),
      this.prisma.billPayments.findMany({ where: { client_id: clientId, bill_date: { gte: filters.from, lte: filters.to }, ...(filters.userId ? { user_id: filters.userId } : {}), ...(filters.paymentModeId ? { payment_mode_id: filters.paymentModeId } : {}) } }),
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

  async stockSource(clientId: bigint, filters: StockReportFilters, limit: number) {
    const products = await this.prisma.products.findMany({ where: { client_id: clientId, ...(filters.categoryId ? { category_id: filters.categoryId } : {}), ...(filters.subCategoryId ? { sub_category_id: filters.subCategoryId } : {}), ...(filters.brandId ? { brand_id: filters.brandId } : {}), ...(filters.itemCode ? { product_code: { contains: filters.itemCode } } : {}), ...(filters.itemName ? { product_full_name: { contains: filters.itemName } } : {}) } })
    if (!products.length) return { rows: [], truncated: false }
    const ids = products.map((row) => row.id)
    const [stock, variants, categories, subCategories, brands, taxes] = await Promise.all([
      this.prisma.stock.findMany({ where: { client_id: clientId, stock_date: { gte: filters.from, lte: filters.to }, product_id: { in: ids }, ...(filters.variantId ? { variant_id: filters.variantId } : {}) }, orderBy: [{ stock_date: 'desc' }, { id: 'desc' }], take: limit + 1 }),
      this.prisma.productVariants.findMany({ where: { client_id: clientId, product_id: { in: ids } } }), this.prisma.categories.findMany({ where: { client_id: clientId } }), this.prisma.subCategories.findMany({ where: { client_id: clientId } }), this.prisma.brands.findMany({ where: { client_id: clientId } }), this.prisma.taxes.findMany({ where: { client_id: clientId } }),
    ])
    const pm = new Map(products.map((r) => [r.id, r])), vm = new Map(variants.map((r) => [r.id, r])), cm = new Map(categories.map((r) => [r.id, r.category_name])), sm = new Map(subCategories.map((r) => [r.id, r.sub_category_name])), bm = new Map(brands.map((r) => [r.id, r.brand_name])), tm = new Map(taxes.map((r) => [r.id, r.tax_percent]))
    return { truncated: stock.length > limit, rows: stock.slice(0, limit).flatMap((row) => { const p = pm.get(row.product_id); if (!p) return []; const rate = tm.get(p.tax_id) ?? 0; if (filters.gstPercentage !== undefined && rate !== filters.gstPercentage) return []; return [{ id: row.id, stockDate: row.stock_date, productId: row.product_id, variantId: row.variant_id, productCode: p.product_code, productName: p.product_full_name, category: cm.get(p.category_id) ?? '', subCategory: p.sub_category_id ? sm.get(p.sub_category_id) ?? '' : '', brand: p.brand_id ? bm.get(p.brand_id) ?? '' : '', variantCode: row.variant_id ? String(safe(vm.get(row.variant_id)?.id ?? row.variant_id)) : '', gstPercentage: rate, sales: Number(row.sales), purchaseReturn: Number(row.purchase_return), gstAmount: Number(row.gst_amount), salesValue: Number(row.sales_value), discount: Number(row.discount) }] }) }
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
    const ids = salesmen.map((r) => r.id)
    const [transactions, products] = await Promise.all([this.prisma.billTran.findMany({ where: { client_id: clientId, bill_date: { gte: filters.from, lte: filters.to }, void_flag: 0, sm_id: { in: ids }, bill_mode: { not: 5 } }, orderBy: [{ bill_date: 'desc' }, { id: 'desc' }], take: limit + 1 }), this.prisma.products.findMany({ where: { client_id: clientId } })])
    const sm = new Map(salesmen.map((r) => [r.id, r])), pm = new Map(products.map((r) => [r.id, r.product_full_name]))
    return { truncated: transactions.length > limit, rows: transactions.slice(0, limit).flatMap((row) => { if (!row.sm_id) return []; const person = sm.get(row.sm_id); if (!person) return []; return [{ id: row.id, billDate: row.bill_date, salesmanId: row.sm_id, salesmanCode: person.sm_code, salesmanName: person.sm_name, commission: Number(person.commission_percent ?? 0), productName: pm.get(row.product_id) ?? 'Unknown item', qty: Number(row.qty), unitPrice: Number(row.sale_price), discount: Number(row.manual_discount_percentage) }] }) }
  }

  async salesmanOptions(clientId: bigint) { return (await this.prisma.salesMans.findMany({ where: { client_id: clientId, status: 1, trash: 0 }, orderBy: { sm_name: 'asc' } })).map((row) => ({ label: `${row.sm_code} · ${row.sm_name}`, value: safe(row.id) })) }

  async customerSalesSource(clientId: bigint, filters: CustomerSalesReportFilters, limit: number) {
    const masters = await this.prisma.billMaster.findMany({ where: { client_id: clientId, bill_date: { gte: filters.from, lte: filters.to }, bill_mode: { not: 5 }, customer_id: filters.customerId ?? { not: null } }, select: { bill_num: true, bill_date: true, customer_id: true } })
    if (!masters.length) return { rows: [], truncated: false }
    const keys = new Map(masters.map((r) => [billKey(r.bill_num, r.bill_date), r.customer_id!]))
    const source = await this.salesSource(clientId, { from: filters.from, to: filters.to, page: filters.page, perPage: filters.perPage, reportType: 'detailed', groupByTax: false }, limit)
    const customers = await this.prisma.customers.findMany({ where: { client_id: clientId } }), names = new Map(customers.map((r) => [r.id, r.customer_name ?? `Customer ${safe(r.id)}`]))
    return { truncated: source.truncated, rows: source.rows.flatMap((row) => { const customerId = keys.get(billKey(row.billNumber, row.billDate)); return customerId ? [{ ...row, customerId, customerName: names.get(customerId) ?? 'Unknown customer' }] : [] }) }
  }

  async customerOptions(clientId: bigint) { return (await this.prisma.customers.findMany({ where: { client_id: clientId, status: 1, trash: 0 }, orderBy: { customer_name: 'asc' } })).map((row) => ({ label: row.customer_name ?? `Customer ${safe(row.id)}`, value: safe(row.id) })) }
}
