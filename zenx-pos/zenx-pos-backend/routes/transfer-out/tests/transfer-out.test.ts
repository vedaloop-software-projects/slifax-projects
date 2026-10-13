import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Account, AuthStore, PermissionRow } from '../../../models/auth/contracts.ts'
import type { TransferOutDetail, TransferOutInput, TransferOutResult, TransferOutStore } from '../../../models/transfer-out/contracts.ts'
import { ApiError } from '../../auth/service.ts'
import { TransferOutService } from '../service.ts'

const account: Account = {
  user: { id: 3n, clientId: 7n, name: 'A', mobile: '9', email: 'a@x', passwordHash: null, roleId: 4, updatedAt: null },
  client: { id: 7n, businessTypeId: 1, businessName: 'S', logo: null, address: '', city: '', startDate: new Date('2025-01-01'), endDate: new Date('2030-01-01') },
  businessType: 'Retail',
  roleTitle: 'Admin',
}

class Permissions implements AuthStore {
  permissions: PermissionRow[] = [{ featureId: 1n, feature: 'Transfer Out', featurePriority: 1, subFeatureId: null, subFeature: null, subFeaturePriority: null, view: 1, add: 1, edit: 1 }]
  async findAccountByLogin() { return null }
  async findAccountByIdentity() { return null }
  async listPermissions() { return this.permissions }
  async getProfile() { return null }
  async recordAudit() {}
  async changePassword() { return new Date() }
}

const detail: TransferOutDetail = {
  id: 1n,
  number: 10n,
  date: new Date('2026-10-01T00:00:00Z'),
  sendTo: 'Shop',
  remarks: 'Restock branch',
  totalAmount: 20,
  status: 0,
  products: [{ id: 2n, lineNum: 1, productId: 3n, variantId: 4n, costPrice: 10, mrp: 15, qty: 2, productFullName: 'Tea', productShortName: 'Tea', productCode: 'P1', packSize: '1 kg' }],
}

class Store implements TransferOutStore {
  result: TransferOutResult = 'created'
  saved?: TransferOutInput
  async numbers() { return { last: 10n, next: 11n } }
  async create(_account: Account, input: TransferOutInput) { this.saved = input; return this.result }
  async update(_account: Account, _id: bigint, input: TransferOutInput) { this.saved = input; return this.result }
  async get() { return this.result === 'missing' ? null : detail }
  async list() { return { rows: [{ id: 1n, number: 10n, date: detail.date, sendTo: 'Shop', remarks: 'Restock branch', userId: 3n, userName: 'A', status: 0 }], truncated: false } }
  async removeLine() { return this.result }
}

const input = { transferOutDate: '01-10-2026', sendTo: 'Shop', remarks: 'Restock branch', status: 0, products: [{ lineNum: 1, productId: 3, variantId: 4, qty: 2 }] }

test('transfer out numbers and writes validate lines, stock, and immutable results', async () => {
  const store = new Store()
  const service = new TransferOutService(store, new Permissions())
  assert.deepEqual(await service.numbers(account), { lastTransferOutNumber: 10, nextTransferOutNumber: 11 })
  await service.add(account, input)
  assert.equal(store.saved?.sendTo, 'Shop')
  await assert.rejects(() => service.add(account, { ...input, products: [input.products[0], input.products[0]] }), (error: ApiError) => error.status === 400)
  store.result = 'insufficient_stock'
  await assert.rejects(() => service.add(account, input), (error: ApiError) => error.status === 400)
  store.result = 'completed'
  await assert.rejects(() => service.update(account, { transferOutId: 1, ...input }), (error: ApiError) => error.status === 400)
})

test('transfer out detail and lists preserve safe IDs and bounded results', async () => {
  const store = new Store()
  const service = new TransferOutService(store, new Permissions(), 10)
  const one = await service.one(account, { transferOutId: 1 })
  assert.equal(one.transferOutNumber, 10)
  assert.equal(one.remarks, 'Restock branch')
  assert.equal((await service.many(account, { transferOutNumber: null, transferOutDate: null }))[0]?.userId, 3)
  store.list = async () => ({ rows: [], truncated: true })
  await assert.rejects(() => service.many(account, { transferOutNumber: null, transferOutDate: null }), (error: ApiError) => error.status === 422)
})

test('transfer out mutations require edit grants', async () => {
  const permissions = new Permissions()
  const service = new TransferOutService(new Store(), permissions)
  permissions.permissions[0]!.edit = 0
  await assert.rejects(() => service.remove(account, { transferOutId: 1, transferTranId: 2 }), (error: ApiError) => error.status === 403)
})

test('transfer out accepts legacy snake-case payloads and omitted remarks', async () => {
  const store = new Store()
  const service = new TransferOutService(store, new Permissions())
  await service.add(account, { transfer_out_date: '01-10-2026', send_to: 'Branch', status: 0, products: [{ product_id: 3, variant_id: 4, qty: 2 }] })
  assert.equal(store.saved?.products[0]?.lineNum, 1)
  assert.equal(store.saved?.remarks, null)
  assert.equal(store.saved?.sendTo, 'Branch')
})
