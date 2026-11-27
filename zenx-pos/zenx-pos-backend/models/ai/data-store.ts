import { Prisma, type PrismaClient } from '@prisma/client'
import { zoneOffsetText } from '../system/business-time.ts'

// What ZenxPOS AI reads. Sales come from both retail bills (bill_master / bill_tran and
// their prev_ archives) and restaurant bills (kot_bill_mast / kot_bill_tran and archives).
// DATETIME columns are stored in DB_TIMEZONE; days and hours are the store's local ones.
// Cancelled bills (bill_mode 5) and voided lines are left out; refunds count as negative.

const num = (value: unknown) => Number(value ?? 0)
const day = (value: unknown) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)

export type ItemDay = { variantId: number; productId: number; day: string; qty: number }
export type VariantRow = { variantId: number; productId: number; name: string; packSize: string; code: string; stock: number; costPrice: number; salePrice: number; mrp: number; createdAt: Date | null }
export type HourTotal = { day: string; hour: number; amount: number; bills: number }
export type CustomerDay = { customerId: number; day: string; amount: number }
export type UserDay = { userId: number; day: string; refunds: number; refundAmount: number; cancelled: number; discount: number; voids: number }
export type CostLine = { variantId: number; rate: number; date: Date }
export type KotDay = { productId: number; day: string; lunch: number; dinner: number }
export type DraftMasters = {
  categories: { id: number; name: string }[]; subCategories: { id: number; name: string; categoryId: number }[]; brands: { id: number; name: string }[]
  units: { id: number; name: string }[]; taxes: { id: number; name: string; percent: number }[]
  products: { name: string; category: string; subCategory: string | null; hsn: string; taxPercent: number | null }[]
}

export interface AiDataStore {
  dailyCredits(clientId: bigint): Promise<number>
  itemDays(clientId: bigint, from: Date, now: Date, variantIds?: number[]): Promise<ItemDay[]>
  variants(clientId: bigint, variantIds?: number[]): Promise<VariantRow[]>
  lastSales(clientId: bigint, from: Date, now: Date): Promise<Map<number, string>>
  hourTotals(clientId: bigint, from: Date, now: Date): Promise<HourTotal[]>
  customerDays(clientId: bigint, from: Date, now: Date): Promise<CustomerDay[]>
  customers(clientId: bigint, ids: number[]): Promise<Map<number, { name: string; mobile: string }>>
  userDays(clientId: bigint, from: Date, now: Date): Promise<UserDay[]>
  userNames(clientId: bigint, ids: number[]): Promise<Map<number, string>>
  baskets(clientId: bigint, from: Date, limit: number): Promise<number[][]>
  productNames(clientId: bigint, ids: number[]): Promise<Map<number, string>>
  costLines(clientId: bigint, from: Date): Promise<CostLine[]>
  kotDays(clientId: bigint, from: Date, now: Date): Promise<KotDay[]>
  draftMasters(clientId: bigint): Promise<DraftMasters>
}

