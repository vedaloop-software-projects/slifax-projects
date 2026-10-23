import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Account, AuthStore, PermissionRow } from '../../../models/auth/contracts.ts'
import type { AdjustmentDetail, AdjustmentInput, AdjustmentListFilter, AdjustmentResult, StockAdjustmentStore } from '../../../models/stock-adjustment/contracts.ts'
import { ApiError } from '../../auth/service.ts'
import { StockAdjustmentService } from '../service.ts'

const account: Account = { user: { id: 3n, clientId: 7n, name: 'A', mobile: '9', email: 'a@x', passwordHash: null, roleId: 4, updatedAt: null }, client: { id: 7n, businessTypeId: 1, businessName: 'S', logo: null, address: '', city: '', startDate: new Date('2025-01-01'), endDate: new Date('2030-01-01') }, businessType: 'Retail', roleTitle: 'Admin' }
class Auth implements AuthStore { permissions: PermissionRow[] = [{ featureId: 1n, feature: 'Stock Adjustment', featurePriority: 1, subFeatureId: null, subFeature: null, subFeaturePriority: null, view: 1, add: 1, edit: 1 }]; async findAccountByLogin() { return null } async findAccountByIdentity() { return null } async listPermissions() { return this.permissions } async getProfile() { return null } async recordAudit() {} async changePassword() { return new Date() } }
const detail: AdjustmentDetail = { id: 1n, date: new Date('2026-10-01T00:00:00Z'), stockType: 'IN', reason: 'Correction', totalAmount: 20, status: 0, products: [{ id: 2n, lineNum: 1, productId: 3n, variantId: 4n, costPrice: 10, mrp: 15, qty: 2, reason: 'Correction', productFullName: 'Tea', productShortName: 'Tea', productCode: 'P1', variantCode: '007-00003-004', eanCode: '8900000000001', packSize: '1 kg' }] }
class Store implements StockAdjustmentStore {
  result: AdjustmentResult = 'created'; saved?: AdjustmentInput; filters?: AdjustmentListFilter
  async create(_account: Account, value: AdjustmentInput) { this.saved = value; return this.result }
  async update(_account: Account, _id: bigint, value: AdjustmentInput) { this.saved = value; return this.result }
  async get() { return this.result === 'missing' ? null : detail }
  async list(_clientId: bigint, filters: AdjustmentListFilter) { this.filters = filters; return { rows: [{ id: 1n, date: detail.date, stockType: 'IN' as const, reason: 'Correction', userId: 3n, userName: 'A', status: 0 }], truncated: false } }
  async removeLine() { return this.result }
}
const input = { stockAdjustmentDate: '01-10-2026', stockType: 'IN', reason: 'Correction', status: 0, products: [{ lineNum: 1, productId: 3, variantId: 4, qty: 2, reason: 'Correction' }] }

test('stock adjustment writes preserve direction and validate dates and unique lines', async () => {
  const store = new Store(), service = new StockAdjustmentService(store, new Auth())
  await service.add(account, input)
  assert.equal(store.saved?.stockType, 'IN'); assert.equal(store.saved?.products[0]?.variantId, 4n)
  await assert.rejects(() => service.add(account, { ...input, products: [input.products[0], input.products[0]] }), (error: ApiError) => error.status === 400)
  await assert.rejects(() => service.add(account, { ...input, stockAdjustmentDate: '31-02-2026' }), (error: ApiError) => error.status === 422)
  store.result = 'insufficient_stock'; await assert.rejects(() => service.add(account, { ...input, stockType: 'OUT' }), (error: ApiError) => error.status === 400)
  store.result = 'completed'; await assert.rejects(() => service.update(account, { stockAdjustmentId: 1, ...input }), (error: ApiError) => error.status === 400)
})

test('stock adjustment reads preserve direction and pass server-side date filters', async () => {
  const store = new Store(), service = new StockAdjustmentService(store, new Auth(), 10), one = await service.one(account, { stockAdjustmentId: 1 })
  assert.equal(one.stockType, 'IN'); assert.equal(one.products[0]!.variantId, 4); assert.equal(one.products[0]!.variantCode, '007-00003-004'); assert.equal(one.products[0]!.eanCode, '8900000000001'); assert.equal(one.stockAdjustmentDate, '01-10-2026')
  const rows = await service.many(account, { reason: null, fromDate: '01-10-2026', toDate: '02-10-2026', status: '0', stockType: 'IN' })
  assert.equal(rows[0]!.stockType, 'IN'); assert.equal(store.filters?.fromDate?.toISOString(), '2026-10-01T00:00:00.000Z'); assert.equal(store.filters?.toDate?.toISOString(), '2026-10-02T00:00:00.000Z'); assert.equal(store.filters?.status, 0)
  await assert.rejects(() => service.many(account, { reason: null, fromDate: '03-10-2026', toDate: '02-10-2026' }), (error: ApiError) => error.status === 422)
  store.list = async () => ({ rows: [], truncated: true }); await assert.rejects(() => service.many(account, { reason: null, stockAdjustmentDate: null }), (error: ApiError) => error.status === 422)
})

test('stock adjustment operations enforce server permissions', async () => { const auth = new Auth(), service = new StockAdjustmentService(new Store(), auth); auth.permissions[0]!.edit = 0; await assert.rejects(() => service.remove(account, { stockAdjustmentId: 1, stockAdjustmentTranId: 2 }), (error: ApiError) => error.status === 403) })
