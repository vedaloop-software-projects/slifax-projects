import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { hash } from 'bcryptjs'
import type { AuthConfig } from '../../../models/auth/config.ts'
import type { Account, AuthStore, PermissionRow } from '../../../models/auth/contracts.ts'
import type { ExpenseExportStorage, ExpenseFilters, ExpenseHeadInput, ExpenseRow, ExpenseStore, ExpenseWriteResult } from '../../../models/expense/contracts.ts'
import { createAuthRouter } from '../../auth/router.ts'
import { AuthService } from '../../auth/service.ts'
import { createApp } from '../../system/app.ts'
import { createExpenseRouter } from '../router.ts'
import { ExpenseService } from '../service.ts'

const account: Account = { user: { id: 3n, clientId: 7n, name: 'Admin', mobile: '9876543210', email: 'admin@example.com', passwordHash: null, roleId: 4, updatedAt: null }, client: { id: 7n, businessTypeId: 2, businessName: 'Store', logo: null, address: 'Chennai', city: 'Chennai', startDate: new Date('2025-01-01'), endDate: new Date('2030-12-31') }, businessType: 'Retail', roleTitle: 'Admin' }
class MemoryAuth implements AuthStore {
  permissions: PermissionRow[] = [{ featureId: 1n, feature: 'Expense', featurePriority: 1, subFeatureId: null, subFeature: null, subFeaturePriority: null, view: 1, add: 1, edit: 1 }]
  async findAccountByLogin(login: string) { return login === account.user.email ? account : null } async findAccountByIdentity(id: bigint, client: bigint) { return id === 3n && client === 7n ? account : null }
  async listPermissions() { return this.permissions } async getProfile() { return null } async recordAudit() {} async changePassword() { return new Date() }
}
class MemoryExpense implements ExpenseStore {
  heads = [{ id: 4n, name: 'Travel', status: 1 }]; expenses: ExpenseRow[] = [{ id: 8n, receiptNum: '2026_7_8', transactionDate: new Date('2026-10-07T00:00:00Z'), expenseHeadId: 4n, expenseHeadName: 'Travel', expenseType: 2, amount: 125, remarks: 'Taxi', status: 1 }]
  createResult: ExpenseWriteResult = 'saved'; lastFilters?: ExpenseFilters
  async createHead(_account: Account, value: ExpenseHeadInput) { this.heads.push({ id: 5n, ...value }); return this.createResult }
  async updateHead(_account: Account, id: bigint, value: ExpenseHeadInput) { const row = this.heads.find((item) => item.id === id); if (!row) return 'missing' as const; Object.assign(row, value); return this.createResult }
  async getHead(client: bigint, id: bigint) { return client === 7n ? this.heads.find((item) => item.id === id) ?? null : null }
  async listHeads(_client: bigint, filters: { search?: string; status?: number; page: number; perPage: number }) { const rows = this.heads.filter((row) => (filters.status === undefined || row.status === filters.status) && (!filters.search || row.name.includes(filters.search))); return { rows, total: rows.length } }
  async createExpense(_account: Account, value: { expenseHeadId: bigint; transactionDate: Date; expenseType: number; amount: number; remarks: string | null }) { if (value.expenseHeadId !== 4n) return 'head_missing' as const; this.expenses.push({ id: 9n, receiptNum: '2026_7_9', expenseHeadName: 'Travel', status: 1, ...value }); return this.createResult }
  async cancelExpense(_account: Account, id: bigint) { const row = this.expenses.find((item) => item.id === id); if (!row) return 'missing' as const; row.status = 0; return 'saved' as const }
  async getExpense(client: bigint, id: bigint) { return client === 7n ? this.expenses.find((item) => item.id === id) ?? null : null }
  async listExpenses(_client: bigint, filters: ExpenseFilters, page: number, perPage: number) { this.lastFilters = filters; const rows = this.expenses.slice((page - 1) * perPage, page * perPage); return { rows, total: this.expenses.length } }
  async exportExpenses(_client: bigint, filters: ExpenseFilters, limit: number) { this.lastFilters = filters; return { rows: this.expenses.slice(0, limit), truncated: this.expenses.length > limit } }
  async headExists(client: bigint, id: bigint) { return client === 7n && this.heads.some((item) => item.id === id) }
}
class MemoryExports implements ExpenseExportStorage { rows?: ExpenseRow[]; async save(client: bigint, rows: ExpenseRow[]) { this.rows = rows; return `https://files.test/${client}/expense.csv` } }

