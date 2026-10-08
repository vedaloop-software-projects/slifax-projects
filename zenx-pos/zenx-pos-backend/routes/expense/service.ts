import { z } from 'zod'
import type { Account, AuthStore, PermissionRow } from '../../models/auth/contracts.ts'
import type { ExpenseExportStorage, ExpenseFilters, ExpenseRow, ExpenseStore } from '../../models/expense/contracts.ts'
import { ApiError } from '../auth/service.ts'

const id = z.number().int().positive().safe()
const status = z.union([z.literal(0), z.literal(1)])
const head = z.object({ expenseHead: z.string().trim().min(1).max(100), status }).strict()
const headUpdate = head.extend({ id })
const byId = z.object({ id }).strict()
const headList = z.object({ searchStr: z.string().trim().max(100).nullable(), status: status.nullable(), page: id.nullable() }).strict()
const dateText = z.string().regex(/^\d{2}-\d{2}-\d{4}$/).nullable()
const expenseFilters = z.object({ fromDate: dateText, toDate: dateText, expenseHeadId: id.nullable(), expenseType: z.union([z.literal(1), z.literal(2)]).nullable(), status: status.nullable() }).strict()
const expenseList = expenseFilters.extend({ page: id.nullable() })
const expense = z.object({ expenseHeadId: id, transactionDate: z.string().regex(/^\d{2}-\d{2}-\d{4}$/), expenseType: z.union([z.literal(1), z.literal(2)]), amount: z.number().finite().min(1), remarks: z.string().trim().max(255).nullable() }).strict()

function parseDate(value: string) {
  const [day, month, year] = value.split('-').map(Number)
  const result = new Date(Date.UTC(year!, month! - 1, day))
  if (result.getUTCFullYear() !== year || result.getUTCMonth() !== month! - 1 || result.getUTCDate() !== day) throw new ApiError(422, 'Invalid date.')
  return result
}
function formatDate(value: Date) { return `${String(value.getUTCDate()).padStart(2, '0')}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${value.getUTCFullYear()}` }
function safeId(value: bigint) { const number = Number(value); if (!Number.isSafeInteger(number)) throw new Error('Database ID exceeds the legacy JSON number range.'); return number }
function normalized(value: string) { return value.toLowerCase().replace(/[^a-z0-9]/g, '') }
function granted(row: PermissionRow, action: 'view' | 'add' | 'edit') { return row[action] === 1 }

