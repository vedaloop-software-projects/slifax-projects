import { billModeName, groupTaxBreakup, taxBreakupSummary } from './tax-summary.ts'
import { businessDate, closeBusinessDay, dayRange, businessParts, pendingDayCloses } from './day-close.ts'
import { ApiError } from '../../routes/auth/service.ts'
import type { Prisma, PrismaClient } from '@prisma/client'
import type { Account } from '../auth/contracts.ts'
import { allowsNegativeInventory, decrementVariantStock, syncProductQoh } from '../inventory/stock-policy.ts'
import { PrismaProductSearchStore } from '../product-search/prisma-store.ts'
import { lookupCandidates } from '../product/codes.ts'
import { legacyDate, legacyDecimal, legacyId, legacyRoundOff, legacyRow, legacyTimestamp, legacyTimestamp12 } from '../system/legacy-response.ts'
import { businessCalendarDay, businessClock, zonedTime } from '../system/business-time.ts'
import type { BillingOperation, BillingPayload, BillingStore } from './contracts.ts'

const number = (value: unknown, fallback = 0) => typeof value === 'number' ? value : fallback
const bigint = (value: unknown) => BigInt(number(value))
const string = (value: unknown) => typeof value === 'string' ? value : ''
const optionalId = (value: unknown) => typeof value === 'number' ? BigInt(value) : null
const date = (value?: unknown) => {
  if (typeof value !== 'string') return new Date()
  const [day, month, year] = value.split('-').map(Number)
  return zonedTime(year!, month!, day!)
}
// @db.Date columns keep the UTC calendar day, so pass the business date at UTC midnight.
const calendarDay = (value: Date) => businessCalendarDay(value)

// Must be called inside the bill-save transaction. A tenant lock serializes
// numbering even when there is no current bill row to lock after day close.
export async function nextBillNumber(transaction: Prisma.TransactionClient, clientId: bigint, now: Date, resetAtDayClose: boolean) {
  await transaction.$queryRaw`SELECT id FROM users WHERE id = ${clientId} FOR UPDATE`
  const where = { client_id: clientId, ...(resetAtDayClose ? { bill_date: dayRange(now) } : {}) }
  const [current, archived] = await Promise.all([
    transaction.billMaster.aggregate({ where, _max: { bill_num: true } }),
    transaction.prevBillMaster.aggregate({ where, _max: { bill_num: true } }),
  ])
  return Math.max(current._max.bill_num ?? 0, archived._max.bill_num ?? 0) + 1
}
// Offer dates are @db.Date values saved at UTC midnight of the calendar day; compare against today's business date
// the same way. Local midnight (18:30 UTC the day before, in India) hid every offer that starts today.
const businessToday = () => calendarDay(new Date())
// Happy hour times are wall-clock times saved on 1970-01-01 UTC.
const businessNowClock = () => businessClock()
// Refund lines (bill_mode 4) share temp_bill_tran with the sale cart but are kept apart: every
// operation reads, edits, saves and clears only the lines of its own flow.
const REFUND_MODE = 4
const saleLines = { bill_mode: { not: REFUND_MODE } }, refundLines = { bill_mode: REFUND_MODE }
const linesOf = (payload: BillingPayload) => number(payload.billMode) === REFUND_MODE ? refundLines : saleLines
// temp/bill scheme_type values, numbered as the Laravel billing stored them.
const SCHEME = { group: 1, item: 2, purchase: 3, billBuster: 4, happyHour: 6, groupHappyHour: 7, manual: 9 } as const
type Scheme = { schemeType: number | null; percentage: number; amount: number; freeProductId: bigint; freeVariantId: bigint; freeQty: number; salePrice: number }
const groupPairs = (product: { category_id: bigint | null; sub_category_id: bigint | null; brand_id: bigint | null }, variant: { colour_id: bigint | null; size_id: bigint | null }) => [
  ...(product.category_id ? [{ group_type: 1, group_id: product.category_id }] : []),
  ...(product.sub_category_id ? [{ group_type: 2, group_id: product.sub_category_id }] : []),
  ...(product.brand_id ? [{ group_type: 3, group_id: product.brand_id }] : []),
  ...(variant.colour_id ? [{ group_type: 4, group_id: variant.colour_id }] : []),
  ...(variant.size_id ? [{ group_type: 5, group_id: variant.size_id }] : []),
]
// A bill-buster offer on a line survives recalculation of that line's own offers while it is still the better deal.
const keepBillBuster = (row: { scheme_type: number | null; manual_discount_percentage: unknown; free_prod_id: bigint; free_variant_id: bigint; free_qty: unknown }, scheme: Scheme, gross: number): Scheme => {
  if (row.scheme_type !== SCHEME.billBuster) return scheme
  const percentage = Number(row.manual_discount_percentage), amount = Math.min(gross, gross * percentage / 100)
  const discounted = amount > scheme.amount ? { percentage, amount } : { percentage: scheme.percentage, amount: scheme.amount }
  return Number(row.free_qty) > 0
    ? { ...scheme, ...discounted, schemeType: SCHEME.billBuster, freeProductId: row.free_prod_id, freeVariantId: row.free_variant_id, freeQty: Number(row.free_qty) }
    : amount > scheme.amount ? { ...scheme, ...discounted, schemeType: SCHEME.billBuster } : scheme
}
const audit = (account: Account, type: string, description: string, now: Date) => ({ client_id: account.client.id, user_id: account.user.id, type, description, created_at: now, updated_at: now })

export class PrismaBillingStore implements BillingStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  private async eanProducts(clientId: bigint, search: string) {
    const result = await new PrismaProductSearchStore(this.prisma).search(clientId, search, 100)
    if (result.truncated) throw new Error('Search result limit exceeded.')
    const candidates = lookupCandidates(search)
    const rows = result.rows.filter(row => row.eanCode === search || candidates.includes(row.variantCode) || candidates.includes(row.productCode)).map(row => legacyRow(row as unknown as Record<string, unknown>))
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