export class PrismaAiDataStore implements AiDataStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  private zones(now: Date) { return { db: process.env.DB_TIMEZONE ?? '+05:30', tz: zoneOffsetText(now) } }

  async dailyCredits(clientId: bigint) {
    const row = await this.prisma.users.findUnique({ where: { id: clientId }, select: { ai_daily_credits: true } })
    return row?.ai_daily_credits ?? 0
  }

  async itemDays(clientId: bigint, from: Date, now: Date, variantIds?: number[]) {
    const { db, tz } = this.zones(now)
    const only = variantIds?.length ? Prisma.sql`AND t.variant_id IN (${Prisma.join(variantIds)})` : Prisma.empty
    const retail = (tran: string, master: string) => Prisma.sql`
      SELECT t.variant_id, t.product_id, DATE(CONVERT_TZ(t.bill_date, ${db}, ${tz})) d,
        SUM(CASE WHEN t.bill_mode = 3 OR COALESCE(m.refund_against_bill_num, '') <> '' OR t.qty < 0 THEN -ABS(t.qty) ELSE t.qty END) qty
      FROM ${Prisma.raw(tran)} t JOIN ${Prisma.raw(master)} m ON m.client_id = t.client_id AND m.bill_num = t.bill_num AND m.bill_date = t.bill_date
      WHERE t.client_id = ${clientId} AND t.bill_date >= ${from} AND t.void_flag = 0 AND m.bill_mode <> 5 ${only} GROUP BY t.variant_id, t.product_id, d`
    const restaurant = (tran: string, master: string) => Prisma.sql`
      SELECT t.variant_id, t.product_id, DATE(CONVERT_TZ(t.bill_date, ${db}, ${tz})) d, SUM(t.qty) qty
      FROM ${Prisma.raw(tran)} t JOIN ${Prisma.raw(master)} m ON m.client_id = t.client_id AND m.bill_no = t.bill_no
      WHERE t.client_id = ${clientId} AND t.bill_date >= ${from} AND m.bill_mode <> 5 ${only} GROUP BY t.variant_id, t.product_id, d`
    const rows = await this.prisma.$queryRaw<{ variant_id: bigint; product_id: bigint; d: Date; qty: unknown }[]>(Prisma.sql`
      ${retail('bill_tran', 'bill_master')} UNION ALL ${retail('prev_bill_tran', 'prev_bill_master')}
      UNION ALL ${restaurant('kot_bill_tran', 'kot_bill_mast')} UNION ALL ${restaurant('kot_prev_bill_tran', 'kot_prev_bill_mast')}`)
    return rows.map(row => ({ variantId: Number(row.variant_id), productId: Number(row.product_id), day: day(row.d), qty: num(row.qty) }))
  }

  async variants(clientId: bigint, variantIds?: number[]) {
    const variants = await this.prisma.productVariants.findMany({
      where: { client_id: clientId, status: 1, trash: 0, ...(variantIds ? { id: { in: variantIds.map(BigInt) } } : {}) },
      select: { id: true, product_id: true, pack_size: true, variant_code: true, variant_qty: true, cost_price: true, sale_price: true, mrp: true, created_at: true }, take: 20000,
    })
    const products = await this.prisma.products.findMany({ where: { client_id: clientId, status: 1, trash: 0, id: { in: [...new Set(variants.map(row => row.product_id))] } }, select: { id: true, product_full_name: true } })
    const names = new Map(products.map(row => [row.id, row.product_full_name ?? '']))
    return variants.filter(row => names.has(row.product_id)).map(row => ({
      variantId: Number(row.id), productId: Number(row.product_id), name: names.get(row.product_id)!, packSize: row.pack_size ?? '', code: row.variant_code ?? '',
      stock: num(row.variant_qty), costPrice: num(row.cost_price), salePrice: num(row.sale_price), mrp: num(row.mrp), createdAt: row.created_at,
    }))
  }

  async lastSales(clientId: bigint, from: Date, now: Date) {
    const { db, tz } = this.zones(now)
    const rows = await this.prisma.$queryRaw<{ variant_id: bigint; last_day: Date }[]>(Prisma.sql`
      SELECT variant_id, DATE(CONVERT_TZ(MAX(last_at), ${db}, ${tz})) last_day FROM (
        SELECT variant_id, MAX(bill_date) last_at FROM bill_tran WHERE client_id = ${clientId} AND bill_date >= ${from} AND void_flag = 0 AND qty > 0 GROUP BY variant_id
        UNION ALL SELECT variant_id, MAX(bill_date) FROM prev_bill_tran WHERE client_id = ${clientId} AND bill_date >= ${from} AND void_flag = 0 AND qty > 0 GROUP BY variant_id
        UNION ALL SELECT variant_id, MAX(bill_date) FROM kot_bill_tran WHERE client_id = ${clientId} AND bill_date >= ${from} AND qty > 0 GROUP BY variant_id
        UNION ALL SELECT variant_id, MAX(bill_date) FROM kot_prev_bill_tran WHERE client_id = ${clientId} AND bill_date >= ${from} AND qty > 0 GROUP BY variant_id
      ) sales GROUP BY variant_id`)
    return new Map(rows.map(row => [Number(row.variant_id), day(row.last_day)]))
  }

  // Sales bills (not refunds or cancelled bills) by local day and hour.
  async hourTotals(clientId: bigint, from: Date, now: Date) {
    const { db, tz } = this.zones(now)
    const rows = await this.prisma.$queryRaw<{ d: Date; h: number; amount: unknown; bills: bigint }[]>(Prisma.sql`
      SELECT DATE(local_at) d, HOUR(local_at) h, SUM(amount) amount, COUNT(*) bills FROM (
        SELECT CONVERT_TZ(bill_date, ${db}, ${tz}) local_at, net_amount amount FROM bill_master WHERE client_id = ${clientId} AND bill_date >= ${from} AND bill_mode = 1
        UNION ALL SELECT CONVERT_TZ(bill_date, ${db}, ${tz}), net_amount FROM prev_bill_master WHERE client_id = ${clientId} AND bill_date >= ${from} AND bill_mode = 1
        UNION ALL SELECT CONVERT_TZ(bill_date, ${db}, ${tz}), grand_total FROM kot_bill_mast WHERE client_id = ${clientId} AND bill_date >= ${from} AND bill_mode NOT IN (4, 5)
        UNION ALL SELECT CONVERT_TZ(bill_date, ${db}, ${tz}), grand_total FROM kot_prev_bill_mast WHERE client_id = ${clientId} AND bill_date >= ${from} AND bill_mode NOT IN (4, 5)
      ) bills GROUP BY d, h`)
    return rows.map(row => ({ day: day(row.d), hour: Number(row.h), amount: num(row.amount), bills: Number(row.bills) }))
  }

  async customerDays(clientId: bigint, from: Date, now: Date) {
    const { db, tz } = this.zones(now)
    const rows = await this.prisma.$queryRaw<{ customer_id: bigint; d: Date; amount: unknown }[]>(Prisma.sql`
      SELECT customer_id, DATE(local_at) d, SUM(amount) amount FROM (
        SELECT customer_id, CONVERT_TZ(bill_date, ${db}, ${tz}) local_at, net_amount amount FROM bill_master WHERE client_id = ${clientId} AND bill_date >= ${from} AND bill_mode = 1 AND customer_id IS NOT NULL
        UNION ALL SELECT customer_id, CONVERT_TZ(bill_date, ${db}, ${tz}), net_amount FROM prev_bill_master WHERE client_id = ${clientId} AND bill_date >= ${from} AND bill_mode = 1 AND customer_id IS NOT NULL
        UNION ALL SELECT customer_id, CONVERT_TZ(bill_date, ${db}, ${tz}), grand_total FROM kot_bill_mast WHERE client_id = ${clientId} AND bill_date >= ${from} AND bill_mode NOT IN (4, 5) AND customer_id IS NOT NULL
        UNION ALL SELECT customer_id, CONVERT_TZ(bill_date, ${db}, ${tz}), grand_total FROM kot_prev_bill_mast WHERE client_id = ${clientId} AND bill_date >= ${from} AND bill_mode NOT IN (4, 5) AND customer_id IS NOT NULL
      ) visits GROUP BY customer_id, d`)
    return rows.map(row => ({ customerId: Number(row.customer_id), day: day(row.d), amount: num(row.amount) }))
  }

  async customers(clientId: bigint, ids: number[]) {
    if (!ids.length) return new Map()
    const rows = await this.prisma.customers.findMany({ where: { client_id: clientId, id: { in: ids.map(BigInt) } }, select: { id: true, customer_name: true, mobile: true } })
    return new Map(rows.map(row => [Number(row.id), { name: row.customer_name ?? 'Customer', mobile: row.mobile ?? '' }]))
  }

  // Per person per local day: refunds, cancelled bills, manual discounts and voided lines.
  async userDays(clientId: bigint, from: Date, now: Date) {
    const { db, tz } = this.zones(now)
    const masters = await this.prisma.$queryRaw<{ user_id: bigint; d: Date; refunds: bigint; refund_amount: unknown; cancelled: bigint; discount: unknown }[]>(Prisma.sql`
      SELECT user_id, DATE(local_at) d, SUM(mode = 4) refunds, SUM(CASE WHEN mode = 4 THEN ABS(amount) ELSE 0 END) refund_amount, SUM(mode = 5) cancelled,
        SUM(CASE WHEN mode = 1 THEN discount ELSE 0 END) discount FROM (
        SELECT user_id, CONVERT_TZ(bill_date, ${db}, ${tz}) local_at, bill_mode mode, net_amount amount, manual_discount_value discount FROM bill_master WHERE client_id = ${clientId} AND bill_date >= ${from} AND user_id IS NOT NULL
        UNION ALL SELECT user_id, CONVERT_TZ(bill_date, ${db}, ${tz}), bill_mode, net_amount, manual_discount_value FROM prev_bill_master WHERE client_id = ${clientId} AND bill_date >= ${from} AND user_id IS NOT NULL
        UNION ALL SELECT user_id, CONVERT_TZ(bill_date, ${db}, ${tz}), bill_mode, grand_total, discount FROM kot_bill_mast WHERE client_id = ${clientId} AND bill_date >= ${from}
      ) bills GROUP BY user_id, d`)
    const voids = await this.prisma.$queryRaw<{ user_id: bigint; d: Date; voids: bigint }[]>(Prisma.sql`
      SELECT user_id, DATE(local_at) d, COUNT(*) voids FROM (
        SELECT user_id, CONVERT_TZ(bill_date, ${db}, ${tz}) local_at FROM bill_tran WHERE client_id = ${clientId} AND bill_date >= ${from} AND void_flag = 1 AND user_id IS NOT NULL
        UNION ALL SELECT user_id, CONVERT_TZ(bill_date, ${db}, ${tz}) FROM prev_bill_tran WHERE client_id = ${clientId} AND bill_date >= ${from} AND void_flag = 1 AND user_id IS NOT NULL
      ) voided GROUP BY user_id, d`)
    const result = new Map<string, UserDay>()
    const entry = (userId: number, d: string) => {
      const key = `${userId}|${d}`
      if (!result.has(key)) result.set(key, { userId, day: d, refunds: 0, refundAmount: 0, cancelled: 0, discount: 0, voids: 0 })
      return result.get(key)!
    }
    for (const row of masters) Object.assign(entry(Number(row.user_id), day(row.d)), { refunds: num(row.refunds), refundAmount: num(row.refund_amount), cancelled: num(row.cancelled), discount: num(row.discount) })
    for (const row of voids) entry(Number(row.user_id), day(row.d)).voids = num(row.voids)
    return [...result.values()]
  }

  async userNames(clientId: bigint, ids: number[]) {
    if (!ids.length) return new Map()
    const rows = await this.prisma.clientUsers.findMany({ where: { client_id: clientId, id: { in: ids.map(BigInt) } }, select: { id: true, name: true } })
    return new Map(rows.map(row => [Number(row.id), row.name ?? `User ${row.id}`]))
  }

  // The products on each recent sales bill, newest bills first.
  async baskets(clientId: bigint, from: Date, limit: number) {
    const rows = await this.prisma.$queryRaw<{ k: string; product_id: bigint }[]>(Prisma.sql`
      SELECT k, product_id FROM (
        SELECT CONCAT('r', t.bill_num, '@', t.bill_date) k, t.product_id, t.bill_date FROM bill_tran t JOIN bill_master m ON m.client_id = t.client_id AND m.bill_num = t.bill_num AND m.bill_date = t.bill_date
          WHERE t.client_id = ${clientId} AND t.bill_date >= ${from} AND t.void_flag = 0 AND t.qty > 0 AND m.bill_mode = 1
        UNION ALL SELECT CONCAT('p', t.bill_num, '@', t.bill_date), t.product_id, t.bill_date FROM prev_bill_tran t JOIN prev_bill_master m ON m.client_id = t.client_id AND m.bill_num = t.bill_num AND m.bill_date = t.bill_date
          WHERE t.client_id = ${clientId} AND t.bill_date >= ${from} AND t.void_flag = 0 AND t.qty > 0 AND m.bill_mode = 1
        UNION ALL SELECT CONCAT('k', t.bill_no), t.product_id, t.bill_date FROM kot_bill_tran t WHERE t.client_id = ${clientId} AND t.bill_date >= ${from} AND t.qty > 0
        UNION ALL SELECT CONCAT('q', t.bill_no), t.product_id, t.bill_date FROM kot_prev_bill_tran t WHERE t.client_id = ${clientId} AND t.bill_date >= ${from} AND t.qty > 0
      ) sold ORDER BY bill_date DESC LIMIT ${limit}`)
    const bills = new Map<string, number[]>()
    for (const row of rows) bills.set(row.k, [...(bills.get(row.k) ?? []), Number(row.product_id)])
    return [...bills.values()]
  }

  async productNames(clientId: bigint, ids: number[]) {
    if (!ids.length) return new Map()
    const rows = await this.prisma.products.findMany({ where: { client_id: clientId, id: { in: ids.map(BigInt) } }, select: { id: true, product_full_name: true } })
    return new Map(rows.map(row => [Number(row.id), row.product_full_name ?? `Product ${row.id}`]))
  }

  // Rates on posted purchase invoices, newest first.
  async costLines(clientId: bigint, from: Date) {
    const rows = await this.prisma.$queryRaw<{ variant_id: bigint; rate: unknown; invoice_date: Date }[]>(Prisma.sql`
      SELECT l.variant_id, l.rate, i.invoice_date FROM purchase_invoice_lines l JOIN purchase_invoices i ON i.id = l.invoice_id AND i.client_id = l.client_id
      WHERE l.client_id = ${clientId} AND i.invoice_date >= ${from} AND i.status IN ('unpaid', 'partially_paid', 'paid') AND l.rate > 0
      ORDER BY i.invoice_date DESC, i.id DESC LIMIT 20000`)
    return rows.map(row => ({ variantId: Number(row.variant_id), rate: num(row.rate), date: row.invoice_date }))
  }

  // Kitchen orders per dish per local day, lunch (before 4 pm) and dinner, without cancelled items.
  // kot_date has no time of day, so the order's created_at gives the hour.
  async kotDays(clientId: bigint, from: Date, now: Date) {
    const { db, tz } = this.zones(now)
    const rows = await this.prisma.$queryRaw<{ product_id: bigint; d: Date; lunch: unknown; dinner: unknown }[]>(Prisma.sql`
      SELECT product_id, DATE(local_at) d, SUM(CASE WHEN HOUR(local_at) < 16 THEN qty ELSE 0 END) lunch, SUM(CASE WHEN HOUR(local_at) >= 16 THEN qty ELSE 0 END) dinner FROM (
        SELECT t.product_id, COALESCE(CONVERT_TZ(m.created_at, ${db}, ${tz}), m.kot_date) local_at, t.qty FROM kot_tran t JOIN kot_mast m ON m.id = t.kot_id AND m.client_id = t.client_id
        WHERE t.client_id = ${clientId} AND COALESCE(m.created_at, m.kot_date) >= ${from} AND m.kot_status <> 5 AND t.item_status NOT IN (4, 5)
      ) kots GROUP BY product_id, d`)
    return rows.map(row => ({ productId: Number(row.product_id), day: day(row.d), lunch: num(row.lunch), dinner: num(row.dinner) }))
  }

  async draftMasters(clientId: bigint) {
    const active = { client_id: clientId, status: 1, trash: 0 }
    const [categories, subCategories, brands, units, taxes, products] = await Promise.all([
      this.prisma.categories.findMany({ where: active, select: { id: true, category_name: true } }),
      this.prisma.subCategories.findMany({ where: active, select: { id: true, sub_category_name: true, category_id: true } }),
      this.prisma.brands.findMany({ where: active, select: { id: true, brand_name: true } }),
      this.prisma.unitTypes.findMany({ where: active, select: { id: true, unit_type_name: true } }),
      this.prisma.taxes.findMany({ where: active, select: { id: true, tax_name: true, tax_percent: true } }),
      this.prisma.products.findMany({ where: { client_id: clientId, trash: 0 }, select: { product_full_name: true, category_id: true, sub_category_id: true, hsn_code: true, tax_id: true }, orderBy: { id: 'desc' }, take: 5000 }),
    ])
    const categoryNames = new Map(categories.map(row => [row.id, row.category_name ?? ''])), subNames = new Map(subCategories.map(row => [row.id, row.sub_category_name ?? '']))
    const taxPercent = new Map(taxes.map(row => [row.id, num(row.tax_percent)]))
    return {
      categories: categories.map(row => ({ id: Number(row.id), name: row.category_name ?? '' })),
      subCategories: subCategories.map(row => ({ id: Number(row.id), name: row.sub_category_name ?? '', categoryId: Number(row.category_id) })),
      brands: brands.map(row => ({ id: Number(row.id), name: row.brand_name ?? '' })),
      units: units.map(row => ({ id: Number(row.id), name: row.unit_type_name ?? '' })),
      taxes: taxes.map(row => ({ id: Number(row.id), name: row.tax_name ?? '', percent: num(row.tax_percent) })),
      products: products.flatMap(row => {
        const category = categoryNames.get(row.category_id)
        return category && row.product_full_name ? [{ name: row.product_full_name, category, subCategory: row.sub_category_id ? subNames.get(row.sub_category_id) ?? null : null, hsn: row.hsn_code ?? '', taxPercent: row.tax_id ? taxPercent.get(row.tax_id) ?? null : null }] : []
      }),
    }
  }
}