async function withApi(action: (base: string, token: string, store: MemoryExpense, auth: MemoryAuth, exports: MemoryExports) => Promise<void>, exportLimit = 100) {
  const authStore = new MemoryAuth(), store = new MemoryExpense(), exports = new MemoryExports(); account.user.passwordHash = await hash('Valid1!', 4)
  const config: AuthConfig = { jwtSecret: new TextEncoder().encode('expense-test-secret-with-at-least-32-bytes'), jwtIssuer: 'test', jwtAudience: 'test', jwtLifetime: '1h', publicBaseUrl: '' }
  const auth = new AuthService(authStore, config, () => new Date('2026-10-07')), service = new ExpenseService(store, authStore, exports, 25, exportLimit), server = createServer(createApp(undefined, [createAuthRouter(auth), createExpenseRouter(auth, service)]))
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); const address = server.address(); assert.ok(address && typeof address !== 'string')
  try { const base = `http://127.0.0.1:${address.port}/api`, login = await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobileEmail: account.user.email, password: 'Valid1!' }) }), body = await login.json() as any; await action(base, body.data.user.token, store, authStore, exports) } finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) }
}
const headers = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })
const post = (base: string, path: string, token: string, body: unknown) => fetch(`${base}/${path}`, { method: 'POST', headers: headers(token), body: JSON.stringify(body) })

test('expense heads support tenant-scoped create, update, detail and bounded list contracts', async () => { await withApi(async (base, token, store) => {
  assert.equal((await post(base, 'addExpenseHead', token, { expenseHead: 'Meals', status: 1 })).status, 200)
  assert.equal((await post(base, 'updateExpenseHead', token, { id: 5, expenseHead: 'Food', status: 0 })).status, 200)
  const detail = await (await post(base, 'getExpenseHeadById', token, { id: 5 })).json() as any; assert.equal(detail.data.expenseHead, 'Food')
  const list = await (await post(base, 'getExpenseHeads', token, { searchStr: null, status: null, page: null })).json() as any; assert.equal(list.data.pagination.perPage, 25); assert.equal(store.heads.length, 2)
}) })

test('expense creation validates dates, tenant-owned heads and permissions', async () => { await withApi(async (base, token, _store, auth) => {
  const good = { expenseHeadId: 4, transactionDate: '07-10-2026', expenseType: 2, amount: 50, remarks: null }
  assert.equal((await post(base, 'addExpense', token, good)).status, 200)
  assert.equal((await post(base, 'addExpense', token, { ...good, expenseHeadId: 99 })).status, 422)
  assert.equal((await post(base, 'addExpense', token, { ...good, transactionDate: '31-02-2026' })).status, 422)
  auth.permissions[0]!.add = 0; assert.equal((await post(base, 'addExpense', token, good)).status, 403)
}) })

test('expense list, detail and cancellation preserve response fields', async () => { await withApi(async (base, token, store) => {
  const filters = { fromDate: '01-10-2026', toDate: '31-10-2026', expenseHeadId: 4, expenseType: null, status: null, page: 1 }
  const list = await (await post(base, 'getExpenses', token, filters)).json() as any; assert.equal(list.data.expenses[0].transactionDate, '07-10-2026'); assert.equal(store.lastFilters?.expenseHeadId, 4n)
  const detail = await (await post(base, 'getExpenseById', token, { id: 8 })).json() as any; assert.equal(detail.data.receiptNum, '2026_7_8')
  assert.equal((await post(base, 'cancelExpense', token, { id: 8 })).status, 200); assert.equal(store.expenses[0]!.status, 0)
  assert.equal((await post(base, 'getExpenses', token, { ...filters, fromDate: '31-10-2026', toDate: '01-10-2026' })).status, 422)
}) })

test('expense export uses storage and rejects empty or oversized exports', async () => { await withApi(async (base, token, store, _auth, exports) => {
  const filters = { fromDate: null, toDate: null, expenseHeadId: null, expenseType: null, status: null }
  const body = await (await post(base, 'exportExpenses', token, filters)).json() as any; assert.equal(body.data.fileUrl, 'https://files.test/7/expense.csv'); assert.equal(exports.rows?.length, 1)
  store.expenses = []; assert.equal((await post(base, 'exportExpenses', token, filters)).status, 404)
})
  await withApi(async (base, token, store) => { store.expenses.push({ ...store.expenses[0]!, id: 9n }); assert.equal((await post(base, 'exportExpenses', token, { fromDate: null, toDate: null, expenseHeadId: null, expenseType: null, status: null })).status, 422) }, 1)
})

test('closed expense dates reject before creating an expense', async () => {
  const { PrismaExpenseStore } = await import('../../../models/expense/prisma-store.ts')
  let queried: any
  const fake = { $transaction: async (work: any) => work({ dayCloseDetails: { findFirst: async (query: any) => { queried = query; return { id: 1n } } } }) }
  const account = { client: { id: 8n }, user: { id: 13n } } as Account
  await assert.rejects(() => new PrismaExpenseStore(fake as any).createExpense(account, { expenseHeadId: 1n, transactionDate: new Date('2026-10-23T00:00:00Z'), expenseType: 2, amount: 100, remarks: null }), /Day is closed/)
  assert.equal(queried.where.client_id, 8n)
  assert.equal(queried.where.day_close_date.gte.toISOString(), '2026-10-22T18:30:00.000Z')
})