  private async temp(clientId: bigint, userId: bigint, lines: typeof saleLines | typeof refundLines = saleLines) {
    const rows = await this.prisma.tempBillTran.findMany({ where: { client_id: clientId, user_id: userId, ...lines }, orderBy: { line_num: 'asc' } })
    const productIds = [...new Set(rows.flatMap(row => [row.product_id, ...(row.free_prod_id === 0n ? [] : [row.free_prod_id])]))]
    const variantIds = [...new Set(rows.flatMap(row => [...(row.variant_id ? [row.variant_id] : []), ...(row.free_variant_id === 0n ? [] : [row.free_variant_id])]))]
    const salesmanIds = [...new Set(rows.flatMap(row => row.sm_id ? [row.sm_id] : []))]
    const [products, variants, salesmen, productControls] = await Promise.all([
      this.prisma.products.findMany({ where: { client_id: clientId, id: { in: productIds } } }),
      this.prisma.productVariants.findMany({ where: { client_id: clientId, id: { in: variantIds } } }),
      this.prisma.salesMans.findMany({ where: { client_id: clientId, id: { in: salesmanIds } } }),
      this.prisma.productControls.findMany({ where: { client_id: clientId, product_id: { in: productIds } } }),
    ])
    const productMap = new Map(products.map(product => [product.id, product]))
    const variantMap = new Map(variants.map(variant => [variant.id, variant]))
    const salesmanMap = new Map(salesmen.map(salesman => [salesman.id, salesman]))
    const controlMap = new Map(productControls.map(control => [control.product_id, control]))
    return rows.flatMap(row => {
      const product = productMap.get(row.product_id)
      const variant = row.variant_id ? variantMap.get(row.variant_id) : undefined
      if (!product || !variant) return []
      const freeProduct = row.free_prod_id === 0n ? undefined : productMap.get(row.free_prod_id)
      const freeVariant = row.free_variant_id === 0n ? undefined : variantMap.get(row.free_variant_id)
      const salesman = row.sm_id ? salesmanMap.get(row.sm_id) : undefined
      const control = controlMap.get(row.product_id)
      return [{
        id: legacyId(row.id), productId: legacyId(row.product_id), variantId: legacyId(row.variant_id),
        productCode: product.product_code, productFullName: product.product_full_name, productShortName: product.product_short_name,
        eanCode: variant.ean_code, hsnCode: product.hsn_code, qty: legacyDecimal(row.qty, 3), packSize: variant.pack_size, mrp: legacyDecimal(row.mrp, 2),
        salePrice: legacyDecimal(row.sale_price, 3), priceOverride: legacyDecimal(row.price_override, 3), costPrice: legacyDecimal(row.cost_price, 3),
        lineNum: row.line_num, discountPercentage: legacyDecimal(row.manual_discount_percentage, 2), discountAmount: legacyDecimal(row.manual_discount_value, 2),
        gstPercentage: legacyDecimal(row.gst_percentage, 2), gstAmount: legacyDecimal(row.gst_amount, 3), schemeType: row.scheme_type,
        freeProductId: legacyId(row.free_prod_id), freeVariantId: legacyId(row.free_variant_id), freeQty: legacyDecimal(row.free_qty, 3),
        freeProductName: freeProduct?.product_full_name ?? null, freeProductShortName: freeProduct?.product_short_name ?? null,
        freeProductCode: freeProduct?.product_code ?? null, freeProductEanCode: freeVariant?.ean_code ?? null,
        freeVariantName: freeVariant?.pack_size ?? null, freePackSize: freeVariant?.pack_size ?? null,
        freeVariantMrp: freeVariant?.mrp ?? null, freeVariantSalePrice: freeVariant?.sale_price ?? null,
        allowWeighingScale: control?.allow_weighing_scale ?? 0, allowDecimals: control?.allow_decimals ?? 0,
        allowDiscount: control?.allow_discount ?? 0, allowPriceOverride: control?.allow_price_override ?? 0,
        kotRequired: control?.kot_required ?? 0, kit: control?.kit ?? 0,
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

  // A cashier's manual discount may not exceed their "Max. discount %" (client_users.max_discount_percentage),
  // as in the legacy Billing API. The primary admin (store owner) is not limited. A customer's own
  // discount (customers.discount) is allowed even when it is above the cashier's limit.
  private async assertDiscountAllowed(account: Account, gross: number, discount: number, customerId?: bigint | null) {
    if (account.user.isAdmin === 1 || discount <= 0 || gross <= 0) return
    const requested = discount * 100 / gross
    const user = await this.prisma.clientUsers.findFirst({ where: { id: account.user.id, client_id: account.client.id }, select: { max_discount_percentage: true } })
    const limit = Number(user?.max_discount_percentage ?? 0)
    const customer = customerId ? await this.prisma.customers.findFirst({ where: { id: customerId, client_id: account.client.id, trash: 0 }, select: { discount: true } }) : null
    const allowed = Math.max(limit, Number(customer?.discount ?? 0))
    // A paisa of rounding (value entered in rupees) is not a breach.
    if (requested > allowed + 0.005 && discount - gross * allowed / 100 > 0.01) throw new Error(`Discount percentage cannot exceed your maximum allowed user discount of ${Number(limit.toFixed(2))}%.`)
  }

  private gstAmount(gross: number, discount: number, rate: number, exclusive: boolean) {
    const taxable = Math.max(0, gross - discount)
    return rate <= 0 ? 0 : exclusive ? taxable * rate / 100 : taxable * rate / (100 + rate)
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

  private async productDetails(clientId: bigint, productId: bigint, variantId: bigint) {
    const found = await this.product(clientId, productId, variantId)
    if (!found) throw new Error('Product or variant not found.')
    const { product, variant } = found
    const today = businessToday()
    const pairs = groupPairs(product, variant)
    const [category, subCategory, brand, unitType, tax, size, colour, controls, groupDiscounts, itemDiscounts, purchaseDiscounts, directHappyChildren, groupHappyChildren] = await Promise.all([
      this.prisma.categories.findFirst({ where: { id: product.category_id, client_id: clientId, trash: 0 } }),
      product.sub_category_id ? this.prisma.subCategories.findFirst({ where: { id: product.sub_category_id, client_id: clientId, trash: 0 } }) : null,
      product.brand_id ? this.prisma.brands.findFirst({ where: { id: product.brand_id, client_id: clientId, trash: 0 } }) : null,
      product.unit_type_id ? this.prisma.unitTypes.findFirst({ where: { id: product.unit_type_id, client_id: clientId, trash: 0 } }) : null,
      this.prisma.taxes.findFirst({ where: { id: product.tax_id, client_id: clientId, trash: 0 } }),
      variant.size_id ? this.prisma.sizes.findFirst({ where: { id: variant.size_id, client_id: clientId, trash: 0 } }) : null,
      variant.colour_id ? this.prisma.colours.findFirst({ where: { id: variant.colour_id, client_id: clientId, trash: 0 } }) : null,
      this.prisma.productControls.findFirst({ where: { product_id: product.id, client_id: clientId } }),
      this.prisma.groupWiseDiscounts.findMany({ where: { client_id: clientId, status: 1, from_date: { lte: today }, to_date: { gte: today }, OR: pairs }, orderBy: { discount: 'desc' } }),
      this.prisma.itemWiseDiscounts.findMany({ where: { client_id: clientId, product_id: product.id, variant_id: variant.id, status: 1, from_date: { lte: today }, to_date: { gte: today } }, orderBy: { id: 'asc' } }),
      this.prisma.purchaseWiseDiscounts.findMany({ where: { client_id: clientId, product_id: product.id, variant_id: variant.id, status: 1, from_date: { lte: today }, to_date: { gte: today } }, orderBy: { id: 'asc' } }),
      // Happy-hour child rows list the products exempted from that happy hour.
      this.prisma.childHappyHours.findMany({ where: { client_id: clientId, product_id: product.id, variant_id: variant.id } }),
      this.prisma.childGroupWiseHappyHours.findMany({ where: { client_id: clientId, OR: pairs } }),
    ])
    const [freeProducts, freeVariants, purchaseChildren, happyHours, groupHappyHours] = await Promise.all([
      this.prisma.products.findMany({ where: { client_id: clientId, id: { in: [...new Set(itemDiscounts.flatMap(row => row.free_product_id === 0n ? [] : [row.free_product_id]))] } } }),
      this.prisma.productVariants.findMany({ where: { client_id: clientId, id: { in: [...new Set(itemDiscounts.flatMap(row => row.free_variant_id === 0n ? [] : [row.free_variant_id]))] } } }),
      this.prisma.childPurchaseWiseDiscounts.findMany({ where: { client_id: clientId, purchase_wise_discount_id: { in: purchaseDiscounts.map(row => row.id) } }, orderBy: { purchase_qty: 'asc' } }),
      this.prisma.happyHours.findMany({ where: { client_id: clientId, id: { notIn: directHappyChildren.map(row => row.happy_hour_id) }, status: 1, from_date: { lte: today }, to_date: { gte: today } } }),
      this.prisma.groupWiseHappyHours.findMany({ where: { client_id: clientId, id: { in: groupHappyChildren.map(row => row.group_wise_happy_hour_id) }, status: 1, from_date: { lte: today }, to_date: { gte: today } } }),
    ])
    const freeProductMap = new Map(freeProducts.map(row => [row.id, row]))
    const freeVariantMap = new Map(freeVariants.map(row => [row.id, row]))
    const groupName = (type: number) => type === 1 ? category?.category_name ?? '' : type === 2 ? subCategory?.sub_category_name ?? '' : type === 3 ? brand?.brand_name ?? '' : type === 4 ? colour?.colour_name ?? '' : type === 5 ? size?.size_name ?? '' : ''
    const time = (value: Date | null) => value ? new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: true }).format(value) : null
    return {
      product: {
        id: legacyId(product.id), productCode: product.product_code, productShortName: product.product_short_name, productFullName: product.product_full_name,
        categoryId: legacyId(product.category_id), categoryName: category?.category_name ?? '', subCategoryId: legacyId(product.sub_category_id), subCategoryName: subCategory?.sub_category_name ?? '',
        brandId: legacyId(product.brand_id), brandName: brand?.brand_name ?? '', unitTypeId: legacyId(product.unit_type_id), unitTypeName: unitType?.unit_type_name ?? '',
        taxId: legacyId(product.tax_id), taxName: tax?.tax_name ?? '', taxPercentage: Number(tax?.tax_percent ?? 0), qoh: product.qoh, hsnCode: product.hsn_code,
        productImage: product.product_image, status: product.status,
      },
      variant: {
        id: legacyId(variant.id), variantCode: variant.variant_code, eanCode: variant.ean_code, packSize: variant.pack_size,
        sizeId: legacyId(variant.size_id), sizeName: size?.size_name ?? '', colourId: legacyId(variant.colour_id), colourName: colour?.colour_name ?? '',
        basicCost: variant.basic_cost, costPrice: variant.cost_price, mrp: variant.mrp, salePrice: variant.sale_price, wholeSalePrice: variant.whole_sale_price,
        dineInPrice: variant.dine_in_price, takeAwayPrice: variant.take_away_price, salonDuration: variant.salon_duration, variantQty: variant.variant_qty, priority: variant.priority, status: variant.status,
      },
      controls: {
        allowWeighingScale: controls?.allow_weighing_scale ?? 0, allowDecimals: controls?.allow_decimals ?? 0, allowDiscount: controls?.allow_discount ?? 0,
        allowPriceOverride: controls?.allow_price_override ?? 0, kotRequired: controls?.kot_required ?? 0, kit: controls?.kit ?? 0,
      },
      promotions: {
        groupWise: groupDiscounts.map(row => ({ id: legacyId(row.id), groupType: row.group_type, groupId: legacyId(row.group_id), groupName: groupName(row.group_type), discount: Number(row.discount), fromDate: legacyDate(row.from_date), toDate: legacyDate(row.to_date), status: row.status })),
        itemWise: itemDiscounts.map(row => { const freeProduct = freeProductMap.get(row.free_product_id), freeVariant = freeVariantMap.get(row.free_variant_id); return { id: legacyId(row.id), purchaseQty: Number(row.purchase_qty), freeQty: Number(row.free_qty), discountPercentage: Number(row.discount_percentage), discountValue: Number(row.discount_value), fromDate: legacyDate(row.from_date), toDate: legacyDate(row.to_date), status: row.status, freeProduct: freeProduct ? { productId: legacyId(freeProduct.id), productShortName: freeProduct.product_short_name, productFullName: freeProduct.product_full_name, eanCode: freeVariant?.ean_code ?? null } : null, freeVariant: freeVariant ? { variantId: legacyId(freeVariant.id), variantCode: freeVariant.variant_code, packSize: freeVariant.pack_size, mrp: freeVariant.mrp, salePrice: freeVariant.sale_price } : null } }),
        purchaseWise: purchaseDiscounts.map(row => ({ id: legacyId(row.id), fromDate: legacyDate(row.from_date), toDate: legacyDate(row.to_date), status: row.status, purchaseDetails: purchaseChildren.filter(child => child.purchase_wise_discount_id === row.id).map(child => ({ purchaseQty: Number(child.purchase_qty), salePrice: Number(child.sale_price) })) })),
        happyHours: happyHours.map(row => ({ id: legacyId(row.id), happyHourName: row.happy_hour_name, discountPercentage: Number(row.discount_percentage), fromDate: legacyDate(row.from_date), toDate: legacyDate(row.to_date), fromTime: time(row.from_time), toTime: time(row.to_time), status: row.status })),
        groupWiseHappyHours: groupHappyChildren.flatMap(child => { const row = groupHappyHours.find(item => item.id === child.group_wise_happy_hour_id); return row ? [{ id: legacyId(row.id), happyHourName: row.happy_hour_name, groupType: child.group_type, groupId: legacyId(child.group_id), groupName: groupName(child.group_type), discountPercentage: Number(child.discount_percentage), fromDate: legacyDate(row.from_date), toDate: legacyDate(row.to_date), fromTime: time(row.from_time), toTime: time(row.to_time), status: row.status }] : [] }),
      },
    }
  }

  // Best automatic offer for one line, chosen the way the Laravel billing did:
  // - purchase-wise sets the price: before other offers when discount_on_discounted_items is on, otherwise only when no other offer applies;
  // - the largest of group-wise, item-wise and (with happy hours enabled) happy-hour and group-wise happy-hour discounts wins, earlier kinds on ties;
  // - an item-wise free product applies only when no offer gives a discount.
  // fixedPrice keeps basePrice (cashier overrides and re-evaluations of a line already priced).
  private async itemDiscount(clientId: bigint, productId: bigint, variantId: bigint, qty: number, basePrice: number, fixedPrice = false): Promise<Scheme> {
    const today = businessToday(), clock = businessNowClock(), active = { client_id: clientId, status: 1, from_date: { lte: today }, to_date: { gte: today } }
    const [product, variant, settings] = await Promise.all([
      this.prisma.products.findFirst({ where: { id: productId, client_id: clientId }, select: { category_id: true, sub_category_id: true, brand_id: true } }),
      this.prisma.productVariants.findFirst({ where: { id: variantId, client_id: clientId }, select: { colour_id: true, size_id: true } }),
      this.prisma.billingSettings.findFirst({ where: { client_id: clientId }, select: { happy_hours: true, discount_on_discounted_items: true } }),
    ])
    const pairs = product && variant ? groupPairs(product, variant) : [], happy = settings?.happy_hours === 1, open = { from_time: { lte: clock }, to_time: { gte: clock } }
    const [purchase, groups, items, happyHours, groupHappyChildren] = await Promise.all([
      this.prisma.purchaseWiseDiscounts.findFirst({ where: { ...active, product_id: productId, variant_id: variantId }, orderBy: { id: 'asc' } }),
      pairs.length ? this.prisma.groupWiseDiscounts.findMany({ where: { ...active, OR: pairs }, take: 100 }) : [],
      this.prisma.itemWiseDiscounts.findMany({ where: { ...active, product_id: productId, variant_id: variantId, purchase_qty: { lte: qty } }, orderBy: { id: 'asc' }, take: 100 }),
      happy ? this.prisma.happyHours.findMany({ where: { ...active, ...open }, take: 100 }) : [],
      happy && pairs.length ? this.prisma.childGroupWiseHappyHours.findMany({ where: { client_id: clientId, OR: pairs }, take: 500 }) : [],
    ])
    const [tier, exempt, liveGroupHappyHours] = await Promise.all([
      purchase ? this.prisma.childPurchaseWiseDiscounts.findFirst({ where: { client_id: clientId, purchase_wise_discount_id: purchase.id, purchase_qty: { lte: qty } }, orderBy: { purchase_qty: 'desc' } }) : null,
      happyHours.length ? this.prisma.childHappyHours.findMany({ where: { client_id: clientId, product_id: productId, variant_id: variantId, happy_hour_id: { in: happyHours.map(row => row.id) } }, select: { happy_hour_id: true } }) : [],
      groupHappyChildren.length ? this.prisma.groupWiseHappyHours.findMany({ where: { ...active, ...open, id: { in: [...new Set(groupHappyChildren.map(row => row.group_wise_happy_hour_id))] } }, select: { id: true } }) : [],
    ])
    const purchasePrice = tier ? Number(tier.sale_price) : null, discountsAfterPurchase = settings?.discount_on_discounted_items === 1
    const salePrice = !fixedPrice && discountsAfterPurchase && purchasePrice !== null ? purchasePrice : basePrice, gross = qty * salePrice
    const exempted = new Set(exempt.map(row => row.happy_hour_id)), groupHappy = new Set(liveGroupHappyHours.map(row => row.id))
    const offers = [
      ...groups.map(row => ({ schemeType: SCHEME.group, amount: gross * Number(row.discount) / 100 })),
      ...items.map(row => ({ schemeType: SCHEME.item, amount: Number(row.discount_percentage) > 0 ? gross * Number(row.discount_percentage) / 100 : Number(row.discount_value) })),
      ...happyHours.filter(row => !exempted.has(row.id)).map(row => ({ schemeType: SCHEME.happyHour, amount: gross * Number(row.discount_percentage) / 100 })),
      ...groupHappyChildren.filter(row => groupHappy.has(row.group_wise_happy_hour_id)).map(row => ({ schemeType: SCHEME.groupHappyHour, amount: gross * Number(row.discount_percentage) / 100 })),
    ]
    let best: Scheme = { schemeType: salePrice === basePrice ? null : SCHEME.purchase, percentage: 0, amount: 0, freeProductId: 0n, freeVariantId: 0n, freeQty: 0, salePrice }
    for (const offer of offers) {
      const amount = Math.min(gross, offer.amount)
      if (amount > best.amount) best = { ...best, schemeType: offer.schemeType, percentage: gross ? amount * 100 / gross : 0, amount }
    }
    if (best.amount > 0) return best
    for (const row of items) {
      if (Number(row.discount_percentage) > 0 || Number(row.discount_value) > 0 || row.free_product_id === 0n || Number(row.purchase_qty) <= 0) continue
      const freeQty = Math.floor(qty / Number(row.purchase_qty)) * Number(row.free_qty)
      if (freeQty > best.freeQty) best = { ...best, schemeType: SCHEME.item, freeProductId: row.free_product_id, freeVariantId: row.free_variant_id, freeQty }
    }
    if (best.freeQty > 0 || discountsAfterPurchase || purchasePrice === null) return best
    if (fixedPrice && Math.abs(basePrice - purchasePrice) > 1e-9) return best
    return { ...best, schemeType: SCHEME.purchase, salePrice: purchasePrice }
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
      return [{ id: legacyId(row.id), productId: legacyId(row.product_id), variantId: legacyId(row.variant_id), productCode: product.product_code, productFullName: product.product_full_name, productShortName: product.product_short_name, hsnCode: product.hsn_code, eanCode: variant.ean_code, qty: legacyDecimal(row.qty, 3), mrp: legacyDecimal(row.mrp, 2), salePrice: legacyDecimal(row.sale_price, 3), priceOverride: legacyDecimal(row.price_override, 3), costPrice: legacyDecimal(row.cost_price, 3), discountPercentage: legacyDecimal(row.manual_discount_percentage, 2), discountAmount: legacyDecimal(row.manual_discount_value, 2), gstPercentage: legacyDecimal(row.gst_percentage, 2), gstAmount: legacyDecimal(row.gst_amount, 3), packSize: variant.pack_size, unitTypeId: legacyId(product.unit_type_id), unitType: unit?.unit_type_name ?? null, sizeId: legacyId(variant.size_id), sizeName: size?.size_name ?? null, colourId: legacyId(variant.colour_id), colourName: colour?.colour_name ?? null, salesmanCode: salesman?.sm_code ?? null, salesmanName: salesman?.sm_name ?? null }]
    })
    const amountSaved = items.reduce((sum, row) => sum + Number(row.qty) * Number(row.mrp) - (Number(row.qty) * Number(row.priceOverride) - Number(row.discountAmount)), 0)
    const salesman = master.sm_id ? salesmanMap.get(master.sm_id) : undefined
    return {
      businessDetails: { name: business?.business_name ?? '', address: business?.address ?? '', mobile: business?.mobile ?? '', gstNo: business?.gst_number ?? '', logo: business?.logo ?? '' },
      customerDetails: { customerName: customer?.customer_name ?? '', mobile: customer?.mobile ?? '', address: customer?.address ?? '', gst: customer?.gst ?? '' },
      billDetails: { billNumber: master.bill_num, billDate: legacyTimestamp12(master.bill_date), subTotal: legacyDecimal(master.total_amount, 3), discountAmount: legacyDecimal(master.manual_discount_value, 2), subTotalAfterDiscount: legacyDecimal(master.sub_total_amount, 3), otherCharges: legacyDecimal(master.other_charges, 2), roundOff: legacyDecimal(master.round_off_value, 2), netAmount: legacyDecimal(master.net_amount, 3), gstAmount: legacyDecimal(master.gst_amount, 3), exclusiveNetAmount: legacyDecimal(master.exclusive_net_amount, 3), amountSaved, billMode: master.bill_mode, billModeName: billModeName(master.bill_mode), narration: master.narration, userId: legacyId(master.user_id), userName: user?.name ?? '', salesmanId: legacyId(master.sm_id), salesmanCode: salesman?.sm_code ?? '', salesmanName: salesman?.sm_name ?? '' },
      items,
      taxBreakup: groupTaxBreakup(taxes).map(row => ({ taxPercentage: legacyDecimal(row.taxPercentage, 2), gstAmount: legacyDecimal(row.gstAmount, 3), taxableAmount: legacyDecimal(row.taxableAmount, 3) })),
      payments: payments.map(row => ({ paymentModeId: legacyId(row.payment_mode_id), amount: legacyDecimal(row.amount, 3), tenderedChange: row.tendered_change, paymentMode: modeMap.get(row.payment_mode_id) ?? '' })),
      billSettings: { billPrefix: settings?.bill_prefix ?? '', billCaption: settings?.bill_caption ?? '', billFormatNumber: settings?.bill_format_number ?? '', companyLogoOnBills: settings?.company_logo_on_bills ?? 0, qrCodeInBill: settings?.qr_code_in_bill ?? 0, descriptions: descriptions.map(row => row.description ?? '') },
    }
  }

  private async putTemp(account: Account, payload: BillingPayload, refund = false) {
    const productId = bigint(payload.productId), variantId = bigint(payload.variantId), qty = number(payload.qty)
    const found = await this.product(account.client.id, productId, variantId)
    if (!found) throw new Error('Invalid product or variant.')
    const existing = await this.prisma.tempBillTran.findFirst({ where: { client_id: account.client.id, user_id: account.user.id, product_id: productId, variant_id: variantId, ...(refund ? refundLines : saleLines) } })
    const nextQty = existing ? Number(existing.qty) + qty : qty
    const salePrice = refund ? Number(payload.salePrice ?? found.variant.sale_price) : number(payload.customerType) === 2 ? found.variant.whole_sale_price : found.variant.sale_price
    const tax = await this.prisma.taxes.findFirst({ where: { id: found.product.tax_id, client_id: account.client.id, status: 1, trash: 0 } })
    if (!tax) throw new Error('Product tax configuration is unavailable.')
    const settings = await this.prisma.billingSettings.findFirst({ where: { client_id: account.client.id } })
    const gstPercentage = refund ? number(payload.gstPercentage, tax.tax_percent) : tax.tax_percent
    if (!refund && !await allowsNegativeInventory(this.prisma, account.client.id) && nextQty > Number(found.variant.variant_qty)) throw new ApiError(409, `Insufficient stock. Available: ${found.variant.variant_qty}; requested quantity: ${nextQty}.`)
    const offer = refund ? { schemeType: null, percentage: 0, amount: 0, freeProductId: 0n, freeVariantId: 0n, freeQty: 0, salePrice } : await this.itemDiscount(account.client.id, productId, variantId, nextQty, salePrice)
    const gross = nextQty * offer.salePrice, scheme = existing ? keepBillBuster(existing, offer, gross) : offer
    const taxable = gross - scheme.amount
    const gstAmount = settings?.exclusive_gst_billing === 1 ? taxable * gstPercentage / 100 : taxable * gstPercentage / (100 + gstPercentage)
    const now = new Date()
    if (existing) return this.prisma.tempBillTran.update({ where: { id: existing.id }, data: { qty: nextQty, sale_price: scheme.salePrice, price_override: salePrice, gst_percentage: gstPercentage, gst_amount: gstAmount, manual_discount_percentage: scheme.percentage, manual_discount_value: scheme.amount, scheme_type: scheme.schemeType, free_prod_id: scheme.freeProductId, free_variant_id: scheme.freeVariantId, free_qty: scheme.freeQty, updated_at: now } })
    const last = await this.prisma.tempBillTran.findFirst({ where: { client_id: account.client.id, user_id: account.user.id }, orderBy: { line_num: 'desc' } })
    return this.prisma.tempBillTran.create({ data: {
      client_id: account.client.id, user_id: account.user.id, product_id: productId, variant_id: variantId, qty,
      mrp: found.variant.mrp, sale_price: scheme.salePrice, price_override: salePrice,
      cost_price: found.variant.cost_price, line_num: (last?.line_num ?? 0) + 1,
      gst_percentage: gstPercentage, gst_amount: gstAmount, manual_discount_percentage: scheme.percentage, manual_discount_value: scheme.amount,
      scheme_type: scheme.schemeType, free_prod_id: scheme.freeProductId, free_variant_id: scheme.freeVariantId, free_qty: scheme.freeQty,
      sm_id: optionalId(payload.smId), bill_mode: number(payload.billMode, refund ? 4 : 1), created_at: now, updated_at: now,
    } })
  }

  // A bill-buster child with a discount discounts that product's line, adding the product when it is not on the bill yet.
  private async billBusterDiscount(account: Account, productId: bigint, variantId: bigint, percentage: number) {
    const where = { client_id: account.client.id, user_id: account.user.id, product_id: productId, variant_id: variantId, ...saleLines }
    const row = await this.prisma.tempBillTran.findFirst({ where }) ?? (await this.putTemp(account, { productId: Number(productId), variantId: Number(variantId), qty: 1, billMode: 1 }), await this.prisma.tempBillTran.findFirst({ where }))
    if (!row) throw new Error('Invalid free product.')
    const gross = Number(row.qty) * Number(row.sale_price), amount = Math.min(gross, gross * percentage / 100)
    if (amount <= Number(row.manual_discount_value)) return row
    const settings = await this.prisma.billingSettings.findFirst({ where: { client_id: account.client.id } })
    return this.prisma.tempBillTran.update({ where: { id: row.id }, data: { manual_discount_percentage: percentage, manual_discount_value: amount, gst_amount: this.gstAmount(gross, amount, Number(row.gst_percentage), settings?.exclusive_gst_billing === 1), scheme_type: SCHEME.billBuster, updated_at: new Date() } })
  }

  // Non-cancelled refund bills raised against one bill, live and archived.
  private async refundsAgainst(transaction: Prisma.TransactionClient, clientId: bigint, billNum: number, billDate: Date) {
    const day = calendarDay(billDate)
    // Refunds saved before calendarDay() stored the IST date one day early.
    const where = { client_id: clientId, bill_mode: 4, refund_against_bill_num: String(billNum), refund_against_bill_date: { in: [day, new Date(day.getTime() - 86_400_000)] } }
    const select = { bill_num: true, bill_date: true } as const
    const [live, archived] = await Promise.all([transaction.billMaster.findMany({ where, select }), transaction.prevBillMaster.findMany({ where, select })])
    return { live, archived }
  }

  // Quantity still refundable per variant: what the bill sold less refunds already saved against it.
  private async refundable(transaction: Prisma.TransactionClient, clientId: bigint, billNum: number, billDate: Date) {
    const scope = { client_id: clientId, bill_num: billNum, bill_date: dayRange(billDate) }
    const master = await transaction.billMaster.findFirst({ where: scope }) ?? await transaction.prevBillMaster.findFirst({ where: scope })
    if (!master || master.bill_mode === 5) throw new Error('Bill not found.')
    if (master.bill_mode === 4) throw new Error('Refund bills cannot be refunded again.')
    const lineScope = { client_id: clientId, bill_num: master.bill_num, bill_date: master.bill_date, void_flag: 0 }
    const lines = [...await transaction.billTran.findMany({ where: lineScope }), ...await transaction.prevBillTran.findMany({ where: lineScope })]
    // Highest price first, so a variant given free alongside its paid line refunds at the paid price and quantity.
    // `sold`, `discount` and `gst` total the original lines at that price, to price refunds per unit as paid.
    const sold = new Map<bigint, { qty: number; sold: number; discount: number; gst: number; line: (typeof lines)[number] }>()
    for (const line of lines.sort((a, b) => Number(b.sale_price) - Number(a.sale_price))) {
      if (!line.variant_id || Number(line.qty) <= 0) continue
      const entry = sold.get(line.variant_id), qty = Number(line.qty), discount = Number(line.manual_discount_value), gst = Number(line.gst_amount)
      if (!entry) sold.set(line.variant_id, { qty, sold: qty, discount, gst, line })
      else if (Number(line.sale_price) === Number(entry.line.sale_price)) { entry.qty += qty; entry.sold += qty; entry.discount += discount; entry.gst += gst }
    }
    const { live, archived } = await this.refundsAgainst(transaction, clientId, master.bill_num, master.bill_date)
    const refundScope = (masters: typeof live) => ({ client_id: clientId, void_flag: 0, OR: masters.map(row => ({ bill_num: row.bill_num, bill_date: row.bill_date })) })
    const refunded = [...(live.length ? await transaction.billTran.findMany({ where: refundScope(live) }) : []), ...(archived.length ? await transaction.prevBillTran.findMany({ where: refundScope(archived) }) : [])]
    for (const line of refunded) {
      const entry = line.variant_id ? sold.get(line.variant_id) : undefined
      if (entry) entry.qty -= Math.abs(Number(line.qty))
    }
    return sold
  }

  // One refund line per variant, priced as the customer paid on the original bill: its unit price, with the
  // line discount and GST shared out per unit. Adding without a quantity refunds everything still refundable;
  // the cashier may then set any quantity up to that (replace), and 0 removes the line.
  private async refundLine(account: Account, payload: BillingPayload, replace: boolean) {
    const clientId = account.client.id, userId = account.user.id
    const productId = bigint(payload.productId), variantId = bigint(payload.variantId)
    const where = { client_id: clientId, user_id: userId, product_id: productId, variant_id: variantId, ...refundLines }
    const [entry, existing] = await Promise.all([
      this.refundable(this.prisma, clientId, number(payload.billNumber), date(payload.billDate)).then(sold => sold.get(variantId)),
      this.prisma.tempBillTran.findFirst({ where }),
    ])
    if (!entry || entry.line.product_id !== productId) throw new ApiError(404, 'This product is not on the original bill.')
    const remaining = Math.max(0, Math.round(entry.qty * 1000) / 1000)
    const qty = payload.qty === undefined ? remaining : replace ? number(payload.qty) : Number(existing?.qty ?? 0) + number(payload.qty)
    if (qty > remaining + 1e-6) throw new ApiError(422, `Refund quantity exceeds the original bill. Remaining to refund: ${remaining}.`)
    const now = new Date(), summary = async () => this.tempSummary(await this.temp(clientId, userId, refundLines))
    if (qty <= 0) {
      if (remaining <= 0) throw new ApiError(422, 'This product has already been fully refunded.')
      if (existing) await this.prisma.tempBillTran.delete({ where: { id: existing.id } })
      return summary()
    }
    const original = entry.line, share = qty / entry.sold, cents = (value: number) => Math.round(value * 100) / 100
    const gross = qty * Number(original.sale_price), discount = cents(entry.discount * share)
    const data = {
      qty, mrp: original.mrp, sale_price: original.sale_price, price_override: original.sale_price, cost_price: original.cost_price,
      gst_percentage: original.gst_percentage, gst_amount: cents(entry.gst * share), manual_discount_value: discount, manual_discount_percentage: gross ? discount * 100 / gross : 0,
      scheme_type: null, free_prod_id: 0n, free_variant_id: 0n, free_qty: 0, void_flag: 0, bill_mode: REFUND_MODE, updated_at: now,
    }
    if (existing) await this.prisma.tempBillTran.update({ where: { id: existing.id }, data })
    else {
      const last = await this.prisma.tempBillTran.findFirst({ where: { client_id: clientId, user_id: userId }, orderBy: { line_num: 'desc' } })
      await this.prisma.tempBillTran.create({ data: { ...data, client_id: clientId, user_id: userId, product_id: productId, variant_id: variantId, line_num: (last?.line_num ?? 0) + 1, sm_id: null, created_at: now } })
    }
    return summary()
  }

  // Refund in the same ratio as the original bill's payments, net of cash change handed back.
  private async originalPaymentSplit(transaction: Prisma.TransactionClient, clientId: bigint, billNum: number, billDate: Date, total: number) {
    const scope = { client_id: clientId, bill_num: billNum, bill_date: dayRange(billDate) }
    const net = new Map<bigint, number>()
    for (const row of [...await transaction.billPayments.findMany({ where: scope }), ...await transaction.prevBillPayments.findMany({ where: scope })]) {
      net.set(row.payment_mode_id, (net.get(row.payment_mode_id) ?? 0) + (row.tendered_change === 2 ? -1 : 1) * Number(row.amount))
    }
    const modes = [...net].filter(([, amount]) => amount > 0), paid = modes.reduce((sum, [, amount]) => sum + amount, 0)
    if (!paid) throw new Error('Payment mode of the original bill was not found; choose a refund payment mode.')
    let left = Math.round(total * 100)
    return modes.map(([id, amount], index) => {
      const cents = index === modes.length - 1 ? left : Math.round(total * 100 * amount / paid)
      left -= cents
      return { paymentModeId: Number(id), amount: cents / 100 }
    }).filter(payment => payment.amount > 0)
  }

  // Cancelling reverses the bill's stock movement: sold quantities return to stock, a refund's returned quantities leave it again.
  private async cancelBill(account: Account, billNum: number, billDate: Date) {
    const clientId = account.client.id
    return this.prisma.$transaction(async transaction => {
      const bill = await transaction.billMaster.findFirst({ where: { client_id: clientId, bill_num: billNum, bill_date: dayRange(billDate), bill_mode: { not: 5 } } })
      if (!bill) throw new Error('Bill not found.')
      if (bill.bill_mode !== 4) {
        const refunds = await this.refundsAgainst(transaction, clientId, bill.bill_num, bill.bill_date)
        if (refunds.live.length || refunds.archived.length) throw new Error(`Bill ${bill.bill_num} already has refunds; cancel the refund bills first.`)
      }
      const now = new Date(), allowNegative = await allowsNegativeInventory(transaction, clientId)
      const lines = await transaction.billTran.findMany({ where: { client_id: clientId, bill_num: bill.bill_num, bill_date: bill.bill_date, void_flag: 0 } })
      for (const line of lines) {
        const qty = Number(line.qty)
        if (!line.variant_id || !qty) continue
        const restored = await transaction.productVariants.updateMany({ where: { id: line.variant_id, client_id: clientId, ...(qty < 0 && !allowNegative ? { variant_qty: { gte: -qty } } : {}) }, data: { variant_qty: { increment: qty }, updated_at: now } })
        if (!restored.count) throw new Error(qty < 0 ? 'Insufficient stock to cancel this refund.' : 'Product variant is unavailable.')
      }
      await syncProductQoh(transaction, clientId, lines.map(line => line.product_id))
      await transaction.billMaster.update({ where: { id: bill.id }, data: { bill_mode: 5, updated_at: now } })
      await transaction.audits.create({ data: audit(account, 'cancel', `Bill ${bill.bill_num} cancelled`, now) })
      const taxes = await transaction.taxBreakup.findMany({ where: { client_id: clientId, bill_num: bill.bill_num, bill_date: dayRange(bill.bill_date) } })
      return { cancelled: true, billNumber: bill.bill_num, billDate: legacyTimestamp12(bill.bill_date), previousBillMode: bill.bill_mode, billMode: 5, billModeName: billModeName(5), netAmount: legacyDecimal(bill.net_amount, 3), taxBreakup: groupTaxBreakup(taxes) }
    }, { isolationLevel: 'Serializable' })
  }

  private async save(account: Account, payload: BillingPayload, refund: boolean) {
    return this.prisma.$transaction(async transaction => {
      const settings = await transaction.billingSettings.findFirst({ where: { client_id: account.client.id } })
      const now = new Date()
      const billNo = await nextBillNumber(transaction, account.client.id, now, settings?.reset_bill_no_after_day_close === 1)
      if (await transaction.dayCloseDetails.findFirst({ where: { client_id: account.client.id, day_close_date: dayRange(now) } })) throw new ApiError(409, 'Day is closed. Billing resumes on the next business date.')
      const lines = refund ? refundLines : saleLines
      const items = await transaction.tempBillTran.findMany({ where: { client_id: account.client.id, user_id: account.user.id, void_flag: 0, ...lines }, orderBy: { line_num: 'asc' } })
      if (!items.length) throw new Error('No bill items found.')
      const variantIds = [...new Set(items.flatMap(item => [...(item.variant_id ? [item.variant_id] : []), ...(item.free_variant_id === 0n ? [] : [item.free_variant_id])]))]
      const variants = await transaction.productVariants.findMany({ where: { client_id: account.client.id, id: { in: variantIds }, status: 1, trash: 0 } })
      const variantMap = new Map(variants.map(variant => [variant.id, variant]))
      if (variants.length !== variantIds.length) throw new Error('A bill variant is unavailable.')
      if (refund) {
        const remaining = await this.refundable(transaction, account.client.id, number(payload.billNumber), date(payload.billDate))
        for (const item of items) {
          const entry = item.variant_id ? remaining.get(item.variant_id) : undefined
          if (!entry || Number(item.qty) > entry.qty + 1e-6) throw new Error('Refund quantity exceeds the original bill.')
        }
      }
      // A refund sent without payment modes is paid out in the same split as the original bill.
      const payments: Array<{ paymentModeId: number; amount: number; cashChange?: number }> = payload.paymentModes as typeof payments | undefined
        ?? await this.originalPaymentSplit(transaction, account.client.id, number(payload.billNumber), date(payload.billDate), number(payload.total))
      const paymentModes = await transaction.paymentModes.findMany({ where: { client_id: account.client.id, id: { in: payments.map(payment => BigInt(payment.paymentModeId)) }, status: 1, trash: 0 } })
      if (paymentModes.length !== new Set(payments.map(payment => payment.paymentModeId)).size) throw new Error('Invalid payment mode.')
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
      const master = await transaction.billMaster.create({ data: {
        client_id: account.client.id, bill_num: billNo, bill_date: now, user_id: account.user.id, sm_id: salesmanId,
        total_amount: subtotal, manual_discount_value: discount, manual_discount_percentage: subtotal ? discount * 100 / subtotal : 0,
        sub_total_amount: subtotal - discount, other_charges: charges, round_off_value: roundOff, net_amount: refund ? -total : total,
        gst_amount: refund ? -gst : gst, exclusive_net_amount: refund ? -(total - gst) : total - gst, bill_mode: refund ? 4 : number(payload.billMode, 1),
        refund_against_bill_num: refund ? String(payload.billNumber) : null, refund_against_bill_date: refund ? calendarDay(date(payload.billDate)) : null,
        customer_id: customerId, narration: typeof payload.narration === 'string' ? payload.narration : null, created_at: now, updated_at: now,
      } })
      await transaction.billTran.createMany({ data: items.flatMap(item => [{
        client_id: account.client.id, bill_num: billNo, bill_date: now, line_num: item.line_num, product_id: item.product_id,
        variant_id: item.variant_id, qty: refund ? -Number(item.qty) : item.qty, mrp: item.mrp, sale_price: item.sale_price,
        price_override: item.price_override, manual_discount_percentage: item.manual_discount_percentage,
        manual_discount_value: refund ? -Number(item.manual_discount_value) : item.manual_discount_value, void_flag: item.void_flag,
        bill_mode: refund ? 4 : item.bill_mode, gst_percentage: item.gst_percentage, gst_amount: refund ? -Number(item.gst_amount) : item.gst_amount,
        cost_price: item.cost_price, sm_id: item.sm_id || salesmanId, scheme_type: item.scheme_type, user_id: account.user.id, created_at: now, updated_at: now,
      }, ...(item.free_prod_id !== 0n && item.free_variant_id !== 0n && Number(item.free_qty) > 0 ? [{ client_id: account.client.id, bill_num: billNo, bill_date: now, line_num: item.line_num, product_id: item.free_prod_id, variant_id: item.free_variant_id, qty: refund ? -Number(item.free_qty) : item.free_qty, mrp: 0, sale_price: 0, price_override: 0, manual_discount_percentage: 0, manual_discount_value: 0, void_flag: item.void_flag, bill_mode: 4, gst_percentage: 0, gst_amount: 0, cost_price: variantMap.get(item.free_variant_id)?.cost_price ?? 0, sm_id: item.sm_id || salesmanId, scheme_type: item.scheme_type, user_id: account.user.id, created_at: now, updated_at: now }] : [])]) })
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
      await syncProductQoh(transaction, account.client.id, items.flatMap(item => [item.product_id, ...(item.free_prod_id === 0n ? [] : [item.free_prod_id])]))
      await transaction.tempBillTran.deleteMany({ where: { client_id: account.client.id, user_id: account.user.id, ...lines } })
      await transaction.audits.create({ data: audit(account, refund ? 'refund' : 'add', `${refund ? 'Refund' : 'Bill'} ${billNo} saved`, now) })
      const billMode = master.bill_mode
      const taxBreakup = [...taxes].sort(([a], [b]) => a - b).map(([taxPercentage, value]) => ({ taxPercentage, gstAmount: refund ? -value.gst : value.gst, taxableAmount: refund ? -value.taxable : value.taxable }))
      return { id: master.id, billNumber: billNo, billDate: now, total, billMode, billModeName: billModeName(billMode), taxBreakup }
    }, { isolationLevel: 'Serializable' })
  }

  async execute(operation: BillingOperation, account: Account, payload: BillingPayload): Promise<unknown> {
    const clientId = account.client.id, userId = account.user.id
    if (['addProductToTemp', 'updateTempProductQty', 'updateTempProductSalePrice', 'updateTempProductDiscount', 'updateManualDiscount', 'applyBillBuster', 'saveBill', 'saveRefundBill', 'addRefundProductToTemp', 'resumeSuspendedBill'].includes(operation) && await this.prisma.dayCloseDetails.findFirst({ where: { client_id: clientId, day_close_date: dayRange(new Date()) } })) throw new ApiError(409, 'Day is closed. Billing resumes on the next business date.')
    switch (operation) {
      case 'searchEanCode': {
        const search = string(payload.searchStr).replace(/\s/g, '')
        return this.eanProducts(clientId, search)
      }
      case 'getCustomerByMobile': return this.customerResponse(await this.prisma.customers.findFirst({ where: { client_id: clientId, mobile: string(payload.mobile), status: 1, trash: 0 } }))
      case 'addProductToTemp': {
        await this.putTemp(account, payload)
        return this.tempSummary(await this.temp(clientId, userId), number(payload.productId), number(payload.variantId))
      }
      case 'updateTempProductQty': {
        if (number(payload.billMode) === REFUND_MODE) return this.refundLine(account, payload, true)
        const row = await this.prisma.tempBillTran.findFirst({ where: { client_id: clientId, user_id: userId, product_id: bigint(payload.productId), variant_id: bigint(payload.variantId), ...saleLines } })
        if (!row) throw new Error('Temporary bill item not found.')
        const found = await this.product(clientId, row.product_id, row.variant_id!)
        if (!found) throw new Error('Product variant is unavailable.')
        const qty = number(payload.qty), settings = await this.prisma.billingSettings.findFirst({ where: { client_id: clientId } }), rate = Number(row.gst_percentage)
        if (!await allowsNegativeInventory(this.prisma, clientId) && qty > Number(found.variant.variant_qty)) throw new ApiError(409, `Insufficient stock. Available: ${found.variant.variant_qty}; requested quantity: ${qty}.`)
        const offer = await this.itemDiscount(clientId, row.product_id, row.variant_id!, qty, Number(row.price_override) || Number(row.sale_price)), gross = qty * offer.salePrice
        const scheme = keepBillBuster(row, offer, gross), taxable = gross - scheme.amount
        return this.prisma.tempBillTran.update({ where: { id: row.id }, data: { qty, sale_price: scheme.salePrice, gst_amount: settings?.exclusive_gst_billing === 1 ? taxable * rate / 100 : taxable * rate / (100 + rate), manual_discount_percentage: scheme.percentage, manual_discount_value: scheme.amount, scheme_type: scheme.schemeType, free_prod_id: scheme.freeProductId, free_variant_id: scheme.freeVariantId, free_qty: scheme.freeQty, updated_at: new Date() } })
      }
      case 'updateTempProductSalePrice': {
        const row = await this.prisma.tempBillTran.findFirst({ where: { client_id: clientId, user_id: userId, product_id: bigint(payload.productId), variant_id: bigint(payload.variantId), ...saleLines } })
        if (!row) throw new Error('Temporary bill item not found.')
        const price = number(payload.salePrice), settings = await this.prisma.billingSettings.findFirst({ where: { client_id: clientId } }), gross = Number(row.qty) * price, rate = Number(row.gst_percentage)
        const scheme = keepBillBuster(row, await this.itemDiscount(clientId, row.product_id, row.variant_id!, Number(row.qty), price, true), gross), taxable = gross - scheme.amount
        const gst = settings?.exclusive_gst_billing === 1 ? taxable * rate / 100 : taxable * rate / (100 + rate)
        return this.prisma.tempBillTran.update({ where: { id: row.id }, data: { sale_price: price, price_override: price, gst_amount: gst, manual_discount_percentage: scheme.percentage, manual_discount_value: scheme.amount, scheme_type: scheme.schemeType, free_prod_id: scheme.freeProductId, free_variant_id: scheme.freeVariantId, free_qty: scheme.freeQty, updated_at: new Date() } })
      }
      case 'clearTempBill': return { deleted: (await this.prisma.tempBillTran.deleteMany({ where: { client_id: clientId, user_id: userId, ...linesOf(payload) } })).count }
      case 'updateVoid': case 'updateTempProductDiscount': {
        const row = await this.prisma.tempBillTran.findFirst({ where: { client_id: clientId, user_id: userId, product_id: bigint(payload.productId), variant_id: bigint(payload.variantId), ...saleLines } })
        if (!row) throw new Error('Temporary bill item not found.')
        if (operation === 'updateVoid') return this.prisma.tempBillTran.update({ where: { id: row.id }, data: { void_flag: number(payload.voidFlag), updated_at: new Date() } })
        const gross = Number(row.qty) * Number(row.sale_price), requestedDiscount = payload.discountPercentage === undefined ? number(payload.discountValue) : gross * number(payload.discountPercentage) / 100
        if (requestedDiscount > gross) throw new Error('Discount exceeds item amount.')
        const automatic = keepBillBuster(row, await this.itemDiscount(clientId, row.product_id, row.variant_id!, Number(row.qty), Number(row.sale_price), true), gross)
        // Automatic offers are not the cashier's discount; only a larger manual one is checked.
        if (requestedDiscount > automatic.amount) await this.assertDiscountAllowed(account, gross, requestedDiscount)
        const discount = Math.max(requestedDiscount, automatic.amount)
        if (automatic.amount >= requestedDiscount) return this.prisma.tempBillTran.update({ where: { id: row.id }, data: { manual_discount_percentage: automatic.percentage, manual_discount_value: automatic.amount, scheme_type: automatic.schemeType, free_prod_id: automatic.freeProductId, free_variant_id: automatic.freeVariantId, free_qty: automatic.freeQty, gst_amount: this.gstAmount(gross, automatic.amount, Number(row.gst_percentage), (await this.prisma.billingSettings.findFirst({ where: { client_id: clientId } }))?.exclusive_gst_billing === 1), updated_at: new Date() } })
        const settings = await this.prisma.billingSettings.findFirst({ where: { client_id: clientId } })
        return this.prisma.tempBillTran.update({ where: { id: row.id }, data: { manual_discount_percentage: gross ? discount * 100 / gross : 0, manual_discount_value: discount, gst_amount: this.gstAmount(gross, discount, Number(row.gst_percentage), settings?.exclusive_gst_billing === 1), scheme_type: SCHEME.manual, free_prod_id: 0n, free_variant_id: 0n, free_qty: 0, updated_at: new Date() } })
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
        const now = new Date(), year = Number(businessParts(now).year)
        const yearStart = zonedTime(year, 1, 1), yearEnd = zonedTime(year + 1, 1, 1)
        const last = await transaction.suspendedItems.findFirst({ where: { client_id: clientId, suspended_date: { gte: yearStart, lt: yearEnd } }, orderBy: { id: 'desc' } })
        const running = last ? Number(last.suspended_number.split('_')[2] ?? 0) + 1 : 1
        const suspendedNumber = `${year}_${clientId}_${running}`
        await transaction.suspendedItems.createMany({ data: rows.map(row => ({ client_id: clientId, user_id: userId, suspended_number: suspendedNumber, suspended_date: now, line_num: row.line_num, product_id: row.product_id, variant_id: row.variant_id, qty: row.qty, void_flag: row.void_flag, sm_id: row.sm_id, customer_name: typeof payload.customerName === 'string' ? payload.customerName : null, customer_mobile: typeof payload.customerMobile === 'string' ? payload.customerMobile : null, created_at: now, updated_at: now })) })
        await transaction.tempBillTran.deleteMany({ where: { client_id: clientId, user_id: userId, ...saleLines } }); return { suspendedNumber, itemsCount: rows.length }
      })
      case 'getProductDetails': return this.productDetails(clientId, bigint(payload.productId), bigint(payload.variantId))
      case 'getSuspendedItems': return this.suspended(clientId, payload.searchStr ? string(payload.searchStr) : undefined)
      case 'resumeSuspendedBill': return this.prisma.$transaction(async transaction => {
        const suspended = await transaction.suspendedItems.findMany({ where: { client_id: clientId, suspended_number: string(payload.suspendedNumber) }, orderBy: { line_num: 'asc' } }); if (!suspended.length) throw new Error('Suspended bill not found.')
        if (await transaction.tempBillTran.count({ where: { client_id: clientId, user_id: userId, ...saleLines } })) throw new Error('Clear the current bill before resuming.')
        const variants = await transaction.productVariants.findMany({ where: { client_id: clientId, id: { in: suspended.flatMap(row => row.variant_id ? [row.variant_id] : []) }, status: 1, trash: 0 } }); const map = new Map(variants.map(v => [v.id, v])); if (variants.length !== suspended.length) throw new Error('A suspended product is unavailable.')
        const now = new Date(); await transaction.tempBillTran.createMany({ data: suspended.map(row => { const variant = map.get(row.variant_id!)!; return { client_id: clientId, user_id: userId, product_id: row.product_id, variant_id: row.variant_id, qty: row.qty, mrp: variant.mrp, sale_price: variant.sale_price, cost_price: variant.cost_price, line_num: row.line_num, void_flag: row.void_flag, sm_id: row.sm_id, created_at: now, updated_at: now } }) }); await transaction.suspendedItems.deleteMany({ where: { client_id: clientId, suspended_number: string(payload.suspendedNumber) } }); return { resumed: suspended.length }
      })
      case 'getTempBillItems': {
        const lines = linesOf(payload), summary = this.tempSummary(await this.temp(clientId, userId, lines))
        if (lines !== refundLines) return summary
        // The refund payable, computed exactly as saveRefundBill checks it, so the app never recalculates it.
        const settings = await this.prisma.billingSettings.findFirst({ where: { client_id: clientId } })
        return { ...summary, total: Math.round((summary.subTotal - summary.totalDiscount + (settings?.exclusive_gst_billing === 1 ? summary.totalGst : 0)) * 1000) / 1000 }
      }
      case 'getTempBillItem': return this.tempSummary(await this.temp(clientId, userId), number(payload.productId), number(payload.variantId))
      case 'updateManualDiscount': {
        const rows = await this.prisma.tempBillTran.findMany({ where: { client_id: clientId, user_id: userId, void_flag: 0, ...saleLines } }); if (!rows.length) throw new Error('No bill items found.')
        const gross = rows.reduce((sum, row) => sum + Number(row.qty) * Number(row.sale_price), 0), manualDiscount = payload.discountPercentage === undefined ? number(payload.discountValue) : gross * number(payload.discountPercentage) / 100; if (manualDiscount > gross) throw new Error('Discount exceeds bill amount.')
        await this.assertDiscountAllowed(account, gross, manualDiscount, payload.customerId ? bigint(payload.customerId) : null)
        const settings = await this.prisma.billingSettings.findFirst({ where: { client_id: clientId } })
        const automatic = await Promise.all(rows.map(async row => {
          const scheme = keepBillBuster(row, await this.itemDiscount(clientId, row.product_id, row.variant_id!, Number(row.qty), Number(row.sale_price), true), Number(row.qty) * Number(row.sale_price))
          if (row.scheme_type !== SCHEME.manual && Number(row.manual_discount_value) > scheme.amount) return { ...scheme, amount: Number(row.manual_discount_value), percentage: Number(row.manual_discount_percentage), schemeType: row.scheme_type, freeProductId: row.free_prod_id, freeVariantId: row.free_variant_id, freeQty: Number(row.free_qty) }
          return scheme
        }))
        await this.prisma.$transaction(rows.map((row, index) => {
          const rowGross = Number(row.qty) * Number(row.sale_price), scheme = automatic[index]!
          const manualShare = Math.min(rowGross, gross ? manualDiscount * rowGross / gross : 0)
          const useManualDiscount = manualShare > scheme.amount
          const appliedDiscount = Math.max(manualShare, scheme.amount)
          return this.prisma.tempBillTran.update({ where: { id: row.id }, data: {
            manual_discount_percentage: rowGross ? appliedDiscount * 100 / rowGross : 0, manual_discount_value: appliedDiscount,
            gst_amount: this.gstAmount(rowGross, appliedDiscount, Number(row.gst_percentage), settings?.exclusive_gst_billing === 1),
            // A bill discount replaces line offers, but a bill-buster free product already granted stays on its line.
            scheme_type: useManualDiscount ? SCHEME.manual : scheme.schemeType,
            free_prod_id: useManualDiscount && scheme.schemeType !== SCHEME.billBuster ? 0n : scheme.freeProductId, free_variant_id: useManualDiscount && scheme.schemeType !== SCHEME.billBuster ? 0n : scheme.freeVariantId,
            free_qty: useManualDiscount && scheme.schemeType !== SCHEME.billBuster ? 0 : scheme.freeQty, updated_at: new Date(),
          } })
        }))
        return { discount: rows.reduce((sum, row, index) => sum + Math.max(automatic[index]!.amount, gross ? manualDiscount * Number(row.qty) * Number(row.sale_price) / gross : 0), 0) }
      }
      case 'clearManualDiscount': {
        const rows = await this.prisma.tempBillTran.findMany({ where: { client_id: clientId, user_id: userId, void_flag: 0, ...saleLines } })
        const settings = await this.prisma.billingSettings.findFirst({ where: { client_id: clientId } })
        const automatic = await Promise.all(rows.map(async row => {
          const scheme = keepBillBuster(row, await this.itemDiscount(clientId, row.product_id, row.variant_id!, Number(row.qty), Number(row.sale_price), true), Number(row.qty) * Number(row.sale_price))
          if (row.scheme_type !== SCHEME.manual && Number(row.manual_discount_value) > scheme.amount) return { ...scheme, amount: Number(row.manual_discount_value), percentage: Number(row.manual_discount_percentage), schemeType: row.scheme_type, freeProductId: row.free_prod_id, freeVariantId: row.free_variant_id, freeQty: Number(row.free_qty) }
          return scheme
        }))
        await this.prisma.$transaction(rows.map((row, index) => {
          const gross = Number(row.qty) * Number(row.sale_price), scheme = automatic[index]!
          return this.prisma.tempBillTran.update({ where: { id: row.id }, data: {
            manual_discount_percentage: scheme.percentage, manual_discount_value: scheme.amount,
            gst_amount: this.gstAmount(gross, scheme.amount, Number(row.gst_percentage), settings?.exclusive_gst_billing === 1),
            scheme_type: scheme.schemeType, free_prod_id: scheme.freeProductId, free_variant_id: scheme.freeVariantId, free_qty: scheme.freeQty, updated_at: new Date(),
          } })
        }))
        return { updated: rows.length }
      }
      case 'getFreeProductDetails': return (await this.temp(clientId, userId))
        .filter(row => Number(row.freeQty) > 0)
        .map(row => ({ ...row, mrp: row.freeVariantMrp, salePrice: row.freeVariantSalePrice }))
      case 'saveBill': return this.save(account, payload, false)
      case 'getApplicableBillBuster': {
        const today = businessToday()
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
        const productId = bigint(payload.productId), variantId = bigint(payload.variantId), freeQty = number(payload.freeQty ?? payload.qty), percentage = number(payload.discountPercentage)
        if (freeQty === 0 && percentage > 0) return this.billBusterDiscount(account, productId, variantId, percentage)
        const found = await this.product(clientId, productId, variantId); if (!found) throw new Error('Invalid free product.')
        if (!await allowsNegativeInventory(this.prisma, clientId) && freeQty > Number(found.variant.variant_qty)) throw new ApiError(409, 'Insufficient stock for the free bill-buster product.')
        // Each free bill-buster product rides on its own line: the newest line not already carrying a different free product.
        const rows = await this.prisma.tempBillTran.findMany({ where: { client_id: clientId, user_id: userId, void_flag: 0, ...saleLines }, orderBy: { line_num: 'desc' } }); if (!rows.length) throw new Error('No bill items found.')
        const row = rows.find(item => item.free_prod_id === productId && item.free_variant_id === variantId && item.scheme_type === SCHEME.billBuster) ?? rows.find(item => item.scheme_type !== SCHEME.billBuster || Number(item.free_qty) === 0)
        if (!row) throw new Error('No bill line is free to hold another bill-buster product.')
        return this.prisma.tempBillTran.update({ where: { id: row.id }, data: { free_prod_id: productId, free_variant_id: variantId, free_qty: freeQty, scheme_type: SCHEME.billBuster, updated_at: new Date() } })
      }
      case 'overingBill': return this.cancelBill(account, number(payload.billNo), date(payload.billDate))
      case 'checkRefundBill': {
        const where = { client_id: clientId, bill_num: number(payload.billNo), bill_date: dayRange(date(payload.billDate)), bill_mode: { not: 5 } }
        const bill = await this.prisma.billMaster.findFirst({ where }) ?? await this.prisma.prevBillMaster.findFirst({ where }); if (!bill) throw new Error('Bill not found.'); return bill
      }
      case 'addRefundProductToTemp': return this.refundLine(account, payload, false)
      case 'saveRefundBill': return this.save(account, payload, true)
      case 'getPrint': {
        if (payload.latest === true) {
          const query = { where: { client_id: clientId, user_id: userId, bill_mode: payload.billMode === undefined ? 1 : number(payload.billMode) }, orderBy: [{ created_at: 'desc' as const }, { id: 'desc' as const }], select: { bill_num: true, bill_date: true, created_at: true } }
          const candidates = await Promise.all([this.prisma.billMaster.findFirst(query), this.prisma.prevBillMaster.findFirst(query)])
          const latest = candidates.filter(row => row !== null).sort((a, b) => (b.created_at ?? b.bill_date).getTime() - (a.created_at ?? a.bill_date).getTime() || b.bill_num - a.bill_num)[0]
          if (!latest) throw new ApiError(404, 'No saved bills found for your account.')
          return this.printBill(clientId, latest.bill_num, latest.bill_date)
        }
        return this.printBill(clientId, number(payload.billNumber, Number(payload.billNumber)), date(payload.billDate))
      }
      case 'getDayCloseReport': {
        const target = date(payload.date), range = dayRange(target), yesterday = new Date(target.getTime() - 86_400_000)
        const salesWhere = { client_id: clientId, bill_date: range, bill_mode: 1 }, everyModeWhere = { client_id: clientId, bill_date: range }
        const yesterdayWhere = { client_id: clientId, bill_date: dayRange(yesterday), bill_mode: 1 }
        const [currentModes, archivedModes] = await Promise.all([
          this.prisma.billMaster.findMany({ where: everyModeWhere, select: { bill_num: true, bill_date: true, bill_mode: true } }),
          this.prisma.prevBillMaster.findMany({ where: everyModeWhere, select: { bill_num: true, bill_date: true, bill_mode: true } }),
        ])
        const [currentBills, archivedBills, currentYesterday, archivedYesterday, currentPayments, archivedPayments, paymentModes, taxes, expenses, heads, users, business] = await Promise.all([
          this.prisma.billMaster.findMany({ where: salesWhere, select: { bill_num: true, bill_date: true, user_id: true, net_amount: true } }),
          this.prisma.prevBillMaster.findMany({ where: salesWhere, select: { bill_num: true, bill_date: true, user_id: true, net_amount: true } }),
          this.prisma.billMaster.findMany({ where: yesterdayWhere, select: { net_amount: true } }),
          this.prisma.prevBillMaster.findMany({ where: yesterdayWhere, select: { net_amount: true } }),
          this.prisma.billPayments.findMany({ where: { client_id: clientId, bill_date: range }, select: { bill_num: true, bill_date: true, payment_mode_id: true, amount: true, tendered_change: true } }),
          this.prisma.prevBillPayments.findMany({ where: { client_id: clientId, bill_date: range }, select: { bill_num: true, bill_date: true, payment_mode_id: true, amount: true, tendered_change: true } }),
          this.prisma.paymentModes.findMany({ where: { client_id: clientId }, select: { id: true, payment_mode: true } }),
          this.prisma.taxBreakup.findMany({ where: { client_id: clientId, bill_date: range }, select: { bill_num: true, bill_date: true, tax_percentage: true, amount: true, tax_amount: true } }),
          this.prisma.expenses.findMany({ where: { client_id: clientId, transaction_date: { gte: new Date(`${businessParts(target).year}-${businessParts(target).month}-${businessParts(target).day}T00:00:00Z`), lt: new Date(new Date(`${businessParts(target).year}-${businessParts(target).month}-${businessParts(target).day}T00:00:00Z`).getTime()+86_400_000) }, status: 1, trash: 0 }, select: { expense_head_id: true, expense_type: true, amount: true } }),
          this.prisma.expenseHeads.findMany({ where: { client_id: clientId, trash: 0 }, select: { id: true, expense_head: true } }),
          this.prisma.clientUsers.findMany({ where: { client_id: clientId, trash: 0 }, select: { id: true, name: true } }),
          this.prisma.users.findFirst({ where: { id: clientId }, select: { business_name: true, address: true, mobile: true, logo: true } }),
        ])
        const bills = [...currentBills, ...archivedBills], totalSales = bills.reduce((sum, row) => sum + Number(row.net_amount), 0)
        const yesterdaySales = [...currentYesterday, ...archivedYesterday].reduce((sum, row) => sum + Number(row.net_amount), 0)
        const salesPercentage = yesterdaySales ? Math.round(((totalSales - yesterdaySales) * 100 / yesterdaySales) * 100) / 100 : 0
        const activeBillKeys = new Set(bills.map(row => `${row.bill_num}:${row.bill_date.toISOString().slice(0, 10)}`))
        const modeNames = new Map(paymentModes.map(row => [row.id, row.payment_mode])), paymentTotals = new Map<bigint, number>()
        for (const row of [...currentPayments, ...archivedPayments]) if (activeBillKeys.has(`${row.bill_num}:${row.bill_date.toISOString().slice(0, 10)}`)) paymentTotals.set(row.payment_mode_id, (paymentTotals.get(row.payment_mode_id) ?? 0) + (row.tendered_change === 2 ? -Number(row.amount) : Number(row.amount)))
        const paymentSummary = [...paymentTotals].map(([id, amount]) => ({ paymentModeId: Number(id), paymentMode: modeNames.get(id) ?? 'Unknown', amount }))
        const gstTotals = new Map<number, { gstAmount: number; taxableAmount: number }>()
        for (const row of taxes) if (activeBillKeys.has(`${row.bill_num}:${row.bill_date.toISOString().slice(0, 10)}`)) { const rate = Number(row.tax_percentage), value = gstTotals.get(rate) ?? { gstAmount: 0, taxableAmount: 0 }; value.gstAmount += Number(row.amount); value.taxableAmount += Number(row.tax_amount); gstTotals.set(rate, value) }
        const billKey = (row: { bill_num: number; bill_date: Date }) => `${row.bill_num}:${row.bill_date.toISOString().slice(0, 10)}`
        const modeOf = new Map([...currentModes, ...archivedModes].map(row => [billKey(row), Number(row.bill_mode ?? 1)])), modeTaxes = new Map<number, typeof taxes>()
        for (const row of taxes) { const mode = modeOf.get(billKey(row)); if (mode === undefined) continue; modeTaxes.set(mode, [...(modeTaxes.get(mode) ?? []), row]) }
        const taxByBillMode = [...modeTaxes].sort(([a], [b]) => a - b).map(([billMode, rows]) => ({ billMode, billModeName: billModeName(billMode), billCount: [...modeOf.values()].filter(mode => mode === billMode).length, ...taxBreakupSummary(groupTaxBreakup(rows)) }))
        const gstDetails = [...gstTotals].sort(([a], [b]) => a - b).map(([taxPercentage, value]) => ({ taxPercentage, ...value, total: value.gstAmount + value.taxableAmount }))
        const headNames = new Map(heads.map(row => [row.id, row.expense_head])), expenseDetails = expenses.filter(row => row.expense_type === 2).map(row => ({ name: headNames.get(row.expense_head_id) ?? 'Unknown', amount: Number(row.amount) })), incomeDetails = expenses.filter(row => row.expense_type === 1).map(row => ({ name: headNames.get(row.expense_head_id) ?? 'Unknown', amount: Number(row.amount) }))
        const totalExpense = expenseDetails.reduce((sum, row) => sum + row.amount, 0), totalIncome = incomeDetails.reduce((sum, row) => sum + row.amount, 0), userNames = new Map(users.map(row => [row.id, row.name])), userTotals = new Map<bigint, { totalBills: number; totalSales: number }>()
        for (const row of bills) if (row.user_id !== null) { const value = userTotals.get(row.user_id) ?? { totalBills: 0, totalSales: 0 }; value.totalBills += 1; value.totalSales += Number(row.net_amount); userTotals.set(row.user_id, value) }
        const userSummary = [...userTotals].map(([id, value]) => ({ id: Number(id), name: userNames.get(id) ?? 'Unknown', ...value }))
        const totalGstAmount = gstDetails.reduce((sum, row) => sum + row.gstAmount, 0), totalTaxable = gstDetails.reduce((sum, row) => sum + row.taxableAmount, 0)
        return { businessDetails: { name: business?.business_name ?? account.client.businessName, address: business?.address ?? account.client.address, mobile: business?.mobile ?? '', logo: business?.logo ?? account.client.logo ?? '' }, date: payload.date, dayClosed: Boolean(await this.prisma.dayCloseDetails.findFirst({ where: { client_id: clientId, day_close_date: range } })), totalSales, yesterdaySales, salesPercentage, totalBills: bills.length, paymentSummary, gstSummary: { details: gstDetails, totalGstAmount, totalTaxable, grandTotal: totalGstAmount + totalTaxable }, taxByBillMode, userSummary, expenses: { details: expenseDetails, totalExpense }, income: { details: incomeDetails, totalIncome }, collectionSummary: { sales: totalSales, income: totalIncome, expenses: totalExpense, netProfit: totalSales + totalIncome - totalExpense } }
      }
      case 'dayClose': {
        const target = typeof payload.date === 'string' ? businessDate(payload.date) : new Date()
        const result = await closeBusinessDay(this.prisma, { clientId, userId, auditDescription: `Day closed (${typeof payload.date === 'string' ? payload.date : 'today'})` }, target)
        return { ...result, dayCloseDate: legacyTimestamp12(result.closedAt) }
      }
      case 'getPendingDayCloses': return { pendingDates: await pendingDayCloses(this.prisma, clientId) }
      case 'getBillFormats': { const client = await this.prisma.users.findFirst({ where: { id: clientId, status: 1, trash: 0 }, select: { business_type_id: true } }); return client?.business_type_id ? this.prisma.billFormats.findMany({ where: { business_type_id: client.business_type_id, status: 1, trash: 0 }, orderBy: { id: 'asc' } }) : [] }
    }
  }
}
