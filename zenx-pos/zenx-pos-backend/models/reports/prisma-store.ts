import type { PrismaClient } from '@prisma/client'
import type { BillWiseReportFilters, PaymentCollectionFilters, ReportStore, SalesReportFilters, TransferReportFilters } from './contracts.ts'

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
        productName: product.product_full_name, eanCode: product.ean_code ?? '', hsnCode: product.hsn_code,
        category: categoryMap.get(product.category_id) ?? '', subCategory: product.sub_category_id ? subCategoryMap.get(product.sub_category_id) ?? '' : '',
        brand: product.brand_id ? brandMap.get(product.brand_id) ?? '' : '', variantCode: String(safe(variant.id)),
      }]
    }) }
  }
}
