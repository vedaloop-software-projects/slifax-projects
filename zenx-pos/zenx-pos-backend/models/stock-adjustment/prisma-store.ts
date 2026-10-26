import type { Prisma, PrismaClient } from '@prisma/client'
import type { Account } from '../auth/contracts.ts'
import { allowsNegativeInventory, decrementVariantStock, incrementVariantStock } from '../inventory/stock-policy.ts'
import type { AdjustmentDetail, AdjustmentInput, AdjustmentItem, AdjustmentLine, AdjustmentListFilter, AdjustmentListRow, StockAdjustmentStore, StockAdjustmentType } from './contracts.ts'

const audit = (account: Account, type: string, description: string, now: Date) => ({ client_id: account.client.id, user_id: account.user.id, type, description, created_at: now, updated_at: now })
const toDbType = (type: StockAdjustmentType) => type === 'IN' ? 1 : 2
const fromDbType = (type: number): StockAdjustmentType => type === 1 ? 'IN' : 'OUT'

export class PrismaStockAdjustmentStore implements StockAdjustmentStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  private async validate(transaction: Prisma.TransactionClient, clientId: bigint, items: AdjustmentItem[]) {
    const productIds = [...new Set(items.map((item) => item.productId))], variantIds = [...new Set(items.map((item) => item.variantId))]
    const products = await transaction.products.findMany({ where: { client_id: clientId, id: { in: productIds }, status: 1, trash: 0 } })
    if (products.length !== productIds.length) return { error: 'product_missing' as const, variants: new Map() }
    const variants = await transaction.productVariants.findMany({ where: { client_id: clientId, id: { in: variantIds }, status: 1, trash: 0 } }), variantMap = new Map(variants.map((variant) => [variant.id, variant]))
    if (variants.length !== variantIds.length || items.some((item) => variantMap.get(item.variantId)?.product_id !== item.productId)) return { error: 'variant_missing' as const, variants: variantMap }
    return { error: null, variants: variantMap }
  }

  private async applyStock(transaction: Prisma.TransactionClient, account: Account, input: AdjustmentInput) {
    const now = new Date(), productIds = new Set<bigint>(), allowNegative = input.stockType === 'OUT' ? await allowsNegativeInventory(transaction, account.client.id) : true
    for (const item of input.products) {
      if (input.stockType === 'OUT') {
        if (!await decrementVariantStock(transaction, { clientId: account.client.id, productId: item.productId, variantId: item.variantId, quantity: item.qty, allowNegative, userId: account.user.id })) return 'insufficient_stock' as const
      } else {
        if (!await incrementVariantStock(transaction, { clientId: account.client.id, productId: item.productId, variantId: item.variantId, quantity: item.qty, userId: account.user.id })) return 'variant_missing' as const
      }

      const current = await transaction.stock.findFirst({ where: { client_id: account.client.id, stock_date: input.date, product_id: item.productId, variant_id: item.variantId } })
      let opening = Number(current?.opening_balance ?? 0)
      if (!current) {
        const previous = await transaction.stock.findFirst({ where: { client_id: account.client.id, product_id: item.productId, variant_id: item.variantId, stock_date: { lt: input.date } }, orderBy: { stock_date: 'desc' } })
        opening = Number(previous?.closeing_balance ?? 0)
      }
      const stockTake = Number(current?.stock_take ?? 0) + (input.stockType === 'IN' ? item.qty : 0)
      const damage = Number(current?.damage_stock ?? 0) + (input.stockType === 'OUT' ? item.qty : 0)
      const values = { opening_balance: opening, stock_take: stockTake, damage_stock: damage, closeing_balance: opening + stockTake - damage, updated_by: account.user.id, updated_at: now }
      if (current) await transaction.stock.update({ where: { id: current.id }, data: values })
      else await transaction.stock.create({ data: { client_id: account.client.id, stock_date: input.date, product_id: item.productId, variant_id: item.variantId, ...values, created_by: account.user.id, created_at: now } })
      productIds.add(item.productId)
    }
    for (const productId of productIds) {
      const variants = await transaction.productVariants.findMany({ where: { client_id: account.client.id, product_id: productId, trash: 0 }, select: { variant_qty: true } })
      await transaction.products.updateMany({ where: { id: productId, client_id: account.client.id, trash: 0 }, data: { qoh: variants.reduce((sum, variant) => sum + variant.variant_qty, 0), updated_by: Number(account.user.id), updated_at: now } })
    }
    return null
  }

  async create(account: Account, input: AdjustmentInput) {
    return this.prisma.$transaction(async (transaction) => {
      const check = await this.validate(transaction, account.client.id, input.products); if (check.error) return check.error
      if (input.status === 1) { const error = await this.applyStock(transaction, account, input); if (error) return error }
      const now = new Date(), total = input.products.reduce((sum, item) => sum + check.variants.get(item.variantId)!.cost_price * item.qty, 0)
      const master = await transaction.stockAdjustmentsMast.create({ data: { stock_adjustment_date: input.date, stock_type: toDbType(input.stockType), reason: input.reason, total_amount: total, status: input.status, user_id: account.user.id, client_id: account.client.id, created_by: Number(account.user.id), updated_by: Number(account.user.id), created_at: now, updated_at: now } })
      await transaction.stockAdjustmentsTran.createMany({ data: input.products.map((item) => { const variant = check.variants.get(item.variantId)!; return { stock_adjustment_id: master.id, client_id: account.client.id, user_id: account.user.id, line_num: item.lineNum, product_id: item.productId, variant_id: item.variantId, cost_price: variant.cost_price, sale_price: variant.sale_price, mrp: variant.mrp, qty: item.qty, reason: item.reason, created_at: now, updated_at: now } }) })
      await transaction.audits.create({ data: audit(account, 'add', `Stock Adjustment ${input.stockType} entry`, now) })
      return 'created' as const
    })
  }

  async update(account: Account, id: bigint, input: AdjustmentInput) {
    return this.prisma.$transaction(async (transaction) => {
      const master = await transaction.stockAdjustmentsMast.findFirst({ where: { id, client_id: account.client.id } }); if (!master) return 'missing' as const; if (master.status === 1) return 'completed' as const
      const existing = await transaction.stockAdjustmentsTran.findMany({ where: { stock_adjustment_id: id, client_id: account.client.id } }), submittedIds = input.products.flatMap((item) => item.id ? [item.id] : [])
      if (existing.some((line) => !submittedIds.includes(line.id))) return 'tran_missing' as const
      const check = await this.validate(transaction, account.client.id, input.products); if (check.error) return check.error
      if (input.products.some((item) => item.id && !existing.some((line) => line.id === item.id))) return 'tran_missing' as const
      if (input.status === 1) { const error = await this.applyStock(transaction, account, input); if (error) return error }
      const now = new Date()
      for (const item of input.products) {
        const variant = check.variants.get(item.variantId)!, data = { line_num: item.lineNum, product_id: item.productId, variant_id: item.variantId, cost_price: variant.cost_price, sale_price: variant.sale_price, mrp: variant.mrp, qty: item.qty, reason: item.reason, updated_at: now }
        if (item.id) await transaction.stockAdjustmentsTran.update({ where: { id: item.id }, data })
        else await transaction.stockAdjustmentsTran.create({ data: { stock_adjustment_id: id, client_id: account.client.id, user_id: account.user.id, ...data, created_at: now } })
      }
      const total = input.products.reduce((sum, item) => sum + check.variants.get(item.variantId)!.cost_price * item.qty, 0)
      await transaction.stockAdjustmentsMast.update({ where: { id }, data: { stock_adjustment_date: input.date, stock_type: toDbType(input.stockType), reason: input.reason, status: input.status, total_amount: total, updated_by: Number(account.user.id), updated_at: now } })
      await transaction.audits.create({ data: audit(account, 'edit', `Updated stock adjustment ${input.stockType}`, now) })
      return 'updated' as const
    })
  }

  private async lines(clientId: bigint, adjustmentId: bigint): Promise<AdjustmentLine[]> {
    const lines = await this.prisma.stockAdjustmentsTran.findMany({ where: { stock_adjustment_id: adjustmentId, client_id: clientId }, orderBy: { line_num: 'asc' } })
    const [products, variants] = await Promise.all([this.prisma.products.findMany({ where: { client_id: clientId, id: { in: lines.map((line) => line.product_id) } } }), this.prisma.productVariants.findMany({ where: { client_id: clientId, id: { in: lines.map((line) => line.variant_id) } } })])
    const productMap = new Map(products.map((product) => [product.id, product])), variantMap = new Map(variants.map((variant) => [variant.id, variant]))
    return lines.flatMap((line) => { const product = productMap.get(line.product_id), variant = variantMap.get(line.variant_id); return product && variant && variant.product_id === product.id ? [{ id: line.id, lineNum: line.line_num, productId: line.product_id, variantId: line.variant_id, costPrice: Number(line.cost_price), mrp: Number(line.mrp), qty: Number(line.qty), reason: line.reason, productFullName: product.product_full_name, productShortName: product.product_short_name, productCode: product.product_code, variantCode: variant.variant_code, eanCode: variant.ean_code, packSize: variant.pack_size }] : [] })
  }
  async get(clientId: bigint, id: bigint): Promise<AdjustmentDetail | null> {
    const value = await this.prisma.stockAdjustmentsMast.findFirst({ where: { id, client_id: clientId } })
    return value ? { id: value.id, date: value.stock_adjustment_date, stockType: fromDbType(value.stock_type), reason: value.reason, totalAmount: Number(value.total_amount), status: value.status, products: await this.lines(clientId, id) } : null
  }
  async list(clientId: bigint, filter: AdjustmentListFilter) {
    const rows = await this.prisma.stockAdjustmentsMast.findMany({ where: { client_id: clientId, ...(filter.reason ? { reason: { contains: filter.reason } } : {}), ...(filter.fromDate || filter.toDate ? { stock_adjustment_date: { ...(filter.fromDate ? { gte: filter.fromDate } : {}), ...(filter.toDate ? { lte: filter.toDate } : {}) } } : {}), ...(filter.status === undefined ? {} : { status: filter.status }), ...(filter.stockType ? { stock_type: toDbType(filter.stockType) } : {}) }, orderBy: { id: 'desc' }, take: filter.limit + 1 })
    const users = await this.prisma.clientUsers.findMany({ where: { client_id: clientId, id: { in: rows.map((row) => row.user_id) } } }), userMap = new Map(users.map((user) => [user.id, user.name]))
    return { rows: rows.slice(0, filter.limit).map((row): AdjustmentListRow => ({ id: row.id, date: row.stock_adjustment_date, stockType: fromDbType(row.stock_type), reason: row.reason, userId: row.user_id, userName: userMap.get(row.user_id) ?? '', status: row.status })), truncated: rows.length > filter.limit }
  }
  async removeLine(account: Account, id: bigint, lineId: bigint) {
    return this.prisma.$transaction(async (transaction) => {
      const master = await transaction.stockAdjustmentsMast.findFirst({ where: { id, client_id: account.client.id } }); if (!master) return 'missing' as const; if (master.status === 1) return 'completed' as const
      const line = await transaction.stockAdjustmentsTran.findFirst({ where: { id: lineId, stock_adjustment_id: id, client_id: account.client.id } }); if (!line) return 'tran_missing' as const
      await transaction.stockAdjustmentsTran.delete({ where: { id: line.id } })
      const remaining = await transaction.stockAdjustmentsTran.findMany({ where: { stock_adjustment_id: id, client_id: account.client.id } }), total = remaining.reduce((sum, item) => sum + Number(item.cost_price) * Number(item.qty), 0), now = new Date()
      await transaction.stockAdjustmentsMast.update({ where: { id }, data: { total_amount: total, updated_by: Number(account.user.id), updated_at: now } })
      await transaction.audits.create({ data: audit(account, 'delete', 'Stock adjustment product deleted', now) })
      return 'updated' as const
    })
  }
}