export class ExpenseService {
  private readonly store: ExpenseStore
  private readonly authStore: AuthStore
  private readonly exports: ExpenseExportStorage
  private readonly perPage: number
  private readonly exportLimit: number
  constructor(store: ExpenseStore, authStore: AuthStore, exports: ExpenseExportStorage, perPage = 25, exportLimit = 10_000) {
    if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) throw new Error('EXPENSE_PAGE_SIZE must be between 1 and 100.')
    if (!Number.isInteger(exportLimit) || exportLimit < 1 || exportLimit > 100_000) throw new Error('EXPENSE_EXPORT_LIMIT must be between 1 and 100000.')
    this.store = store; this.authStore = authStore; this.exports = exports; this.perPage = perPage; this.exportLimit = exportLimit
  }
  private async authorize(account: Account, action: 'view' | 'add' | 'edit') {
    const rows = await this.authStore.listPermissions(account.client.id, account.user.roleId)
    if (!rows.some((row) => granted(row, action) && normalized(row.subFeature ?? row.feature).includes('expense'))) throw new ApiError(403, 'You do not have permission to perform this action.')
  }
  private async filters(account: Account, value: z.infer<typeof expenseFilters>): Promise<ExpenseFilters> {
    if (value.expenseHeadId !== null && !await this.store.headExists(account.client.id, BigInt(value.expenseHeadId))) throw new ApiError(422, 'Expense head not found.')
    const fromDate = value.fromDate ? parseDate(value.fromDate) : undefined, toDate = value.toDate ? parseDate(value.toDate) : undefined
    if (fromDate && toDate && fromDate > toDate) throw new ApiError(422, 'From date must be before or equal to to date.')
    return { ...(fromDate ? { fromDate } : {}), ...(toDate ? { toDate } : {}), ...(value.expenseHeadId === null ? {} : { expenseHeadId: BigInt(value.expenseHeadId) }), ...(value.expenseType === null ? {} : { expenseType: value.expenseType }), ...(value.status === null ? {} : { status: value.status }) }
  }
  private row(value: ExpenseRow) { return { id: safeId(value.id), receiptNum: value.receiptNum, transactionDate: formatDate(value.transactionDate), expenseHeadId: safeId(value.expenseHeadId), expenseHeadName: value.expenseHeadName, expenseType: value.expenseType, amount: value.amount, remarks: value.remarks ?? '', status: value.status } }

  async addHead(account: Account, input: unknown) { await this.authorize(account, 'add'); const parsed = head.safeParse(input); if (!parsed.success) throw new ApiError(422, 'Invalid expense head details.'); const result = await this.store.createHead(account, { name: parsed.data.expenseHead, status: parsed.data.status }); if (result === 'name_duplicate') throw new ApiError(400, 'Expense Head already exists.') }
  async updateHead(account: Account, input: unknown) { await this.authorize(account, 'edit'); const parsed = headUpdate.safeParse(input); if (!parsed.success) throw new ApiError(422, 'Invalid expense head details.'); const result = await this.store.updateHead(account, BigInt(parsed.data.id), { name: parsed.data.expenseHead, status: parsed.data.status }); if (result === 'missing') throw new ApiError(422, 'Expense Head not found.'); if (result === 'name_duplicate') throw new ApiError(400, 'Expense Head already exists.') }
  async getHead(account: Account, input: unknown) { await this.authorize(account, 'view'); const parsed = byId.safeParse(input); if (!parsed.success) throw new ApiError(422, 'Invalid expense head ID.'); const row = await this.store.getHead(account.client.id, BigInt(parsed.data.id)); if (!row) throw new ApiError(404, 'Expense Head details not found.'); return { id: safeId(row.id), expenseHead: row.name, status: row.status } }
  async getHeads(account: Account, input: unknown) { await this.authorize(account, 'view'); const parsed = headList.safeParse(input); if (!parsed.success) throw new ApiError(422, 'Invalid expense head filters.'); const page = parsed.data.page ?? 1; const result = await this.store.listHeads(account.client.id, { page, perPage: this.perPage, ...(parsed.data.searchStr ? { search: parsed.data.searchStr } : {}), ...(parsed.data.status === null ? {} : { status: parsed.data.status }) }); return { expenseHeads: result.rows.map((row) => ({ id: safeId(row.id), expenseHead: row.name, status: row.status })), pagination: { currentPage: page, lastPage: Math.max(1, Math.ceil(result.total / this.perPage)), perPage: this.perPage, totalRecords: result.total } } }
  async addExpense(account: Account, input: unknown) { await this.authorize(account, 'add'); const parsed = expense.safeParse(input); if (!parsed.success) throw new ApiError(422, 'Invalid expense details.'); const result = await this.store.createExpense(account, { expenseHeadId: BigInt(parsed.data.expenseHeadId), transactionDate: parseDate(parsed.data.transactionDate), expenseType: parsed.data.expenseType, amount: parsed.data.amount, remarks: parsed.data.remarks || null }); if (result === 'head_missing') throw new ApiError(422, 'Expense head not found.') }
  async cancelExpense(account: Account, input: unknown) { await this.authorize(account, 'edit'); const parsed = byId.safeParse(input); if (!parsed.success) throw new ApiError(422, 'Invalid expense ID.'); if (await this.store.cancelExpense(account, BigInt(parsed.data.id)) === 'missing') throw new ApiError(422, 'Expense not found.') }
  async getExpense(account: Account, input: unknown) { await this.authorize(account, 'view'); const parsed = byId.safeParse(input); if (!parsed.success) throw new ApiError(422, 'Invalid expense ID.'); const row = await this.store.getExpense(account.client.id, BigInt(parsed.data.id)); if (!row) throw new ApiError(404, 'Expense details not found.'); return this.row(row) }
  async getExpenses(account: Account, input: unknown) { await this.authorize(account, 'view'); const parsed = expenseList.safeParse(input); if (!parsed.success) throw new ApiError(422, 'Invalid expense filters.'); const page = parsed.data.page ?? 1; const filters = await this.filters(account, parsed.data); const result = await this.store.listExpenses(account.client.id, filters, page, this.perPage); return { expenses: result.rows.map((row) => this.row(row)), pagination: { currentPage: page, lastPage: Math.max(1, Math.ceil(result.total / this.perPage)), perPage: this.perPage, totalRecords: result.total } } }
  async exportExpenses(account: Account, input: unknown) { await this.authorize(account, 'view'); const parsed = expenseFilters.safeParse(input); if (!parsed.success) throw new ApiError(422, 'Invalid expense filters.'); const result = await this.store.exportExpenses(account.client.id, await this.filters(account, parsed.data), this.exportLimit); if (!result.rows.length) throw new ApiError(404, 'No expenses found.'); if (result.truncated) throw new ApiError(422, `Export exceeds the ${this.exportLimit} row limit. Narrow the filters.`); return { fileUrl: await this.exports.save(account.client.id, result.rows) } }
}
