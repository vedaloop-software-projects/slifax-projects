import type { PrismaClient } from '@prisma/client'
import type { Account } from '../auth/contracts.ts'
import { allowsNegativeInventory, decrementVariantStock } from '../inventory/stock-policy.ts'
import { PrismaProductSearchStore } from '../product-search/prisma-store.ts'
import { legacyDate, legacyDecimal, legacyId, legacyRoundOff, legacyRow, legacyTimestamp, legacyTimestamp12 } from '../system/legacy-response.ts'
import type { BillingOperation, BillingPayload, BillingStore } from './contracts.ts'

const number = (value: unknown, fallback = 0) => typeof value === 'number' ? value : fallback
const bigint = (value: unknown) => BigInt(number(value))
const string = (value: unknown) => typeof value === 'string' ? value : ''
const optionalId = (value: unknown) => typeof value === 'number' ? BigInt(value) : null
const date = (value?: unknown) => {
  if (typeof value !== 'string') return new Date()
  const [day, month, year] = value.split('-').map(Number)
  return new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+05:30`)
}
const indiaParts = (value: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? ''
  return { year: part('year'), month: part('month'), day: part('day') }
}
const dayRange = (value: Date) => {
  const { year, month, day } = indiaParts(value)
  const gte = new Date(`${year}-${month}-${day}T00:00:00+05:30`)
  return { gte, lt: new Date(gte.getTime() + 86_400_000) }
}
const indiaToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === type)?.value ?? ''
  return new Date(`${part('year')}-${part('month')}-${part('day')}T00:00:00+05:30`)
}
const audit = (account: Account, type: string, description: string, now: Date) => ({ client_id: account.client.id, user_id: account.user.id, type, description, created_at: now, updated_at: now })

export class PrismaBillingStore implements BillingStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  private async eanProducts(clientId: bigint, search: string) {
    const result = await new PrismaProductSearchStore(this.prisma).search(clientId, search, 100)
    if (result.truncated) throw new Error('Search result limit exceeded.')
    const rows = result.rows.filter(row => row.eanCode === search).map(row => legacyRow(row as unknown as Record<string, unknown>))
    if (!rows.length) throw new Error('No Products found.')
    return rows
  }

  private customerResponse(customer: Awaited<ReturnType<PrismaClient['customers']['findFirst']>>) {
    if (!customer) throw new Error('Customer not found.')
    return {
      id: legacyId(customer.id), clientId: legacyId(customer.client_id), customerName: customer.customer_name, mobile: customer.mobile,
      city: customer.city, address: customer.address, gst: customer.gst, discount: customer.discount, customerType: customer.customer_type,
      creditLimit: customer.credit_limit, creditDays: customer.credit_days, outstandingAmount: customer.outstanding_amount,
      birthday: legacyDate(customer.birthday), anniversary: legacyDate(customer.anniversary), preferredTable: customer.preferred_table,
      status: customer.status, trash: customer.trash, createdBy: customer.created_by, updatedBy: customer.updated_by,
      createdAt: legacyTimestamp(customer.created_at), updatedAt: legacyTimestamp(customer.updated_at),
    }
  }

  private async temp(clientId: bigint, userId: bigint) {
    const rows = await this.prisma.tempBillTran.findMany({ where: { client_id: clientId, user_id: userId }, orderBy: { line_num: 'asc' } })
    const productIds = [...new Set(rows.flatMap(row => [row.product_id, ...(row.free_prod_id === 0n ? [] : [row.free_prod_id])]))]
    const variantIds = [...new Set(rows.flatMap(row => [...(row.variant_id ? [row.variant_id] : []), ...(row.free_variant_id === 0n ? [] : [row.free_variant_id])]))]
    const salesmanIds = [...new Set(rows.flatMap(row => row.sm_id ? [row.sm_id] : []))]
    const [products, variants, salesmen] = await Promise.all([
      this.prisma.products.findMany({ where: { client_id: clientId, id: { in: productIds } } }),
      this.prisma.productVariants.findMany({ where: { client_id: clientId, id: { in: variantIds } } }),
      this.prisma.salesMans.findMany({ where: { client_id: clientId, id: { in: salesmanIds } } }),
    ])
    const productMap = new Map(products.map(product => [product.id, product]))
    const variantMap = new Map(variants.map(variant => [variant.id, variant]))
    const salesmanMap = new Map(salesmen.map(salesman => [salesman.id, salesman]))
    return rows.flatMap(row => {
      const product = productMap.get(row.product_id)
      const variant = row.variant_id ? variantMap.get(row.variant_id) : undefined
      if (!product || !variant) return []
      const freeProduct = row.free_prod_id === 0n ? undefined : productMap.get(row.free_prod_id)
      const freeVariant = row.free_variant_id === 0n ? undefined : variantMap.get(row.free_variant_id)
      const salesman = row.sm_id ? salesmanMap.get(row.sm_id) : undefined
      return [{
        id: legacyId(row.id), productId: legacyId(row.product_id), variantId: legacyId(row.variant_id),
        productCode: product.product_code, productFullName: product.product_full_name, productShortName: product.product_short_name,
        eanCode: product.ean_code, qty: legacyDecimal(row.qty, 3), packSize: variant.pack_size, mrp: legacyDecimal(row.mrp, 2),
        salePrice: legacyDecimal(row.sale_price, 3), priceOverride: legacyDecimal(row.price_override, 3), costPrice: legacyDecimal(row.cost_price, 3),
        lineNum: row.line_num, discountPercentage: legacyDecimal(row.manual_discount_percentage, 2), discountAmount: legacyDecimal(row.manual_discount_value, 2),
        gstPercentage: legacyDecimal(row.gst_percentage, 2), gstAmount: legacyDecimal(row.gst_amount, 3), schemeType: row.scheme_type,
        freeProductId: legacyId(row.free_prod_id), freeVariantId: legacyId(row.free_variant_id), freeQty: legacyDecimal(row.free_qty, 3),
        freeProductName: freeProduct?.product_full_name ?? null, freeProductShortName: freeProduct?.product_short_name ?? null,
        freeVariantName: freeVariant?.pack_size ?? null, freeVariantMrp: freeVariant?.mrp ?? null, freeVariantSalePrice: freeVariant?.sale_price ?? null,
        voidFlag: row.void_flag, billMode: row.bill_mode, smId: legacyId(row.sm_id), salesmanCode: salesman?.sm_code ?? null, salesmanName: salesman?.sm_name ?? null,
      }]
    })
  }

  private tempSummary(rows: Awaited<ReturnType<PrismaBillingStore['temp']>>, productId?: number, variantId?: number) {
    const active = rows.filter(row => row.voidFlag === 0)
    const totalQty = active.reduce((sum, row) => sum + Number(row.qty), 0)
    const subTotal = active.reduce((sum, row) => sum + Number(row.qty) * Number(row.priceOverride), 0)
    const totalDiscount = active.reduce((sum, row) => sum + Number(row.discountAmount), 0)
    const totalGst = active.reduce((sum, row) => sum + Number(row.gstAmount), 0)
    return { totalItems: active.length, totalQty, subTotal, totalDiscount, totalGst, roundOff: legacyRoundOff(subTotal - totalDiscount),
      items: productId === undefined || variantId === undefined ? rows : rows.filter(row => row.productId === productId && row.variantId === variantId) }
  }

  private async suspended(clientId: bigint, search?: string) {
    const rows = await this.prisma.suspendedItems.findMany({
      where: { client_id: clientId, ...(search ? { OR: [{ suspended_number: { contains: search } }, { customer_name: { contains: search } }, { customer_mobile: { contains: search } }] } : {}) },
      orderBy: [{ suspended_date: 'desc' }, { line_num: 'asc' }], take: 500,
    })
    const [products, variants] = await Promise.all([
      this.prisma.products.findMany({ where: { client_id: clientId, id: { in: [...new Set(rows.map(row => row.product_id))] } } }),
      this.prisma.productVariants.findMany({ where: { client_id: clientId, id: { in: [...new Set(rows.flatMap(row => row.variant_id ? [row.variant_id] : []))] } } }),
    ])
    const productMap = new Map(products.map(product => [product.id, product]))
    const variantMap = new Map(variants.map(variant => [variant.id, variant]))
    const groups = new Map<string, typeof rows>()
    for (const row of rows) groups.set(row.suspended_number, [...(groups.get(row.suspended_number) ?? []), row])
    return [...groups.values()].map(group => ({
      customerName: group[0]?.customer_name ?? null, customerMobile: group[0]?.customer_mobile ?? null,
      suspendedNumber: group[0]!.suspended_number, suspendedDate: legacyTimestamp12(group[0]!.suspended_date), totalItems: group.length,
      items: group.map(row => ({ id: legacyId(row.id), lineNum: row.line_num, productId: legacyId(row.product_id),
        productFullName: productMap.get(row.product_id)?.product_full_name ?? null, variantId: legacyId(row.variant_id),
        variantName: row.variant_id ? variantMap.get(row.variant_id)?.pack_size ?? null : null, qty: legacyDecimal(row.qty, 3),
        voidFlag: row.void_flag, smId: legacyId(row.sm_id) })),
    }))
  }

  private async product(clientId: bigint, productId: bigint, variantId: bigint) {
    const [product, variant] = await Promise.all([
      this.prisma.products.findFirst({ where: { id: productId, client_id: clientId, status: 1, trash: 0 } }),
      this.prisma.productVariants.findFirst({ where: { id: variantId, product_id: productId, client_id: clientId, status: 1, trash: 0 } }),
    ])
    return product && variant ? { product, variant } : null
  }

  private async itemDiscount(clientId: bigint, productId: bigint, variantId: bigint, qty: number, gross: number) {
    const today = indiaToday()
    const rows = await this.prisma.itemWiseDiscounts.findMany({
      where: { client_id: clientId, product_id: productId, variant_id: variantId, status: 1, purchase_qty: { lte: qty }, from_date: { lte: today }, to_date: { gte: today } },
      orderBy: { id: 'asc' }, take: 100,
    })
    let best = { schemeType: null as number | null, percentage: 0, amount: 0, freeProductId: 0n, freeVariantId: 0n, freeQty: 0 }
    for (const row of rows) {
      const percentage = Number(row.discount_percentage)
      const amount = Math.min(gross, percentage > 0 ? gross * percentage / 100 : Number(row.discount_value))
      if (amount > best.amount) {
        best = { schemeType: 2, percentage: gross ? amount * 100 / gross : 0, amount, freeProductId: 0n, freeVariantId: 0n, freeQty: 0 }
      } else if (amount === 0 && best.amount === 0 && Number(row.free_qty) > 0 && Number(row.purchase_qty) > 0) {
        const freeQty = Math.floor(qty / Number(row.purchase_qty)) * Number(row.free_qty)
        if (freeQty > best.freeQty) best = { schemeType: 2, percentage: 0, amount: 0, freeProductId: row.free_product_id, freeVariantId: row.free_variant_id, freeQty }
      }
    }
    return best
  }

  private async printBill(clientId: bigint, billNo: number, billDate: Date) {
    const range = dayRange(billDate)
    let master: any = await this.prisma.billMaster.findFirst({ where: { client_id: clientId, bill_num: billNo, bill_date: range } })
    let lines: any[] = []
    let payments: any[] = []
    if (master) {
      [lines, payments] = await Promise.all([
        this.prisma.billTran.findMany({ where: { client_id: clientId, bill_num: billNo, bill_date: range }, orderBy: { line_num: 'asc' } }),
        this.prisma.billPayments.findMany({ where: { client_id: clientId, bill_num: billNo, bill_date: range } }),
      ])
    } else {
      master = await this.prisma.prevBillMaster.findFirst({ where: { client_id: clientId, bill_num: billNo, bill_date: range } })
      if (master) [lines, payments] = await Promise.all([
        this.prisma.prevBillTran.findMany({ where: { client_id: clientId, bill_num: billNo, bill_date: range }, orderBy: { line_num: 'asc' } }),
        this.prisma.prevBillPayments.findMany({ where: { client_id: clientId, bill_num: billNo, bill_date: range } }),
      ])
    }
    if (!master) throw new Error('Bill not found.')
    const productIds = [...new Set(lines.map(row => row.product_id as bigint))]
    const variantIds = [...new Set(lines.flatMap(row => row.variant_id ? [row.variant_id as bigint] : []))]
    const salesmanIds = [...new Set([...(master.sm_id ? [master.sm_id as bigint] : []), ...lines.flatMap(row => row.sm_id ? [row.sm_id as bigint] : [])])]
    const [products, variants, unitTypes, sizes, colours, salesmen, customer, user, modes, taxes, settings, descriptions, business] = await Promise.all([
      this.prisma.products.findMany({ where: { client_id: clientId, id: { in: productIds } } }),
      this.prisma.productVariants.findMany({ where: { client_id: clientId, id: { in: variantIds } } }),
      this.prisma.unitTypes.findMany({ where: { client_id: clientId } }),
      this.prisma.sizes.findMany({ where: { client_id: clientId } }),
      this.prisma.colours.findMany({ where: { client_id: clientId } }),
      this.prisma.salesMans.findMany({ where: { client_id: clientId, id: { in: salesmanIds } } }),
      master.customer_id ? this.prisma.customers.findFirst({ where: { client_id: clientId, id: master.customer_id } }) : null,
      master.user_id ? this.prisma.clientUsers.findFirst({ where: { client_id: clientId, id: master.user_id } }) : null,
      this.prisma.paymentModes.findMany({ where: { client_id: clientId } }),
      this.prisma.taxBreakup.findMany({ where: { client_id: clientId, bill_num: billNo, bill_date: range } }),
      this.prisma.billingSettings.findFirst({ where: { client_id: clientId } }),
      this.prisma.billingSettingsDescriptions.findMany({ where: { client_id: clientId } }),
      this.prisma.users.findFirst({ where: { id: clientId } }),
    ])
    const productMap = new Map(products.map(row => [row.id, row])), variantMap = new Map(variants.map(row => [row.id, row]))
    const unitMap = new Map(unitTypes.map(row => [row.id, row])), sizeMap = new Map(sizes.map(row => [row.id, row])), colourMap = new Map(colours.map(row => [row.id, row])), salesmanMap = new Map(salesmen.map(row => [row.id, row])), modeMap = new Map(modes.map(row => [row.id, row.payment_mode]))
    const items = lines.flatMap(row => {
      const product = productMap.get(row.product_id), variant = row.variant_id ? variantMap.get(row.variant_id) : undefined
      if (!product || !variant) return []
      const unit = product.unit_type_id ? unitMap.get(product.unit_type_id) : undefined, size = variant.size_id ? sizeMap.get(variant.size_id) : undefined, colour = variant.colour_id ? colourMap.get(variant.colour_id) : undefined, salesman = row.sm_id ? salesmanMap.get(row.sm_id) : undefined
      return [{ id: legacyId(row.id), productId: legacyId(row.product_id), variantId: legacyId(row.variant_id), productCode: product.product_code, productFullName: product.product_full_name, productShortName: product.product_short_name, hsnCode: product.hsn_code, eanCode: product.ean_code, qty: legacyDecimal(row.qty, 3), mrp: legacyDecimal(row.mrp, 2), salePrice: legacyDecimal(row.sale_price, 3), priceOverride: legacyDecimal(row.price_override, 3), costPrice: legacyDecimal(row.cost_price, 3), discountPercentage: legacyDecimal(row.manual_discount_percentage, 2), discountAmount: legacyDecimal(row.manual_discount_value, 2), gstPercentage: legacyDecimal(row.gst_percentage, 2), gstAmount: legacyDecimal(row.gst_amount, 3), packSize: variant.pack_size, unitTypeId: legacyId(product.unit_type_id), unitType: unit?.unit_type_name ?? null, sizeId: legacyId(variant.size_id), sizeName: size?.size_name ?? null, colourId: legacyId(variant.colour_id), colourName: colour?.colour_name ?? null, salesmanCode: salesman?.sm_code ?? null, salesmanName: salesman?.sm_name ?? null }]
    })
    const amountSaved = items.reduce((sum, row) => sum + Number(row.qty) * Number(row.mrp) - (Number(row.qty) * Number(row.priceOverride) - Number(row.discountAmount)), 0)
    const salesman = master.sm_id ? salesmanMap.get(master.sm_id) : undefined
    return {
      businessDetails: { name: business?.business_name ?? '', address: business?.address ?? '', mobile: business?.mobile ?? '', gstNo: business?.gst_number ?? '', logo: business?.logo ?? '' },
      customerDetails: { customerName: customer?.customer_name ?? '', mobile: customer?.mobile ?? '', address: customer?.address ?? '', gst: customer?.gst ?? '' },
      billDetails: { billNumber: master.bill_num, billDate: legacyTimestamp12(master.bill_date), subTotal: legacyDecimal(master.total_amount, 3), discountAmount: legacyDecimal(master.manual_discount_value, 2), subTotalAfterDiscount: legacyDecimal(master.sub_total_amount, 3), otherCharges: legacyDecimal(master.other_charges, 2), roundOff: legacyDecimal(master.round_off_value, 2), netAmount: legacyDecimal(master.net_amount, 3), gstAmount: legacyDecimal(master.gst_amount, 3), exclusiveNetAmount: legacyDecimal(master.exclusive_net_amount, 3), amountSaved, billMode: master.bill_mode, narration: master.narration, userId: legacyId(master.user_id), userName: user?.name ?? '', salesmanId: legacyId(master.sm_id), salesmanCode: salesman?.sm_code ?? '', salesmanName: salesman?.sm_name ?? '' },
      items,
      taxBreakup: taxes.map(row => ({ taxPercentage: legacyDecimal(row.tax_percentage, 2), gstAmount: legacyDecimal(row.amount, 3), taxableAmount: legacyDecimal(row.tax_amount, 3) })),
      payments: payments.map(row => ({ amount: legacyDecimal(row.amount, 3), tenderedChange: row.tendered_change, paymentMode: modeMap.get(row.payment_mode_id) ?? '' })),
      billSettings: { billPrefix: settings?.bill_prefix ?? '', billCaption: settings?.bill_caption ?? '', billFormatNumber: settings?.bill_format_number ?? '', companyLogoOnBills: settings?.company_logo_on_bills ?? 0, qrCodeInBill: settings?.qr_code_in_bill ?? 0, descriptions: descriptions.map(row => row.description ?? '') },
    }
  }

  private async putTemp(account: Account, payload: BillingPayload, refund = false) {
    const productId = bigint(payload.productId), variantId = bigint(payload.variantId), qty = number(payload.qty)
    const found = await this.product(account.client.id, productId, variantId)
    if (!found) throw new Error('Invalid product or variant.')
    const existing = await this.prisma.tempBillTran.findFirst({ where: { client_id: account.client.id, user_id: account.user.id, product_id: productId, variant_id: variantId } })
    const nextQty = existing ? Number(existing.qty) + qty : qty
    const salePrice = refund ? Number(payload.salePrice ?? found.variant.sale_price) : number(payload.customerType) === 2 ? found.variant.whole_sale_price : found.variant.sale_price
    const tax = await this.prisma.taxes.findFirst({ where: { id: found.product.tax_id, client_id: account.client.id, status: 1, trash: 0 } })
    if (!tax) throw new Error('Product tax configuration is unavailable.')
    const settings = await this.prisma.billingSettings.findFirst({ where: { client_id: account.client.id } })
    const gstPercentage = refund ? number(payload.gstPercentage, tax.tax_percent) : tax.tax_percent, gross = nextQty * salePrice
    const scheme = refund ? { schemeType: null, percentage: 0, amount: 0, freeProductId: 0n, freeVariantId: 0n, freeQty: 0 } : await this.itemDiscount(account.client.id, productId, variantId, nextQty, gross)
    const taxable = gross - scheme.amount
    const gstAmount = settings?.exclusive_gst_billing === 1 ? taxable * gstPercentage / 100 : taxable * gstPercentage / (100 + gstPercentage)
    const now = new Date()
    if (existing) return this.prisma.tempBillTran.update({ where: { id: existing.id }, data: { qty: nextQty, sale_price: salePrice, price_override: salePrice, gst_percentage: gstPercentage, gst_amount: gstAmount, manual_discount_percentage: scheme.percentage, manual_discount_value: scheme.amount, scheme_type: scheme.schemeType, free_prod_id: scheme.freeProductId, free_variant_id: scheme.freeVariantId, free_qty: scheme.freeQty, updated_at: now } })
    const last = await this.prisma.tempBillTran.findFirst({ where: { client_id: account.client.id, user_id: account.user.id }, orderBy: { line_num: 'desc' } })
    return this.prisma.tempBillTran.create({ data: {
      client_id: account.client.id, user_id: account.user.id, product_id: productId, variant_id: variantId, qty,
      mrp: found.variant.mrp, sale_price: salePrice, price_override: salePrice,
      cost_price: found.variant.cost_price, line_num: (last?.line_num ?? 0) + 1,
      gst_percentage: gstPercentage, gst_amount: gstAmount, manual_discount_percentage: scheme.percentage, manual_discount_value: scheme.amount,
      scheme_type: scheme.schemeType, free_prod_id: scheme.freeProductId, free_variant_id: scheme.freeVariantId, free_qty: scheme.freeQty,
      sm_id: optionalId(payload.smId), bill_mode: number(payload.billMode, refund ? 4 : 1), created_at: now, updated_at: now,
    } })
  }

  private async save(account: Account, payload: BillingPayload, refund: boolean) {
    return this.prisma.$transaction(async transaction => {
      const items = await transaction.tempBillTran.findMany({ where: { client_id: account.client.id, user_id: account.user.id, void_flag: 0 }, orderBy: { line_num: 'asc' } })
      if (!items.length) throw new Error('No bill items found.')
      const variantIds = [...new Set(items.flatMap(item => [...(item.variant_id ? [item.variant_id] : []), ...(item.free_variant_id === 0n ? [] : [item.free_variant_id])]))]
      const variants = await transaction.productVariants.findMany({ where: { client_id: account.client.id, id: { in: variantIds }, status: 1, trash: 0 } })
      const variantMap = new Map(variants.map(variant => [variant.id, variant]))
      if (variants.length !== variantIds.length) throw new Error('A bill variant is unavailable.')
      const payments = payload.paymentModes as Array<{ paymentModeId: number; amount: number; cashChange?: number }>
      const paymentModes = await transaction.paymentModes.findMany({ where: { client_id: account.client.id, id: { in: payments.map(payment => BigInt(payment.paymentModeId)) }, status: 1, trash: 0 } })
      if (paymentModes.length !== new Set(payments.map(payment => payment.paymentModeId)).size) throw new Error('Invalid payment mode.')
      const settings = await transaction.billingSettings.findFirst({ where: { client_id: account.client.id } })
      const subtotal = items.reduce((sum, item) => sum + Number(item.qty) * Number(item.sale_price), 0)
      const itemDiscount = items.reduce((sum, item) => sum + Number(item.manual_discount_value), 0)
      const gst = items.reduce((sum, item) => sum + Number(item.gst_amount), 0)
      const submittedDiscount = payload.discount === undefined ? itemDiscount : number(payload.discount)
      if (Math.abs(submittedDiscount - itemDiscount) > 0.011) throw new Error('Bill totals changed; refresh and retry.')
      const discount = itemDiscount, charges = number(payload.additionalCharges), roundOff = number(payload.roundOffValue)
      const total = Math.round((subtotal - discount + (settings?.exclusive_gst_billing === 1 ? gst : 0) + charges + roundOff) * 1000) / 1000
      if (Math.abs(number(payload.subTotal) - subtotal) > 0.011 || Math.abs(number(payload.total) - total) > 0.011) throw new Error('Bill totals changed; refresh and retry.')
      if (Math.abs(payments.reduce((sum, payment) => sum + payment.amount - number(payment.cashChange), 0) - total) > 0.011) throw new Error('Payment total must equal the bill total.')
      const customerId = optionalId(payload.customerId), salesmanId = optionalId(payload.smId)
      if (customerId && !await transaction.customers.findFirst({ where: { id: customerId, client_id: account.client.id, status: 1, trash: 0 } })) throw new Error('Invalid customer.')
      if (salesmanId && !await transaction.salesMans.findFirst({ where: { id: salesmanId, client_id: account.client.id, status: 1, trash: 0 } })) throw new Error('Invalid salesman.')
      const now = new Date(), current = await transaction.billMaster.findFirst({ where: { client_id: account.client.id, ...(settings?.reset_bill_no_after_day_close === 1 ? { bill_date: dayRange(now) } : {}) }, orderBy: { id: 'desc' } }), billNo = (current?.bill_num ?? 0) + 1
      const master = await transaction.billMaster.create({ data: {
        client_id: account.client.id, bill_num: billNo, bill_date: now, user_id: account.user.id, sm_id: salesmanId,
        total_amount: subtotal, manual_discount_value: discount, manual_discount_percentage: subtotal ? discount * 100 / subtotal : 0,
        sub_total_amount: subtotal - discount, other_charges: charges, round_off_value: roundOff, net_amount: refund ? -total : total,
        gst_amount: refund ? -gst : gst, exclusive_net_amount: refund ? -(total - gst) : total - gst, bill_mode: refund ? 4 : number(payload.billMode, 1),
        refund_against_bill_num: refund ? String(payload.billNumber) : null, refund_against_bill_date: refund ? date(payload.billDate) : null,
        customer_id: customerId, narration: typeof payload.narration === 'string' ? payload.narration : null, created_at: now, updated_at: now,
      } })
      await transaction.billTran.createMany({ data: items.flatMap(item => [{
        client_id: account.client.id, bill_num: billNo, bill_date: now, line_num: item.line_num, product_id: item.product_id,
        variant_id: item.variant_id, qty: refund ? -Number(item.qty) : item.qty, mrp: item.mrp, sale_price: item.sale_price,
        price_override: item.price_override, manual_discount_percentage: item.manual_discount_percentage,
        manual_discount_value: refund ? -Number(item.manual_discount_value) : item.manual_discount_value, void_flag: item.void_flag,
        bill_mode: refund ? 4 : item.bill_mode, gst_percentage: item.gst_percentage, gst_amount: refund ? -Number(item.gst_amount) : item.gst_amount,
        cost_price: item.cost_price, sm_id: item.sm_id, scheme_type: item.scheme_type, user_id: account.user.id, created_at: now, updated_at: now,
      }, ...(item.free_prod_id !== 0n && item.free_variant_id !== 0n && Number(item.free_qty) > 0 ? [{ client_id: account.client.id, bill_num: billNo, bill_date: now, line_num: item.line_num, product_id: item.free_prod_id, variant_id: item.free_variant_id, qty: refund ? -Number(item.free_qty) : item.free_qty, mrp: 0, sale_price: 0, price_override: 0, manual_discount_percentage: 0, manual_discount_value: 0, void_flag: item.void_flag, bill_mode: 4, gst_percentage: 0, gst_amount: 0, cost_price: 0, sm_id: item.sm_id, scheme_type: item.scheme_type, user_id: account.user.id, created_at: now, updated_at: now }] : [])]) })
      const taxes = new Map<number, { taxable: number; gst: number }>()
      for (const item of items) {
        const rate = Number(item.gst_percentage), gstAmount = Number(item.gst_amount), discounted = Number(item.qty) * Number(item.sale_price) - Number(item.manual_discount_value)
        const currentTax = taxes.get(rate) ?? { taxable: 0, gst: 0 }
        currentTax.taxable += settings?.exclusive_gst_billing === 1 ? discounted : discounted - gstAmount
        currentTax.gst += gstAmount
        taxes.set(rate, currentTax)
      }
      if (taxes.size) await transaction.taxBreakup.createMany({ data: [...taxes].map(([rate, value]) => ({ client_id: account.client.id, bill_num: billNo, bill_date: now, user_id: account.user.id, tax_percentage: rate, tax_amount: refund ? -value.taxable : value.taxable, amount: refund ? -value.gst : value.gst, created_at: now, updated_at: now })) })
      await transaction.billPayments.createMany({ data: payments.flatMap(payment => [
        { client_id: account.client.id, bill_num: billNo, bill_date: now, payment_mode_id: BigInt(payment.paymentModeId), amount: refund ? -payment.amount : payment.amount, tendered_change: 1, user_id: account.user.id, created_at: now, updated_at: now },
        ...(number(payment.cashChange) > 0 ? [{ client_id: account.client.id, bill_num: billNo, bill_date: now, payment_mode_id: BigInt(payment.paymentModeId), amount: refund ? -number(payment.cashChange) : number(payment.cashChange), tendered_change: 2, user_id: account.user.id, created_at: now, updated_at: now }] : []),
      ]) })
      const allowNegative = refund || await allowsNegativeInventory(transaction, account.client.id)
      for (const item of items) {
        if (!item.variant_id) continue
        const variant = variantMap.get(item.variant_id)!
        if (refund) {
          await transaction.productVariants.update({ where: { id: variant.id }, data: { variant_qty: { increment: Number(item.qty) }, updated_at: now } })
        } else if (!await decrementVariantStock(transaction, { clientId: account.client.id, productId: item.product_id, variantId: variant.id, quantity: Number(item.qty), allowNegative })) {
          throw new Error(`Insufficient stock. Available: ${variant.variant_qty}; requested quantity: ${Number(item.qty)}.`)
        }
        const stock = await transaction.stock.findFirst({ where: { client_id: account.client.id, product_id: item.product_id, variant_id: item.variant_id, stock_date: date() } })
        if (stock) await transaction.stock.update({ where: { id: stock.id }, data: { sales: { increment: refund ? -Number(item.qty) : Number(item.qty) }, closeing_balance: { increment: refund ? Number(item.qty) : -Number(item.qty) }, updated_at: now } })
        if (!refund && item.free_prod_id !== 0n && item.free_variant_id !== 0n && Number(item.free_qty) > 0) {
          const freeVariant = variantMap.get(item.free_variant_id)!
          if (!await decrementVariantStock(transaction, { clientId: account.client.id, productId: item.free_prod_id, variantId: item.free_variant_id, quantity: Number(item.free_qty), allowNegative })) throw new Error(`Insufficient stock. Available: ${freeVariant.variant_qty}; requested quantity: ${Number(item.free_qty)}.`)
        }
      }
      await transaction.tempBillTran.deleteMany({ where: { client_id: account.client.id, user_id: account.user.id } })
      await transaction.audits.create({ data: audit(account, refund ? 'refund' : 'add', `${refund ? 'Refund' : 'Bill'} ${billNo} saved`, now) })
      return { id: master.id, billNumber: billNo, billDate: now, total }
    }, { isolationLevel: 'Serializable' })
  }

  async execute(operation: BillingOperation, account: Account, payload: BillingPayload): Promise<unknown> {
    const clientId = account.client.id, userId = account.user.id
    switch (operation) {
      case 'searchEanCode': {
        const search = string(payload.searchStr).replace(/\s/g, '')
        return this.eanProducts(clientId, search)
      }
      case 'getCustomerByMobile': return this.customerResponse(await this.prisma.customers.findFirst({ where: { client_id: clientId, mobile: string(payload.mobile), status: 1, trash: 0 } }))
      case 'addProductToTemp': return this.putTemp(account, payload)
      case 'updateTempProductQty': {
        const row = await this.prisma.tempBillTran.findFirst({ where: { client_id: clientId, user_id: userId, product_id: bigint(payload.productId), variant_id: bigint(payload.variantId) } })
        if (!row) throw new Error('Temporary bill item not found.')
        const found = await this.product(clientId, row.product_id, row.variant_id!)
        if (!found) throw new Error('Product variant is unavailable.')
        const qty = number(payload.qty), gross = qty * Number(row.sale_price), settings = await this.prisma.billingSettings.findFirst({ where: { client_id: clientId } }), rate = Number(row.gst_percentage)
        const scheme = await this.itemDiscount(clientId, row.product_id, row.variant_id!, qty, gross), taxable = gross - scheme.amount
        return this.prisma.tempBillTran.update({ where: { id: row.id }, data: { qty, gst_amount: settings?.exclusive_gst_billing === 1 ? taxable * rate / 100 : taxable * rate / (100 + rate), manual_discount_percentage: scheme.percentage, manual_discount_value: scheme.amount, scheme_type: scheme.schemeType, free_prod_id: scheme.freeProductId, free_variant_id: scheme.freeVariantId, free_qty: scheme.freeQty, updated_at: new Date() } })
      }
      case 'updateTempProductSalePrice': {
        const row = await this.prisma.tempBillTran.findFirst({ where: { client_id: clientId, user_id: userId, product_id: bigint(payload.productId), variant_id: bigint(payload.variantId) } })
        if (!row) throw new Error('Temporary bill item not found.')
        const price = number(payload.salePrice), settings = await this.prisma.billingSettings.findFirst({ where: { client_id: clientId } }), gross = Number(row.qty) * price, rate = Number(row.gst_percentage)
        const scheme = await this.itemDiscount(clientId, row.product_id, row.variant_id!, Number(row.qty), gross), taxable = gross - scheme.amount
        const gst = settings?.exclusive_gst_billing === 1 ? taxable * rate / 100 : taxable * rate / (100 + rate)
        return this.prisma.tempBillTran.update({ where: { id: row.id }, data: { sale_price: price, price_override: price, gst_amount: gst, manual_discount_percentage: scheme.percentage, manual_discount_value: scheme.amount, scheme_type: scheme.schemeType, free_prod_id: scheme.freeProductId, free_variant_id: scheme.freeVariantId, free_qty: scheme.freeQty, updated_at: new Date() } })
      }
      case 'clearTempBill': return { deleted: (await this.prisma.tempBillTran.deleteMany({ where: { client_id: clientId, user_id: userId } })).count }
      case 'updateVoid': case 'updateTempProductDiscount': {
        const row = await this.prisma.tempBillTran.findFirst({ where: { client_id: clientId, user_id: userId, product_id: bigint(payload.productId), variant_id: bigint(payload.variantId) } })
        if (!row) throw new Error('Temporary bill item not found.')
        if (operation === 'updateVoid') return this.prisma.tempBillTran.update({ where: { id: row.id }, data: { void_flag: number(payload.voidFlag), updated_at: new Date() } })
        const gross = Number(row.qty) * Number(row.sale_price), discount = payload.discountPercentage === undefined ? number(payload.discountValue) : gross * number(payload.discountPercentage) / 100
        if (discount > gross) throw new Error('Discount exceeds item amount.')
        return this.prisma.tempBillTran.update({ where: { id: row.id }, data: { manual_discount_percentage: gross ? discount * 100 / gross : 0, manual_discount_value: discount, scheme_type: null, free_prod_id: 0n, free_variant_id: 0n, free_qty: 0, updated_at: new Date() } })
      }
      case 'getShortcutKeys': {
        const masters = await this.prisma.keyMappingMasters.findMany({ where: { status: 1, trash: 0 }, orderBy: { key_name: 'asc' }, take: 500 })
        const settings = await this.prisma.keyMappingSettings.findMany({ where: { client_id: clientId, key_mapping_id: { in: masters.map(master => master.id) } }, take: 500 })
        const settingByMaster = new Map(settings.map(setting => [setting.key_mapping_id, setting]))
        return masters.flatMap(master => {
          const setting = settingByMaster.get(master.id)
          return setting ? [{ id: legacyId(setting.id), keyMappingId: legacyId(setting.key_mapping_id), keyName: master.key_name, shortKey: setting.short_key }] : []
        })
      }
      case 'suspendBill': return this.prisma.$transaction(async transaction => {
        const rows = await transaction.tempBillTran.findMany({ where: { client_id: clientId, user_id: userId, bill_mode: 1 } }); if (!rows.length) throw new Error('No products available to suspend.')
        const now = new Date(), year = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(now))
        const yearStart = new Date(`${year}-01-01T00:00:00+05:30`), yearEnd = new Date(`${year + 1}-01-01T00:00:00+05:30`)
        const last = await transaction.suspendedItems.findFirst({ where: { client_id: clientId, suspended_date: { gte: yearStart, lt: yearEnd } }, orderBy: { id: 'desc' } })
        const running = last ? Number(last.suspended_number.split('_')[2] ?? 0) + 1 : 1
        const suspendedNumber = `${year}_${clientId}_${running}`
        await transaction.suspendedItems.createMany({ data: rows.map(row => ({ client_id: clientId, user_id: userId, suspended_number: suspendedNumber, suspended_date: now, line_num: row.line_num, product_id: row.product_id, variant_id: row.variant_id, qty: row.qty, void_flag: row.void_flag, sm_id: row.sm_id, customer_name: typeof payload.customerName === 'string' ? payload.customerName : null, customer_mobile: typeof payload.customerMobile === 'string' ? payload.customerMobile : null, created_at: now, updated_at: now })) })
        await transaction.tempBillTran.deleteMany({ where: { client_id: clientId, user_id: userId } }); return { suspendedNumber, itemsCount: rows.length }
      })
      case 'getProductDetails': return this.product(clientId, bigint(payload.productId), bigint(payload.variantId))
      case 'getSuspendedItems': return this.suspended(clientId, payload.searchStr ? string(payload.searchStr) : undefined)
      case 'resumeSuspendedBill': return this.prisma.$transaction(async transaction => {
        const suspended = await transaction.suspendedItems.findMany({ where: { client_id: clientId, suspended_number: string(payload.suspendedNumber) }, orderBy: { line_num: 'asc' } }); if (!suspended.length) throw new Error('Suspended bill not found.')
        if (await transaction.tempBillTran.count({ where: { client_id: clientId, user_id: userId } })) throw new Error('Clear the current bill before resuming.')
        const variants = await transaction.productVariants.findMany({ where: { client_id: clientId, id: { in: suspended.flatMap(row => row.variant_id ? [row.variant_id] : []) }, status: 1, trash: 0 } }); const map = new Map(variants.map(v => [v.id, v])); if (variants.length !== suspended.length) throw new Error('A suspended product is unavailable.')
        const now = new Date(); await transaction.tempBillTran.createMany({ data: suspended.map(row => { const variant = map.get(row.variant_id!)!; return { client_id: clientId, user_id: userId, product_id: row.product_id, variant_id: row.variant_id, qty: row.qty, mrp: variant.mrp, sale_price: variant.sale_price, cost_price: variant.cost_price, line_num: row.line_num, void_flag: row.void_flag, sm_id: row.sm_id, created_at: now, updated_at: now } }) }); await transaction.suspendedItems.deleteMany({ where: { client_id: clientId, suspended_number: string(payload.suspendedNumber) } }); return { resumed: suspended.length }
      })
      case 'getTempBillItems': return this.tempSummary(await this.temp(clientId, userId))
      case 'getTempBillItem': return this.tempSummary(await this.temp(clientId, userId), number(payload.productId), number(payload.variantId))
      case 'updateManualDiscount': {
        const rows = await this.prisma.tempBillTran.findMany({ where: { client_id: clientId, user_id: userId, void_flag: 0 } }); if (!rows.length) throw new Error('No bill items found.')
        const gross = rows.reduce((sum, row) => sum + Number(row.qty) * Number(row.sale_price), 0), totalDiscount = payload.discountPercentage === undefined ? number(payload.discountValue) : gross * number(payload.discountPercentage) / 100; if (totalDiscount > gross) throw new Error('Discount exceeds bill amount.')
        await this.prisma.$transaction(rows.map(row => { const rowGross = Number(row.qty) * Number(row.sale_price), share = gross ? totalDiscount * rowGross / gross : 0; return this.prisma.tempBillTran.update({ where: { id: row.id }, data: { manual_discount_percentage: gross ? totalDiscount * 100 / gross : 0, manual_discount_value: share, updated_at: new Date() } }) })); return { discount: totalDiscount }
      }
      case 'clearManualDiscount': return { updated: (await this.prisma.tempBillTran.updateMany({ where: { client_id: clientId, user_id: userId }, data: { manual_discount_percentage: 0, manual_discount_value: 0, updated_at: new Date() } })).count }
      case 'getFreeProductDetails': return (await this.temp(clientId, userId)).filter(row => Number(row.freeQty) > 0)
      case 'saveBill': return this.save(account, payload, false)
      case 'getApplicableBillBuster': {
        const today = indiaToday()
        const records = await this.prisma.billBusters.findMany({
          where: { client_id: clientId, status: 1, bill_amount: { lte: number(payload.totalAmount) }, from_date: { lte: today }, to_date: { gte: today } },
          orderBy: { bill_amount: 'desc' }, take: 100,
        })
        const children = await this.prisma.childBillBusters.findMany({ where: { client_id: clientId, bill_buster_id: { in: records.map(row => row.id) } } })
        const [products, variants] = await Promise.all([
          this.prisma.products.findMany({ where: { client_id: clientId, id: { in: [...new Set(children.map(row => row.product_id))] } }, select: { id: true, product_full_name: true } }),
          this.prisma.productVariants.findMany({ where: { client_id: clientId, id: { in: [...new Set(children.map(row => row.variant_id))] } }, select: { id: true, product_id: true, pack_size: true } }),
        ])
        const productNames = new Map(products.map(row => [row.id, row.product_full_name]))
        const variantDetails = new Map(variants.map(row => [row.id, row]))
        return records.map(row => ({
          id: legacyId(row.id), schemeName: row.scheme_name, billAmount: legacyDecimal(row.bill_amount, 2),
          discountPercentage: legacyDecimal(row.discount_percentage, 2), fromDate: legacyDate(row.from_date), toDate: legacyDate(row.to_date),
          childBillBusters: children.flatMap(child => {
            const variant = variantDetails.get(child.variant_id)
            if (child.bill_buster_id !== row.id || variant?.product_id !== child.product_id) return []
            return [{ id: legacyId(child.id), productId: legacyId(child.product_id), productName: productNames.get(child.product_id) ?? null,
              variantId: legacyId(child.variant_id), packSize: variant.pack_size, freeQty: Number(child.free_qty), discountPercentage: Number(child.discount_percentage) }]
          }),
        }))
      }
      case 'applyBillBuster': {
        const found = await this.product(clientId, bigint(payload.productId), bigint(payload.variantId)); if (!found) throw new Error('Invalid free product.')
        const row = await this.prisma.tempBillTran.findFirst({ where: { client_id: clientId, user_id: userId }, orderBy: { line_num: 'desc' } }); if (!row) throw new Error('No bill items found.')
        return this.prisma.tempBillTran.update({ where: { id: row.id }, data: { free_prod_id: bigint(payload.productId), free_variant_id: bigint(payload.variantId), free_qty: number(payload.qty), scheme_type: 4, updated_at: new Date() } })
      }
      case 'overingBill': {
        const billDate = date(payload.billDate)
        return this.prisma.$transaction(async transaction => { const bill = await transaction.billMaster.findFirst({ where: { client_id: clientId, bill_num: number(payload.billNo), bill_date: dayRange(billDate), bill_mode: { not: 5 } } }); if (!bill) throw new Error('Bill not found.'); await transaction.billMaster.update({ where: { id: bill.id }, data: { bill_mode: 5, updated_at: new Date() } }); await transaction.audits.create({ data: audit(account, 'cancel', `Bill ${bill.bill_num} cancelled`, new Date()) }); return { cancelled: true } })
      }
      case 'checkRefundBill': { const billDate = date(payload.billDate); const bill = await this.prisma.billMaster.findFirst({ where: { client_id: clientId, bill_num: number(payload.billNo), bill_date: dayRange(billDate), bill_mode: { not: 5 } } }); if (!bill) throw new Error('Bill not found.'); return bill }
      case 'addRefundProductToTemp': {
        const billDate = date(payload.billDate), original = await this.prisma.billTran.findFirst({ where: { client_id: clientId, bill_num: number(payload.billNumber), bill_date: dayRange(billDate), product_id: bigint(payload.productId), variant_id: bigint(payload.variantId) } }); if (!original || number(payload.qty) > Math.abs(Number(original.qty))) throw new Error('Refund quantity exceeds the original bill.'); return this.putTemp(account, { ...payload, salePrice: Number(original.sale_price), mrp: Number(original.mrp), costPrice: Number(original.cost_price), gstPercentage: Number(original.gst_percentage), billMode: 4 }, true)
      }
      case 'saveRefundBill': return this.save(account, payload, true)
      case 'getPrint': return this.printBill(clientId, number(payload.billNumber, Number(payload.billNumber)), date(payload.billDate))
      case 'getDayCloseReport': {
        const target = date(payload.date), range = dayRange(target), yesterday = new Date(target.getTime() - 86_400_000)
        const salesWhere = { client_id: clientId, bill_date: range, bill_mode: 1 }
        const yesterdayWhere = { client_id: clientId, bill_date: dayRange(yesterday), bill_mode: 1 }
        const [currentBills, archivedBills, currentYesterday, archivedYesterday, currentPayments, archivedPayments, paymentModes, taxes, expenses, heads, users, business] = await Promise.all([
          this.prisma.billMaster.findMany({ where: salesWhere, select: { user_id: true, net_amount: true } }),
          this.prisma.prevBillMaster.findMany({ where: salesWhere, select: { user_id: true, net_amount: true } }),
          this.prisma.billMaster.findMany({ where: yesterdayWhere, select: { net_amount: true } }),
          this.prisma.prevBillMaster.findMany({ where: yesterdayWhere, select: { net_amount: true } }),
          this.prisma.billPayments.findMany({ where: { client_id: clientId, bill_date: range }, select: { payment_mode_id: true, amount: true, tendered_change: true } }),
          this.prisma.prevBillPayments.findMany({ where: { client_id: clientId, bill_date: range }, select: { payment_mode_id: true, amount: true, tendered_change: true } }),
          this.prisma.paymentModes.findMany({ where: { client_id: clientId }, select: { id: true, payment_mode: true } }),
          this.prisma.taxBreakup.findMany({ where: { client_id: clientId, bill_date: range }, select: { tax_percentage: true, amount: true, tax_amount: true } }),
          this.prisma.expenses.findMany({ where: { client_id: clientId, transaction_date: range, status: 1, trash: 0 }, select: { expense_head_id: true, expense_type: true, amount: true } }),
          this.prisma.expenseHeads.findMany({ where: { client_id: clientId, trash: 0 }, select: { id: true, expense_head: true } }),
          this.prisma.clientUsers.findMany({ where: { client_id: clientId, trash: 0 }, select: { id: true, name: true } }),
          this.prisma.users.findFirst({ where: { id: clientId }, select: { business_name: true, address: true, mobile: true, logo: true } }),
        ])
        const bills = [...currentBills, ...archivedBills], totalSales = bills.reduce((sum, row) => sum + Number(row.net_amount), 0)
        const yesterdaySales = [...currentYesterday, ...archivedYesterday].reduce((sum, row) => sum + Number(row.net_amount), 0)
        const salesPercentage = yesterdaySales ? Math.round(((totalSales - yesterdaySales) * 100 / yesterdaySales) * 100) / 100 : 0
        const modeNames = new Map(paymentModes.map(row => [row.id, row.payment_mode])), paymentTotals = new Map<bigint, number>()
        for (const row of [...currentPayments, ...archivedPayments]) paymentTotals.set(row.payment_mode_id, (paymentTotals.get(row.payment_mode_id) ?? 0) + (row.tendered_change === 2 ? -Number(row.amount) : Number(row.amount)))
        const paymentSummary = [...paymentTotals].map(([id, amount]) => ({ paymentModeId: Number(id), paymentMode: modeNames.get(id) ?? 'Unknown', amount }))
        const gstTotals = new Map<number, { gstAmount: number; taxableAmount: number }>()
        for (const row of taxes) { const rate = Number(row.tax_percentage), value = gstTotals.get(rate) ?? { gstAmount: 0, taxableAmount: 0 }; value.gstAmount += Number(row.amount); value.taxableAmount += Number(row.tax_amount); gstTotals.set(rate, value) }
        const gstDetails = [...gstTotals].sort(([a], [b]) => a - b).map(([taxPercentage, value]) => ({ taxPercentage, ...value, total: value.gstAmount + value.taxableAmount }))
        const headNames = new Map(heads.map(row => [row.id, row.expense_head])), expenseDetails = expenses.filter(row => row.expense_type === 2).map(row => ({ name: headNames.get(row.expense_head_id) ?? 'Unknown', amount: Number(row.amount) })), incomeDetails = expenses.filter(row => row.expense_type === 1).map(row => ({ name: headNames.get(row.expense_head_id) ?? 'Unknown', amount: Number(row.amount) }))
        const totalExpense = expenseDetails.reduce((sum, row) => sum + row.amount, 0), totalIncome = incomeDetails.reduce((sum, row) => sum + row.amount, 0), userNames = new Map(users.map(row => [row.id, row.name])), userTotals = new Map<bigint, { totalBills: number; totalSales: number }>()
        for (const row of bills) if (row.user_id !== null) { const value = userTotals.get(row.user_id) ?? { totalBills: 0, totalSales: 0 }; value.totalBills += 1; value.totalSales += Number(row.net_amount); userTotals.set(row.user_id, value) }
        const userSummary = [...userTotals].map(([id, value]) => ({ id: Number(id), name: userNames.get(id) ?? 'Unknown', ...value }))
        const totalGstAmount = gstDetails.reduce((sum, row) => sum + row.gstAmount, 0), totalTaxable = gstDetails.reduce((sum, row) => sum + row.taxableAmount, 0)
        return { businessDetails: { name: business?.business_name ?? account.client.businessName, address: business?.address ?? account.client.address, mobile: business?.mobile ?? '', logo: business?.logo ?? account.client.logo ?? '' }, date: payload.date, totalSales, yesterdaySales, salesPercentage, totalBills: bills.length, paymentSummary, gstSummary: { details: gstDetails, totalGstAmount, totalTaxable, grandTotal: totalGstAmount + totalTaxable }, userSummary, expenses: { details: expenseDetails, totalExpense }, income: { details: incomeDetails, totalIncome }, collectionSummary: { sales: totalSales, income: totalIncome, expenses: totalExpense, netProfit: totalSales + totalIncome - totalExpense } }
      }
      case 'dayClose': return this.prisma.$transaction(async transaction => {
        const now = new Date(), range = dayRange(now)
        const [masters, transactions, payments, existingClose] = await Promise.all([
          transaction.billMaster.findMany({ where: { client_id: clientId } }),
          transaction.billTran.findMany({ where: { client_id: clientId } }),
          transaction.billPayments.findMany({ where: { client_id: clientId } }),
          transaction.dayCloseDetails.findFirst({ where: { client_id: clientId, day_close_date: range } }),
        ])
        if (masters.length) await transaction.prevBillMaster.createMany({ data: masters.map(({ id: _id, ...row }) => row) })
        if (transactions.length) await transaction.prevBillTran.createMany({ data: transactions.map(({ id: _id, ...row }) => row) })
        if (payments.length) await transaction.prevBillPayments.createMany({ data: payments.map(({ id: _id, ...row }) => row) })
        await transaction.billPayments.deleteMany({ where: { client_id: clientId } })
        await transaction.billTran.deleteMany({ where: { client_id: clientId } })
        await transaction.billMaster.deleteMany({ where: { client_id: clientId } })
        if (existingClose) await transaction.dayCloseDetails.update({ where: { id: existingClose.id }, data: { user_id: userId, day_close_date: now, updated_at: now } })
        else await transaction.dayCloseDetails.create({ data: { client_id: clientId, user_id: userId, day_close_date: now, created_at: now, updated_at: now } })
        await transaction.audits.create({ data: audit(account, 'Day end', 'Day closed', now) })
        return { billMasterCount: masters.length, billTranCount: transactions.length, billPaymentCount: payments.length, dayCloseDate: legacyTimestamp12(now), closedAt: now }
      }, { isolationLevel: 'Serializable' })
      case 'getBillFormats': { const client = await this.prisma.users.findFirst({ where: { id: clientId, status: 1, trash: 0 }, select: { business_type_id: true } }); return client?.business_type_id ? this.prisma.billFormats.findMany({ where: { business_type_id: client.business_type_id, status: 1, trash: 0 }, orderBy: { id: 'asc' } }) : [] }
    }
  }
}
