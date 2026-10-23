import { z } from 'zod'
import type { Account, AuthStore } from '../../models/auth/contracts.ts'
import type { AdjustmentInput, AdjustmentItem, StockAdjustmentStore } from '../../models/stock-adjustment/contracts.ts'
import { ApiError } from '../auth/service.ts'

const id = z.number().int().positive().safe()
const date = z.string().regex(/^\d{2}-\d{2}-\d{4}$/)
const optionalDate = z.union([date, z.literal(''), z.null()]).optional()
const item = z.object({ id: id.nullable().optional(), lineNum: id, productId: id, variantId: id, qty: z.number().finite().min(.001).max(1_000_000), reason: z.string().trim().min(1).max(1000) })
const base = z.object({ stockAdjustmentDate: date, stockType: z.enum(['IN', 'OUT']).default('OUT'), reason: z.string().trim().min(1).max(2000), status: z.union([z.literal(0), z.literal(1)]), products: z.array(item).min(1).max(500) })
const edit = base.extend({ stockAdjustmentId: id })
const one = z.object({ stockAdjustmentId: id })
const remove = z.object({ stockAdjustmentId: id, stockAdjustmentTranId: id })
const filterReason = z.union([z.string(), z.number().finite().transform(String)]).pipe(z.string().trim().max(1000)).nullable().optional()
const list = z.object({ reason: filterReason, stockAdjustmentDate: optionalDate, fromDate: optionalDate, toDate: optionalDate, status: z.union([z.literal(0), z.literal(1), z.literal('0'), z.literal('1'), z.literal(''), z.null()]).optional(), stockType: z.union([z.enum(['IN', 'OUT']), z.literal(''), z.null()]).optional() })
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

function parseDate(value: string) {
  const [day, month, year] = value.split('-').map(Number), parsed = new Date(Date.UTC(year!, month! - 1, day))
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month! - 1 || parsed.getUTCDate() !== day) throw new ApiError(422, 'Invalid calendar date.')
  return parsed
}
const formatDate = (value: Date) => `${String(value.getUTCDate()).padStart(2, '0')}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${value.getUTCFullYear()}`

export class StockAdjustmentService {
  private readonly store: StockAdjustmentStore
  private readonly authStore: AuthStore
  private readonly limit: number
  constructor(store: StockAdjustmentStore, authStore: AuthStore, limit = 500) {
    this.store = store
    this.authStore = authStore
    this.limit = limit
    if (!Number.isInteger(limit) || limit < 1 || limit > 5000) throw new Error('STOCK_ADJUSTMENT_LIST_LIMIT is invalid.')
  }
  private async authorize(account: Account, operation: 'view' | 'add' | 'edit') {
    const permissions = await this.authStore.listPermissions(account.client.id, account.user.roleId)
    if (!permissions.some((permission) => permission[operation] === 1 && normalize(permission.subFeature ?? permission.feature).includes('stockadjustment'))) throw new ApiError(403, 'You do not have permission to perform this action.')
  }
  private input(value: z.infer<typeof base>): AdjustmentInput {
    const products: AdjustmentItem[] = value.products.map((row) => ({ id: row.id ? BigInt(row.id) : null, lineNum: row.lineNum, productId: BigInt(row.productId), variantId: BigInt(row.variantId), qty: row.qty, reason: row.reason }))
    if (new Set(products.map((row) => `${row.productId}:${row.variantId}`)).size !== products.length) throw new ApiError(400, 'Duplicate products are not allowed.')
    if (new Set(products.map((row) => row.lineNum)).size !== products.length) throw new ApiError(400, 'Duplicate line numbers are not allowed.')
    return { date: parseDate(value.stockAdjustmentDate), stockType: value.stockType, reason: value.reason, status: value.status, products }
  }
  private checkResult(result: string) {
    if (result === 'created' || result === 'updated') return
    if (result === 'missing') throw new ApiError(404, 'Stock Adjustment not found.')
    if (result === 'completed') throw new ApiError(400, 'Completed stock adjustment cannot be changed.')
    if (result === 'product_missing') throw new ApiError(422, 'Invalid product.')
    if (result === 'variant_missing') throw new ApiError(422, 'Invalid product variant.')
    if (result === 'insufficient_stock') throw new ApiError(400, 'Adjustment quantity exceeds available variant stock.')
    throw new ApiError(422, 'Invalid stock adjustment transaction.')
  }
  async add(account: Account, input: unknown) { await this.authorize(account, 'add'); const parsed = base.safeParse(input); if (!parsed.success) throw new ApiError(422, 'Invalid stock adjustment.'); this.checkResult(await this.store.create(account, this.input(parsed.data))) }
  async update(account: Account, input: unknown) { await this.authorize(account, 'edit'); const parsed = edit.safeParse(input); if (!parsed.success) throw new ApiError(422, 'Invalid stock adjustment.'); this.checkResult(await this.store.update(account, BigInt(parsed.data.stockAdjustmentId), this.input(parsed.data))) }
  private line(value: any) { return { ...value, id: Number(value.id), productId: Number(value.productId), variantId: Number(value.variantId) } }
  async one(account: Account, input: unknown) {
    await this.authorize(account, 'view'); const parsed = one.safeParse(input); if (!parsed.success) throw new ApiError(422, 'Invalid stock adjustment ID.')
    const value = await this.store.get(account.client.id, BigInt(parsed.data.stockAdjustmentId)); if (!value) throw new ApiError(404, 'Stock Adjustment not found.')
    return { stockAdjustmentId: Number(value.id), stockAdjustmentDate: formatDate(value.date), stockType: value.stockType, reason: value.reason, totalAmount: value.totalAmount, status: value.status, products: value.products.map((row) => this.line(row)) }
  }
  async many(account: Account, input: unknown) {
    await this.authorize(account, 'view'); const parsed = list.safeParse(input); if (!parsed.success) throw new ApiError(422, 'Invalid stock adjustment filters.')
    const exactDate = parsed.data.stockAdjustmentDate || undefined, fromValue = parsed.data.fromDate || exactDate, toValue = parsed.data.toDate || exactDate
    const fromDate = fromValue ? parseDate(fromValue) : undefined, toDate = toValue ? parseDate(toValue) : undefined
    if (fromDate && toDate && fromDate > toDate) throw new ApiError(422, 'From date cannot be after To date.')
    const status = parsed.data.status === '' || parsed.data.status === null || parsed.data.status === undefined ? undefined : Number(parsed.data.status)
    const result = await this.store.list(account.client.id, { limit: this.limit, ...(parsed.data.reason ? { reason: parsed.data.reason } : {}), ...(fromDate ? { fromDate } : {}), ...(toDate ? { toDate } : {}), ...(status === undefined ? {} : { status }), ...(parsed.data.stockType ? { stockType: parsed.data.stockType } : {}) })
    if (result.truncated) throw new ApiError(422, `Stock adjustment results exceed the ${this.limit} item limit.`)
    if (!result.rows.length) throw new ApiError(404, 'No stock adjustment records found.')
    return result.rows.map((row) => ({ id: Number(row.id), stockAdjustmentDate: formatDate(row.date), stockType: row.stockType, reason: row.reason, userId: Number(row.userId), userName: row.userName, status: row.status }))
  }
  async remove(account: Account, input: unknown) { await this.authorize(account, 'edit'); const parsed = remove.safeParse(input); if (!parsed.success) throw new ApiError(422, 'Invalid stock adjustment product.'); this.checkResult(await this.store.removeLine(account, BigInt(parsed.data.stockAdjustmentId), BigInt(parsed.data.stockAdjustmentTranId))) }
}
