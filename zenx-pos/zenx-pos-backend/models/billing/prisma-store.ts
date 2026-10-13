import type { PrismaClient } from '@prisma/client'
import type { Account } from '../auth/contracts.ts'
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
const dayRange = (value: Date) => ({ gte: new Date(value.getFullYear(), value.getMonth(), value.getDate()), lt: new Date(value.getFullYear(), value.getMonth(), value.getDate() + 1) })
const audit = (account: Account, type: string, description: string, now: Date) => ({ client_id: account.client.id, user_id: account.user.id, type, description, created_at: now, updated_at: now })

export class PrismaBillingStore implements BillingStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  private async temp(clientId: bigint, userId: bigint) {
    const rows = await this.prisma.tempBillTran.findMany({ where: { client_id: clientId, user_id: userId }, orderBy: { line_num: 'asc' } })
    const products = await this.prisma.products.findMany({ where: { client_id: clientId, id: { in: rows.map(row => row.product_id) } } })
    const variants = await this.prisma.productVariants.findMany({ where: { client_id: clientId, id: { in: rows.flatMap(row => row.variant_id ? [row.variant_id] : []) } } })
    const productMap = new Map(products.map(product => [product.id, product]))
    const variantMap = new Map(variants.map(variant => [variant.id, variant]))
    return rows.map(row => ({
      id: row.id, productId: row.product_id, variantId: row.variant_id, lineNum: row.line_num,
      productName: productMap.get(row.product_id)?.product_full_name ?? '', packSize: row.variant_id ? variantMap.get(row.variant_id)?.pack_size ?? '' : '',
      qty: Number(row.qty), mrp: Number(row.mrp), salePrice: Number(row.sale_price), priceOverride: Number(row.price_override),
      gstPercentage: Number(row.gst_percentage), gstAmount: Number(row.gst_amount), discountPercentage: Number(row.manual_discount_percentage),
      discountValue: Number(row.manual_discount_value), voidFlag: row.void_flag, billMode: row.bill_mode, freeProductId: row.free_prod_id,
      freeVariantId: row.free_variant_id, freeQty: Number(row.free_qty), costPrice: Number(row.cost_price), salesmanId: row.sm_id,
    }))
  }

  private async product(clientId: bigint, productId: bigint, variantId: bigint) {
    const [product, variant] = await Promise.all([
      this.prisma.products.findFirst({ where: { id: productId, client_id: clientId, status: 1, trash: 0 } }),
      this.prisma.productVariants.findFirst({ where: { id: variantId, product_id: productId, client_id: clientId, status: 1, trash: 0 } }),
    ])
    return product && variant ? { product, variant } : null
  }

  private async putTemp(account: Account, payload: BillingPayload, refund = false) {
    const productId = bigint(payload.productId), variantId = bigint(payload.variantId), qty = number(payload.qty)
    const found = await this.product(account.client.id, productId, variantId)
    if (!found) throw new Error('Invalid product or variant.')
    const existing = await this.prisma.tempBillTran.findFirst({ where: { client_id: account.client.id, user_id: account.user.id, product_id: productId, variant_id: variantId } })
    const nextQty = existing ? Number(existing.qty) + qty : qty
    if (!refund && nextQty > found.variant.variant_qty) throw new Error(`Insufficient stock. Available: ${found.variant.variant_qty}; requested cart quantity: ${nextQty}.`)
    const salePrice = refund ? Number(payload.salePrice ?? found.variant.sale_price) : number(payload.customerType) === 2 ? found.variant.whole_sale_price : found.variant.sale_price
    const tax = await this.prisma.taxes.findFirst({ where: { id: found.product.tax_id, client_id: account.client.id, status: 1, trash: 0 } })
    if (!tax) throw new Error('Product tax configuration is unavailable.')
    const settings = await this.prisma.billingSettings.findFirst({ where: { client_id: account.client.id } })
    const gstPercentage = refund ? number(payload.gstPercentage, tax.tax_percent) : tax.tax_percent, gross = nextQty * salePrice
    const gstAmount = settings?.exclusive_gst_billing === 1 ? gross * gstPercentage / 100 : gross * gstPercentage / (100 + gstPercentage)
    const now = new Date()
    if (existing) return this.prisma.tempBillTran.update({ where: { id: existing.id }, data: { qty: nextQty, sale_price: salePrice, gst_percentage: gstPercentage, gst_amount: gstAmount, updated_at: now } })
    const last = await this.prisma.tempBillTran.findFirst({ where: { client_id: account.client.id, user_id: account.user.id }, orderBy: { line_num: 'desc' } })
    return this.prisma.tempBillTran.create({ data: {
      client_id: account.client.id, user_id: account.user.id, product_id: productId, variant_id: variantId, qty,
      mrp: found.variant.mrp, sale_price: salePrice, price_override: 0,
      cost_price: found.variant.cost_price, line_num: (last?.line_num ?? 0) + 1,
      gst_percentage: gstPercentage, gst_amount: settings?.exclusive_gst_billing === 1 ? qty * salePrice * gstPercentage / 100 : qty * salePrice * gstPercentage / (100 + gstPercentage),
      sm_id: optionalId(payload.smId), bill_mode: number(payload.billMode, refund ? 4 : 1), created_at: now, updated_at: now,
    } })
  }

  private async save(account: Account, payload: BillingPayload, refund: boolean) {
    return this.prisma.$transaction(async transaction => {
      const items = await transaction.tempBillTran.findMany({ where: { client_id: account.client.id, user_id: account.user.id, void_flag: 0 }, orderBy: { line_num: 'asc' } })
      if (!items.length) throw new Error('No bill items found.')
      const variantIds = items.flatMap(item => item.variant_id ? [item.variant_id] : [])
      const variants = await transaction.productVariants.findMany({ where: { client_id: account.client.id, id: { in: variantIds }, status: 1, trash: 0 } })
      const variantMap = new Map(variants.map(variant => [variant.id, variant]))
      if (variants.length !== variantIds.length) throw new Error('A bill variant is unavailable.')
      const payments = payload.paymentModes as Array<{ paymentModeId: number; amount: number }>
      const paymentModes = await transaction.paymentModes.findMany({ where: { client_id: account.client.id, id: { in: payments.map(payment => BigInt(payment.paymentModeId)) }, status: 1, trash: 0 } })
      if (paymentModes.length !== new Set(payments.map(payment => payment.paymentModeId)).size) throw new Error('Invalid payment mode.')
      const settings = await transaction.billingSettings.findFirst({ where: { client_id: account.client.id } })
      const subtotal = items.reduce((sum, item) => sum + Number(item.qty) * Number(item.sale_price), 0)
      const itemDiscount = items.reduce((sum, item) => sum + Number(item.manual_discount_value), 0)
      const gst = items.reduce((sum, item) => sum + Number(item.gst_amount), 0)
      const discount = number(payload.discount) + itemDiscount, charges = number(payload.additionalCharges), roundOff = number(payload.roundOffValue)
      const total = Math.round((subtotal - discount + (settings?.exclusive_gst_billing === 1 ? gst : 0) + charges + roundOff) * 1000) / 1000
      if (Math.abs(number(payload.subTotal) - subtotal) > 0.011 || Math.abs(number(payload.total) - total) > 0.011) throw new Error('Bill totals changed; refresh and retry.')
      if (Math.abs(payments.reduce((sum, payment) => sum + payment.amount, 0) - total) > 0.011) throw new Error('Payment total must equal the bill total.')
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
      await transaction.billTran.createMany({ data: items.map(item => ({
        client_id: account.client.id, bill_num: billNo, bill_date: now, line_num: item.line_num, product_id: item.product_id,
        variant_id: item.variant_id, qty: refund ? -Number(item.qty) : item.qty, mrp: item.mrp, sale_price: item.sale_price,
        price_override: item.price_override, manual_discount_percentage: item.manual_discount_percentage,
        manual_discount_value: refund ? -Number(item.manual_discount_value) : item.manual_discount_value, void_flag: item.void_flag,
        bill_mode: refund ? 4 : item.bill_mode, gst_percentage: item.gst_percentage, gst_amount: refund ? -Number(item.gst_amount) : item.gst_amount,
        cost_price: item.cost_price, sm_id: item.sm_id, scheme_type: item.scheme_type, user_id: account.user.id, created_at: now, updated_at: now,
      })) })
      await transaction.billPayments.createMany({ data: payments.map(payment => ({ client_id: account.client.id, bill_num: billNo, bill_date: now, payment_mode_id: BigInt(payment.paymentModeId), amount: refund ? -payment.amount : payment.amount, user_id: account.user.id, created_at: now, updated_at: now })) })
      for (const item of items) {
        if (!item.variant_id) continue
        const variant = variantMap.get(item.variant_id)!
        if (!refund && variant.variant_qty < Number(item.qty)) throw new Error(`Insufficient stock. Available: ${variant.variant_qty}; requested quantity: ${Number(item.qty)}.`)
        await transaction.productVariants.update({ where: { id: variant.id }, data: { variant_qty: { increment: refund ? Number(item.qty) : -Number(item.qty) }, updated_at: now } })
        const stock = await transaction.stock.findFirst({ where: { client_id: account.client.id, product_id: item.product_id, variant_id: item.variant_id, stock_date: date() } })
        if (stock) await transaction.stock.update({ where: { id: stock.id }, data: { sales: { increment: refund ? -Number(item.qty) : Number(item.qty) }, closeing_balance: { increment: refund ? Number(item.qty) : -Number(item.qty) }, updated_at: now } })
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
        const products = await this.prisma.products.findMany({ where: { client_id: clientId, status: 1, trash: 0, OR: [{ product_code: search }, { ean_code: search }] }, take: 101 })
        const variants = await this.prisma.productVariants.findMany({ where: { client_id: clientId, status: 1, trash: 0, product_id: { in: products.map(product => product.id) } }, take: 101 })
        if (products.length > 100 || variants.length > 100) throw new Error('Search result limit exceeded.')
        return { products, variants }
      }
      case 'getCustomerByMobile': return this.prisma.customers.findFirst({ where: { client_id: clientId, mobile: string(payload.mobile), status: 1, trash: 0 } })
      case 'addProductToTemp': return this.putTemp(account, payload)
      case 'updateTempProductQty': {
        const row = await this.prisma.tempBillTran.findFirst({ where: { client_id: clientId, user_id: userId, product_id: bigint(payload.productId), variant_id: bigint(payload.variantId) } })
        if (!row) throw new Error('Temporary bill item not found.')
        const found = await this.product(clientId, row.product_id, row.variant_id!)
        if (!found) throw new Error('Product variant is unavailable.')
        if (found.variant.variant_qty < number(payload.qty)) throw new Error(`Insufficient stock. Available: ${found.variant.variant_qty}; requested quantity: ${number(payload.qty)}.`)
        const gross = number(payload.qty) * Number(row.sale_price), settings = await this.prisma.billingSettings.findFirst({ where: { client_id: clientId } }), rate = Number(row.gst_percentage)
        return this.prisma.tempBillTran.update({ where: { id: row.id }, data: { qty: number(payload.qty), gst_amount: settings?.exclusive_gst_billing === 1 ? gross * rate / 100 : gross * rate / (100 + rate), updated_at: new Date() } })
      }
      case 'updateTempProductSalePrice': {
        const row = await this.prisma.tempBillTran.findFirst({ where: { client_id: clientId, user_id: userId, product_id: bigint(payload.productId), variant_id: bigint(payload.variantId) } })
        if (!row) throw new Error('Temporary bill item not found.')
        const price = number(payload.salePrice), settings = await this.prisma.billingSettings.findFirst({ where: { client_id: clientId } }), gross = Number(row.qty) * price, rate = Number(row.gst_percentage), gst = settings?.exclusive_gst_billing === 1 ? gross * rate / 100 : gross * rate / (100 + rate)
        return this.prisma.tempBillTran.update({ where: { id: row.id }, data: { sale_price: price, price_override: price, gst_amount: gst, updated_at: new Date() } })
      }
      case 'clearTempBill': return { deleted: (await this.prisma.tempBillTran.deleteMany({ where: { client_id: clientId, user_id: userId } })).count }
      case 'updateVoid': case 'updateTempProductDiscount': {
        const row = await this.prisma.tempBillTran.findFirst({ where: { client_id: clientId, user_id: userId, product_id: bigint(payload.productId), variant_id: bigint(payload.variantId) } })
        if (!row) throw new Error('Temporary bill item not found.')
        if (operation === 'updateVoid') return this.prisma.tempBillTran.update({ where: { id: row.id }, data: { void_flag: number(payload.voidFlag), updated_at: new Date() } })
        const gross = Number(row.qty) * Number(row.sale_price), discount = payload.discountPercentage === undefined ? number(payload.discountValue) : gross * number(payload.discountPercentage) / 100
        if (discount > gross) throw new Error('Discount exceeds item amount.')
        return this.prisma.tempBillTran.update({ where: { id: row.id }, data: { manual_discount_percentage: gross ? discount * 100 / gross : 0, manual_discount_value: discount, updated_at: new Date() } })
      }
      case 'getShortcutKeys': {
        const masters = await this.prisma.keyMappingMasters.findMany({ where: { status: 1, trash: 0 }, orderBy: { key_name: 'asc' }, take: 500 })
        const settings = await this.prisma.keyMappingSettings.findMany({ where: { client_id: clientId, key_mapping_id: { in: masters.map(master => master.id) } }, take: 500 })
        const settingByMaster = new Map(settings.map(setting => [setting.key_mapping_id, setting]))
        return masters.flatMap(master => {
          const setting = settingByMaster.get(master.id)
          return setting ? [{ id: setting.id, keyMappingId: setting.key_mapping_id, keyName: master.key_name, shortKey: setting.short_key }] : []
        })
      }
      case 'suspendBill': return this.prisma.$transaction(async transaction => {
        const rows = await transaction.tempBillTran.findMany({ where: { client_id: clientId, user_id: userId } }); if (!rows.length) throw new Error('No bill items found.')
        const last = await transaction.suspendedItems.findFirst({ where: { client_id: clientId }, orderBy: { id: 'desc' } }), suspendedNumber = `S${Number(last?.id ?? 0n) + 1}`; const now = new Date()
        await transaction.suspendedItems.createMany({ data: rows.map(row => ({ client_id: clientId, user_id: userId, suspended_number: suspendedNumber, suspended_date: now, line_num: row.line_num, product_id: row.product_id, variant_id: row.variant_id, qty: row.qty, void_flag: row.void_flag, sm_id: row.sm_id, customer_name: typeof payload.customerName === 'string' ? payload.customerName : null, customer_mobile: typeof payload.customerMobile === 'string' ? payload.customerMobile : null, created_at: now, updated_at: now })) })
        await transaction.tempBillTran.deleteMany({ where: { client_id: clientId, user_id: userId } }); return { suspendedNumber }
      })
      case 'getProductDetails': return this.product(clientId, bigint(payload.productId), bigint(payload.variantId))
      case 'getSuspendedItems': return this.prisma.suspendedItems.findMany({ where: { client_id: clientId, ...(payload.searchStr ? { OR: [{ suspended_number: { contains: string(payload.searchStr) } }, { customer_name: { contains: string(payload.searchStr) } }, { customer_mobile: { contains: string(payload.searchStr) } }] } : {}) }, distinct: ['suspended_number'], orderBy: { id: 'desc' }, take: 500 })
      case 'resumeSuspendedBill': return this.prisma.$transaction(async transaction => {
        const suspended = await transaction.suspendedItems.findMany({ where: { client_id: clientId, suspended_number: string(payload.suspendedNumber) }, orderBy: { line_num: 'asc' } }); if (!suspended.length) throw new Error('Suspended bill not found.')
        if (await transaction.tempBillTran.count({ where: { client_id: clientId, user_id: userId } })) throw new Error('Clear the current bill before resuming.')
        const variants = await transaction.productVariants.findMany({ where: { client_id: clientId, id: { in: suspended.flatMap(row => row.variant_id ? [row.variant_id] : []) }, status: 1, trash: 0 } }); const map = new Map(variants.map(v => [v.id, v])); if (variants.length !== suspended.length) throw new Error('A suspended product is unavailable.')
        const now = new Date(); await transaction.tempBillTran.createMany({ data: suspended.map(row => { const variant = map.get(row.variant_id!)!; return { client_id: clientId, user_id: userId, product_id: row.product_id, variant_id: row.variant_id, qty: row.qty, mrp: variant.mrp, sale_price: variant.sale_price, cost_price: variant.cost_price, line_num: row.line_num, void_flag: row.void_flag, sm_id: row.sm_id, created_at: now, updated_at: now } }) }); await transaction.suspendedItems.deleteMany({ where: { client_id: clientId, suspended_number: string(payload.suspendedNumber) } }); return { resumed: suspended.length }
      })
      case 'getTempBillItems': return this.temp(clientId, userId)
      case 'getTempBillItem': return (await this.temp(clientId, userId)).find(row => row.productId === bigint(payload.productId) && row.variantId === bigint(payload.variantId)) ?? null
      case 'updateManualDiscount': {
        const rows = await this.prisma.tempBillTran.findMany({ where: { client_id: clientId, user_id: userId, void_flag: 0 } }); if (!rows.length) throw new Error('No bill items found.')
        const gross = rows.reduce((sum, row) => sum + Number(row.qty) * Number(row.sale_price), 0), totalDiscount = payload.discountPercentage === undefined ? number(payload.discountValue) : gross * number(payload.discountPercentage) / 100; if (totalDiscount > gross) throw new Error('Discount exceeds bill amount.')
        await this.prisma.$transaction(rows.map(row => { const rowGross = Number(row.qty) * Number(row.sale_price), share = gross ? totalDiscount * rowGross / gross : 0; return this.prisma.tempBillTran.update({ where: { id: row.id }, data: { manual_discount_percentage: gross ? totalDiscount * 100 / gross : 0, manual_discount_value: share, updated_at: new Date() } }) })); return { discount: totalDiscount }
      }
      case 'clearManualDiscount': return { updated: (await this.prisma.tempBillTran.updateMany({ where: { client_id: clientId, user_id: userId }, data: { manual_discount_percentage: 0, manual_discount_value: 0, updated_at: new Date() } })).count }
      case 'getFreeProductDetails': return (await this.temp(clientId, userId)).filter(row => Number(row.freeQty) > 0)
      case 'saveBill': return this.save(account, payload, false)
      case 'getApplicableBillBuster': return this.prisma.billBusters.findMany({ where: { client_id: clientId, status: 1, trash: 0, from_date: { lte: new Date() }, to_date: { gte: new Date() }, min_amount: { lte: number(payload.totalAmount) } }, take: 100 })
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
      case 'getPrint': { const billDate = date(payload.billDate), billNo = number(payload.billNumber, Number(payload.billNumber)); const [master, lines, payments, taxes, settings, descriptions] = await Promise.all([this.prisma.billMaster.findFirst({ where: { client_id: clientId, bill_num: billNo, bill_date: dayRange(billDate) } }), this.prisma.billTran.findMany({ where: { client_id: clientId, bill_num: billNo, bill_date: dayRange(billDate) } }), this.prisma.billPayments.findMany({ where: { client_id: clientId, bill_num: billNo, bill_date: dayRange(billDate) } }), this.prisma.taxBreakup.findMany({ where: { client_id: clientId, bill_num: billNo, bill_date: dayRange(billDate) } }), this.prisma.billingSettings.findFirst({ where: { client_id: clientId } }), this.prisma.billingSettingsDescriptions.findMany({ where: { client_id: clientId } })]); if (!master) throw new Error('Bill not found.'); return { master, lines, payments, taxes, settings, descriptions } }
      case 'getDayCloseReport': { const target = date(payload.date), range = dayRange(target), [sales, bills, payments] = await Promise.all([this.prisma.billMaster.aggregate({ where: { client_id: clientId, bill_date: range, bill_mode: { not: 5 } }, _sum: { net_amount: true } }), this.prisma.billMaster.count({ where: { client_id: clientId, bill_date: range, bill_mode: { not: 5 } } }), this.prisma.billPayments.groupBy({ by: ['payment_mode_id'], where: { client_id: clientId, bill_date: range }, _sum: { amount: true } })]); return { date: target, totalSales: Number(sales._sum.net_amount ?? 0), totalBills: bills, payments } }
      case 'dayClose': return this.prisma.$transaction(async transaction => { const now = new Date(); if (await transaction.dayCloseDetails.findFirst({ where: { client_id: clientId, day_close_date: dayRange(now) } })) throw new Error('Day is already closed.'); await transaction.dayCloseDetails.create({ data: { client_id: clientId, user_id: userId, day_close_date: now, created_at: now, updated_at: now } }); await transaction.audits.create({ data: audit(account, 'day_close', 'Retail day closed', now) }); return { closedAt: now } }, { isolationLevel: 'Serializable' })
      case 'getBillFormats': { const client = await this.prisma.users.findFirst({ where: { id: clientId, status: 1, trash: 0 }, select: { business_type_id: true } }); return client?.business_type_id ? this.prisma.billFormats.findMany({ where: { business_type_id: client.business_type_id, status: 1, trash: 0 }, orderBy: { id: 'asc' } }) : [] }
    }
  }
}
