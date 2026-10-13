import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { hash } from 'bcryptjs'
import type { AuthConfig } from '../../../models/auth/config.ts'
import type { Account, AuthStore, PermissionRow } from '../../../models/auth/contracts.ts'
import type { CategoryInput, CategoryRow, ListFilters, MasterStore, NamedMasterInput, NamedMasterRow, PaymentModeInput, PaymentModeRow, SalesManFilters, SalesManInput, SalesManRow, SimpleMasterInput, SimpleMasterRow, SubCategoryFilters, SubCategoryInput, SubCategoryRow, TableFilters, TableInput, TableRow, TaxInput, TaxRow, WriteResult } from '../../../models/master/contracts.ts'
import { AuthService } from '../../auth/service.ts'
import { createAuthRouter } from '../../auth/router.ts'
import { createApp } from '../../system/app.ts'
import { createMasterRouter } from '../router.ts'
import { MasterService } from '../service.ts'

const account: Account = {
  user: { id: 3n, clientId: 7n, name: 'Praveen', mobile: '9876543210', email: 'p@example.com', passwordHash: null, roleId: 4, updatedAt: null },
  client: { id: 7n, businessTypeId: 2, businessName: 'Demo Store', logo: null, address: 'Chennai', city: 'Chennai', startDate: new Date('2025-01-01'), endDate: new Date('2030-12-31') },
  businessType: 'Retail', roleTitle: 'Admin',
}

class MemoryAuthStore implements AuthStore {
  permissions: PermissionRow[] = [{ featureId: 1n, feature: 'Master', featurePriority: 1, subFeatureId: 2n, subFeature: 'Categories', subFeaturePriority: 1, view: 1, add: 1, edit: 1 }]
  async findAccountByLogin(login: string) { return login === account.user.email ? account : null }
  async findAccountByIdentity(userId: bigint, clientId: bigint) { return userId === account.user.id && clientId === account.client.id ? account : null }
  async listPermissions() { return this.permissions }
  async getProfile() { return null }
  async recordAudit() {}
  async changePassword() { return new Date() }
}

class MemoryMasterStore implements MasterStore {
  categories: CategoryRow[] = [{ id: 10n, code: 'FOOD', name: 'Food', printerPath: null, status: 1 }]
  subCategories: SubCategoryRow[] = [{ id: 20n, categoryId: 10n, categoryCode: 'FOOD', categoryName: 'Food', code: 'SNACK', name: 'Snacks', status: 1 }]
  brands: SimpleMasterRow[] = [{ id: 30n, code: 'ACME', name: 'Acme', status: 1 }]
  colours: SimpleMasterRow[] = [{ id: 40n, code: 'BLK', name: 'Black', status: 1 }]
  sizes: SimpleMasterRow[] = [{ id: 50n, code: 'L', name: 'Large', status: 1 }]
  unitTypes: SimpleMasterRow[] = [{ id: 60n, code: 'PCS', name: 'Pieces', status: 1 }]
  teams: SimpleMasterRow[] = [{ id: 70n, code: 'OPS', name: 'Operations', status: 1 }]
  paymentModes: PaymentModeRow[] = [{ id: 80n, name: 'Cash', allowChange: 1, status: 1 }]
  taxes: TaxRow[] = [{ id: 90n, code: 'GST5', name: 'GST 5%', percent: 5, status: 1 }]
  salesMans: SalesManRow[] = [{ id: 100n, teamId: 70n, teamName: 'Operations', code: 'SM1', name: 'Kumar', commissionPercent: '5', status: 1 }]
  floors: SimpleMasterRow[] = [{ id: 110n, code: 'G', name: 'Ground', status: 1 }]
  tableTypes: NamedMasterRow[] = [{ id: 120n, name: 'Dining', status: 1 }]
  tables: TableRow[] = [{ id: 130n, floorId: 110n, floorName: 'Ground', tableTypeId: 120n, tableType: 'Dining', code: 'T1', name: 'Table 1', capacity: 4, acNonAc: 1, underMaintenance: 0, status: 1 }]
  roles: NamedMasterRow[] = [{ id: 140n, name: 'Cashier', status: 1 }]
  lastClient?: bigint
  lastList?: ListFilters | SubCategoryFilters
  result?: WriteResult
  async listFeatures() { return [{ id: 1n, feature: 'Master', subFeatures: [{ id: 2n, featureId: 1n, subFeature: 'Categories' }] }] }
  async listCategories(clientId: bigint, filters: ListFilters) { this.lastClient = clientId; this.lastList = filters; return { rows: this.categories, total: this.categories.length } }
  async getCategory(clientId: bigint, id: bigint) { this.lastClient = clientId; return clientId === 7n ? this.categories.find((row) => row.id === id) ?? null : null }
  async createCategory(received: Account, value: CategoryInput) { this.lastClient = received.client.id; if (this.result) return this.result; this.categories.push({ id: 11n, ...value }); return 'saved' as const }
  async updateCategory(received: Account, id: bigint, value: CategoryInput) { this.lastClient = received.client.id; if (this.result) return this.result; const row = this.categories.find((item) => item.id === id); if (!row) return 'missing' as const; Object.assign(row, value); return 'saved' as const }
  async listSubCategories(clientId: bigint, filters: SubCategoryFilters) { this.lastClient = clientId; this.lastList = filters; return { rows: this.subCategories, total: this.subCategories.length } }
  async getSubCategory(clientId: bigint, id: bigint) { this.lastClient = clientId; return clientId === 7n ? this.subCategories.find((row) => row.id === id) ?? null : null }
  async createSubCategory(received: Account, value: SubCategoryInput) { this.lastClient = received.client.id; if (this.result) return this.result; if (!this.categories.some((row) => row.id === value.categoryId)) return 'parent_missing' as const; this.subCategories.push({ id: 21n, ...value, categoryCode: 'FOOD', categoryName: 'Food' }); return 'saved' as const }
  async updateSubCategory(received: Account, id: bigint, value: SubCategoryInput) { this.lastClient = received.client.id; if (this.result) return this.result; if (!this.categories.some((row) => row.id === value.categoryId)) return 'parent_missing' as const; const row = this.subCategories.find((item) => item.id === id); if (!row) return 'missing' as const; Object.assign(row, value); return 'saved' as const }
  async listBrands(clientId: bigint, filters: ListFilters) { this.lastClient = clientId; this.lastList = filters; return { rows: this.brands, total: this.brands.length } }
  async getBrand(clientId: bigint, id: bigint) { this.lastClient = clientId; return clientId === 7n ? this.brands.find((row) => row.id === id) ?? null : null }
  async createBrand(received: Account, value: SimpleMasterInput) { this.lastClient = received.client.id; if (this.result) return this.result; this.brands.push({ id: 31n, ...value }); return 'saved' as const }
  async updateBrand(received: Account, id: bigint, value: SimpleMasterInput) { this.lastClient = received.client.id; if (this.result) return this.result; const row = this.brands.find((item) => item.id === id); if (!row) return 'missing' as const; Object.assign(row, value); return 'saved' as const }
  async listColours(clientId: bigint, filters: ListFilters) { this.lastClient = clientId; this.lastList = filters; return { rows: this.colours, total: this.colours.length } }
  async getColour(clientId: bigint, id: bigint) { this.lastClient = clientId; return clientId === 7n ? this.colours.find((row) => row.id === id) ?? null : null }
  async createColour(received: Account, value: SimpleMasterInput) { this.lastClient = received.client.id; if (this.result) return this.result; this.colours.push({ id: 41n, ...value }); return 'saved' as const }
  async updateColour(received: Account, id: bigint, value: SimpleMasterInput) { this.lastClient = received.client.id; if (this.result) return this.result; const row = this.colours.find((item) => item.id === id); if (!row) return 'missing' as const; Object.assign(row, value); return 'saved' as const }
  async listSizes(clientId: bigint, filters: ListFilters) { this.lastClient = clientId; this.lastList = filters; return { rows: this.sizes, total: this.sizes.length } }
  async getSize(clientId: bigint, id: bigint) { this.lastClient = clientId; return clientId === 7n ? this.sizes.find((row) => row.id === id) ?? null : null }
  async createSize(received: Account, value: SimpleMasterInput) { this.lastClient = received.client.id; if (this.result) return this.result; this.sizes.push({ id: 51n, ...value }); return 'saved' as const }
  async updateSize(received: Account, id: bigint, value: SimpleMasterInput) { this.lastClient = received.client.id; if (this.result) return this.result; const row = this.sizes.find((item) => item.id === id); if (!row) return 'missing' as const; Object.assign(row, value); return 'saved' as const }
  async listUnitTypes(clientId: bigint, filters: ListFilters) { this.lastClient = clientId; this.lastList = filters; return { rows: this.unitTypes, total: this.unitTypes.length } }
  async getUnitType(clientId: bigint, id: bigint) { this.lastClient = clientId; return clientId === 7n ? this.unitTypes.find((row) => row.id === id) ?? null : null }
  async createUnitType(received: Account, value: SimpleMasterInput) { this.lastClient = received.client.id; if (this.result) return this.result; this.unitTypes.push({ id: 61n, ...value }); return 'saved' as const }
  async updateUnitType(received: Account, id: bigint, value: SimpleMasterInput) { this.lastClient = received.client.id; if (this.result) return this.result; const row = this.unitTypes.find((item) => item.id === id); if (!row) return 'missing' as const; Object.assign(row, value); return 'saved' as const }
  async listTeams(clientId: bigint, filters: ListFilters) { this.lastClient = clientId; this.lastList = filters; return { rows: this.teams, total: this.teams.length } }
  async getTeam(clientId: bigint, id: bigint) { this.lastClient = clientId; return clientId === 7n ? this.teams.find((row) => row.id === id) ?? null : null }
  async createTeam(received: Account, value: SimpleMasterInput) { this.lastClient = received.client.id; if (this.result) return this.result; this.teams.push({ id: 71n, ...value }); return 'saved' as const }
  async updateTeam(received: Account, id: bigint, value: SimpleMasterInput) { this.lastClient = received.client.id; if (this.result) return this.result; const row = this.teams.find((item) => item.id === id); if (!row) return 'missing' as const; Object.assign(row, value); return 'saved' as const }
  async listPaymentModes(clientId: bigint, filters: ListFilters) { this.lastClient = clientId; this.lastList = filters; return { rows: this.paymentModes, total: this.paymentModes.length } }
  async getPaymentMode(clientId: bigint, id: bigint) { this.lastClient = clientId; return clientId === 7n ? this.paymentModes.find((row) => row.id === id) ?? null : null }
  async createPaymentMode(received: Account, value: PaymentModeInput) { this.lastClient = received.client.id; if (this.result) return this.result; this.paymentModes.push({ id: 81n, ...value }); return 'saved' as const }
  async updatePaymentMode(received: Account, id: bigint, value: PaymentModeInput) { this.lastClient = received.client.id; if (this.result) return this.result; const row = this.paymentModes.find((item) => item.id === id); if (!row) return 'missing' as const; Object.assign(row, value); return 'saved' as const }
  async listTaxes(clientId: bigint, filters: ListFilters) { this.lastClient = clientId; this.lastList = filters; return { rows: this.taxes, total: this.taxes.length } }
  async getTax(clientId: bigint, id: bigint) { this.lastClient = clientId; return clientId === 7n ? this.taxes.find((row) => row.id === id) ?? null : null }
  async createTax(received: Account, value: TaxInput) { this.lastClient = received.client.id; if (this.result) return this.result; this.taxes.push({ id: 91n, ...value }); return 'saved' as const }
  async updateTax(received: Account, id: bigint, value: TaxInput) { this.lastClient = received.client.id; if (this.result) return this.result; const row = this.taxes.find((item) => item.id === id); if (!row) return 'missing' as const; Object.assign(row, value); return 'saved' as const }
  async listSalesMans(clientId: bigint, filters: SalesManFilters) { this.lastClient = clientId; this.lastList = filters; return { rows: this.salesMans, total: this.salesMans.length } }
  async getSalesMan(clientId: bigint, id: bigint) { this.lastClient = clientId; return clientId === 7n ? this.salesMans.find((row) => row.id === id) ?? null : null }
  async createSalesMan(received: Account, value: SalesManInput) { this.lastClient = received.client.id; if (this.result) return this.result; if (value.teamId !== null && !this.teams.some((row) => row.id === value.teamId)) return 'parent_missing' as const; this.salesMans.push({ id: 101n, teamName: value.teamId ? 'Operations' : '', ...value }); return 'saved' as const }
  async updateSalesMan(received: Account, id: bigint, value: SalesManInput) { this.lastClient = received.client.id; if (this.result) return this.result; const row = this.salesMans.find((item) => item.id === id); if (!row) return 'missing' as const; Object.assign(row, value); return 'saved' as const }
  async listFloors(clientId: bigint, filters: ListFilters) { this.lastClient = clientId; this.lastList = filters; return { rows: this.floors, total: this.floors.length } }
  async getFloor(clientId: bigint, id: bigint) { this.lastClient = clientId; return clientId === 7n ? this.floors.find((row) => row.id === id) ?? null : null }
  async createFloor(received: Account, value: SimpleMasterInput) { this.lastClient = received.client.id; if (this.result) return this.result; this.floors.push({ id: 111n, ...value }); return 'saved' as const }
  async updateFloor(received: Account, id: bigint, value: SimpleMasterInput) { this.lastClient = received.client.id; if (this.result) return this.result; const row = this.floors.find((item) => item.id === id); if (!row) return 'missing' as const; Object.assign(row, value); return 'saved' as const }
  async listTableTypes(clientId: bigint, filters: ListFilters) { this.lastClient = clientId; this.lastList = filters; return { rows: this.tableTypes, total: this.tableTypes.length } }
  async getTableType(clientId: bigint, id: bigint) { this.lastClient = clientId; return clientId === 7n ? this.tableTypes.find((row) => row.id === id) ?? null : null }
  async createTableType(received: Account, value: NamedMasterInput) { this.lastClient = received.client.id; if (this.result) return this.result; this.tableTypes.push({ id: 121n, ...value }); return 'saved' as const }
  async updateTableType(received: Account, id: bigint, value: NamedMasterInput) { this.lastClient = received.client.id; if (this.result) return this.result; const row = this.tableTypes.find((item) => item.id === id); if (!row) return 'missing' as const; Object.assign(row, value); return 'saved' as const }
  async listTables(clientId: bigint, filters: TableFilters) { this.lastClient = clientId; this.lastList = filters; return { rows: this.tables, total: this.tables.length } }
  async getTable(clientId: bigint, id: bigint) { this.lastClient = clientId; return clientId === 7n ? this.tables.find((row) => row.id === id) ?? null : null }
  async createTable(received: Account, value: TableInput) { this.lastClient = received.client.id; if (this.result) return this.result; this.tables.push({ id: 131n, floorName: 'Ground', tableType: 'Dining', ...value }); return 'saved' as const }
  async updateTable(received: Account, id: bigint, value: TableInput) { this.lastClient = received.client.id; if (this.result) return this.result; const row = this.tables.find((item) => item.id === id); if (!row) return 'missing' as const; Object.assign(row, value); return 'saved' as const }
  async listRoles(clientId: bigint, filters: ListFilters) { this.lastClient = clientId; this.lastList = filters; return { rows: this.roles, total: this.roles.length } }
  async getRole(clientId: bigint, id: bigint) { this.lastClient = clientId; return clientId === 7n ? this.roles.find((row) => row.id === id) ?? null : null }
  async createRole(received: Account, value: NamedMasterInput) { this.lastClient = received.client.id; if (this.result) return this.result; this.roles.push({ id: 141n, ...value }); return 'saved' as const }
  async updateRole(received: Account, id: bigint, value: NamedMasterInput) { this.lastClient = received.client.id; if (this.result) return this.result; const row = this.roles.find((item) => item.id === id); if (!row) return 'missing' as const; Object.assign(row, value); return 'saved' as const }
}

async function withApi(action: (base: string, token: string, master: MemoryMasterStore, auth: MemoryAuthStore) => Promise<void>) {
  const authStore = new MemoryAuthStore()
  const masterStore = new MemoryMasterStore()
  account.user.passwordHash = await hash('Valid1!', 4)
  const config: AuthConfig = { jwtSecret: new TextEncoder().encode('master-test-secret-with-at-least-32-bytes'), jwtIssuer: 'test', jwtAudience: 'test', jwtLifetime: '1h', publicBaseUrl: '' }
  const auth = new AuthService(authStore, config, () => new Date('2026-10-07'))
  const master = new MasterService(masterStore, authStore, 2)
  const server = createServer(createApp(undefined, [createAuthRouter(auth), createMasterRouter(auth, master)]))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  try {
    const base = `http://127.0.0.1:${address.port}/api`
    const login = await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobileEmail: account.user.email, password: 'Valid1!' }) })
    const body = await login.json() as any
    await action(base, body.data.user.token, masterStore, authStore)
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
}

const headers = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })

test('feature lookup preserves the nested legacy contract', async () => {
  await withApi(async (base, token) => {
    const response = await fetch(`${base}/features`, { headers: { Authorization: `Bearer ${token}` } })
    assert.equal(response.status, 200)
    const body = await response.json() as any
    assert.deepEqual(body.data, [{ featureId: 1, feature: 'Master', subFeatures: [{ subFeatureId: 2, featureId: 1, subFeature: 'Categories' }] }])
  })
})

test('category CRUD is tenant-bound, validated and paginated', async () => {
  await withApi(async (base, token, store) => {
    const add = await fetch(`${base}/addCategory`, { method: 'POST', headers: headers(token), body: JSON.stringify({ categoryCode: 'DRINK', categoryName: 'Drinks', printerPath: null, status: 1 }) })
    assert.equal(add.status, 200)
    const list = await fetch(`${base}/getCategories`, { method: 'POST', headers: headers(token), body: JSON.stringify({ searchStr: 'drink', status: '1', page: '' }) })
    assert.equal(list.status, 200)
    const listBody = await list.json() as any
    assert.equal(listBody.data.pagination.perPage, 2)
    assert.equal(store.lastClient, 7n)
    assert.deepEqual(store.lastList, { page: 1, perPage: 2, search: 'drink', status: 1 })
    const get = await fetch(`${base}/getCategoryById`, { method: 'POST', headers: headers(token), body: JSON.stringify({ id: 10 }) })
    assert.equal((await get.json() as any).data.categoryCode, 'FOOD')
    const legacyExtra = await fetch(`${base}/addCategory`, { method: 'POST', headers: headers(token), body: JSON.stringify({ categoryCode: 'X', categoryName: 'X', printerPath: null, status: 1, clientId: 99 }) })
    assert.equal(legacyExtra.status, 200)
  })
})

test('category duplicate and missing results map to stable client errors', async () => {
  await withApi(async (base, token, store) => {
    store.result = 'code_duplicate'
    const duplicate = await fetch(`${base}/addCategory`, { method: 'POST', headers: headers(token), body: JSON.stringify({ categoryCode: 'FOOD', categoryName: 'Other', printerPath: null, status: 1 }) })
    assert.equal(duplicate.status, 400)
    assert.deepEqual(await duplicate.json(), { errors: 'Category code already exists.' })
    store.result = 'missing'
    const missing = await fetch(`${base}/updateCategory`, { method: 'POST', headers: headers(token), body: JSON.stringify({ id: 999, categoryCode: 'X', categoryName: 'X', printerPath: null, status: 1 }) })
    assert.equal(missing.status, 422)
  })
})

test('subcategory writes reject a parent outside the tenant boundary', async () => {
  await withApi(async (base, token, store) => {
    store.result = 'parent_missing'
    const response = await fetch(`${base}/addSubCategory`, { method: 'POST', headers: headers(token), body: JSON.stringify({ categoryId: 999, subCategoryCode: 'X', subCategoryName: 'Foreign', status: 1 }) })
    assert.equal(response.status, 422)
    assert.deepEqual(await response.json(), { errors: 'Category not found.' })
    assert.equal(store.lastClient, 7n)
  })
})

test('subcategory reads preserve joins while role permissions are enforced server-side', async () => {
  await withApi(async (base, token, store, auth) => {
    const response = await fetch(`${base}/getSubCategoryById`, { method: 'POST', headers: headers(token), body: JSON.stringify({ id: 20 }) })
    assert.equal(response.status, 200)
    assert.deepEqual((await response.json() as any).data, { id: 20, subCategoryName: 'Snacks', subCategoryCode: 'SNACK', categoryId: 10, categoryName: 'Food', categoryCode: 'FOOD', status: 1 })
    auth.permissions = [{ ...auth.permissions[0], view: 0 }]
    const denied = await fetch(`${base}/getSubCategories`, { method: 'POST', headers: headers(token), body: JSON.stringify({ searchStr: null, categoryId: null, status: null, page: 1 }) })
    assert.equal(denied.status, 403)
    assert.equal(store.lastClient, 7n)
  })
})

test('brand endpoints preserve CRUD contracts, tenant filters and bounded pagination', async () => {
  await withApi(async (base, token, store, auth) => {
    auth.permissions = [{ ...auth.permissions[0], subFeature: 'Brands' }]
    const add = await fetch(`${base}/addBrand`, { method: 'POST', headers: headers(token), body: JSON.stringify({ brandCode: 'ZEN', brandName: 'Zen', status: 1 }) })
    assert.equal(add.status, 200)
    const update = await fetch(`${base}/updateBrand`, { method: 'POST', headers: headers(token), body: JSON.stringify({ id: 30, brandCode: 'ACME2', brandName: 'Acme Two', status: 1 }) })
    assert.equal(update.status, 200)
    const list = await fetch(`${base}/getBrands`, { method: 'POST', headers: headers(token), body: JSON.stringify({ searchStr: null, status: null, page: null }) })
    assert.equal(list.status, 200)
    const body = await list.json() as any
    assert.equal(body.data.pagination.perPage, 2)
    assert.equal(body.data.brands[0].brandCode, 'ACME2')
    assert.deepEqual(store.lastList, { page: 1, perPage: 2 })
    const get = await fetch(`${base}/getBrandById`, { method: 'POST', headers: headers(token), body: JSON.stringify({ id: 30 }) })
    assert.equal((await get.json() as any).data.brandName, 'Acme Two')
    assert.equal(store.lastClient, 7n)
  })
})

test('colour endpoints enforce role permissions and stable duplicate errors', async () => {
  await withApi(async (base, token, store, auth) => {
    auth.permissions = [{ ...auth.permissions[0], subFeature: 'Colours' }]
    const list = await fetch(`${base}/getColours`, { method: 'POST', headers: headers(token), body: JSON.stringify({ searchStr: 'black', status: 1, page: 1 }) })
    assert.equal(list.status, 200)
    assert.deepEqual(store.lastList, { page: 1, perPage: 2, search: 'black', status: 1 })
    const get = await fetch(`${base}/getColourById`, { method: 'POST', headers: headers(token), body: JSON.stringify({ id: 40 }) })
    assert.deepEqual((await get.json() as any).data, { id: 40, colourCode: 'BLK', colourName: 'Black', status: 1 })
    store.result = 'name_duplicate'
    const duplicate = await fetch(`${base}/addColour`, { method: 'POST', headers: headers(token), body: JSON.stringify({ colourCode: 'B', colourName: 'Black', status: 1 }) })
    assert.equal(duplicate.status, 400)
    assert.deepEqual(await duplicate.json(), { errors: 'Colour name already exists.' })
    auth.permissions = [{ ...auth.permissions[0], add: 0 }]
    const denied = await fetch(`${base}/addColour`, { method: 'POST', headers: headers(token), body: JSON.stringify({ colourCode: 'WHT', colourName: 'White', status: 1 }) })
    assert.equal(denied.status, 403)
  })
})

test('size endpoints preserve CRUD contracts and tenant-bounded list filters', async () => {
  await withApi(async (base, token, store, auth) => {
    auth.permissions = [{ ...auth.permissions[0], subFeature: 'Sizes' }]
    const add = await fetch(`${base}/addSize`, { method: 'POST', headers: headers(token), body: JSON.stringify({ sizeCode: 'XL', sizeName: 'Extra Large', status: 1 }) })
    assert.equal(add.status, 200)
    const update = await fetch(`${base}/updateSize`, { method: 'POST', headers: headers(token), body: JSON.stringify({ id: 50, sizeCode: 'LG', sizeName: 'Large Updated', status: 1 }) })
    assert.equal(update.status, 200)
    const list = await fetch(`${base}/getSizes`, { method: 'POST', headers: headers(token), body: JSON.stringify({ searchStr: 'large', status: 1, page: null }) })
    assert.equal(list.status, 200)
    const body = await list.json() as any
    assert.equal(body.data.sizes[0].sizeCode, 'LG')
    assert.equal(body.data.pagination.perPage, 2)
    assert.deepEqual(store.lastList, { page: 1, perPage: 2, search: 'large', status: 1 })
    const get = await fetch(`${base}/getSizeById`, { method: 'POST', headers: headers(token), body: JSON.stringify({ id: 50 }) })
    assert.deepEqual((await get.json() as any).data, { id: 50, sizeCode: 'LG', sizeName: 'Large Updated', status: 1 })
    assert.equal(store.lastClient, 7n)
  })
})

test('unit-type endpoints ignore legacy extra fields, enforce permissions and report duplicate errors', async () => {
  await withApi(async (base, token, store, auth) => {
    auth.permissions = [{ ...auth.permissions[0], subFeature: 'Unit Types' }]
    const list = await fetch(`${base}/getUnitTypes`, { method: 'POST', headers: headers(token), body: JSON.stringify({ searchStr: null, status: null, page: 1 }) })
    assert.equal(list.status, 200)
    assert.equal((await list.json() as any).data.unitTypes[0].unitTypeName, 'Pieces')
    const get = await fetch(`${base}/getUnitTypeById`, { method: 'POST', headers: headers(token), body: JSON.stringify({ id: 60 }) })
    assert.deepEqual((await get.json() as any).data, { id: 60, unitTypeCode: 'PCS', unitTypeName: 'Pieces', status: 1 })
    store.result = 'code_duplicate'
    const duplicate = await fetch(`${base}/addUnitType`, { method: 'POST', headers: headers(token), body: JSON.stringify({ unitTypeCode: 'PCS', unitTypeName: 'Other', status: 1 }) })
    assert.equal(duplicate.status, 400)
    assert.deepEqual(await duplicate.json(), { errors: 'Unit Type code already exists.' })
    store.result = 'saved'
    const invalid = await fetch(`${base}/updateUnitType`, { method: 'POST', headers: headers(token), body: JSON.stringify({ id: 60, unitTypeCode: 'BOX', unitTypeName: 'Boxes', status: 1, clientId: 99 }) })
    assert.equal(invalid.status, 200)
    auth.permissions = [{ ...auth.permissions[0], view: 0 }]
    const denied = await fetch(`${base}/getUnitTypes`, { method: 'POST', headers: headers(token), body: JSON.stringify({ searchStr: null, status: null, page: 1 }) })
    assert.equal(denied.status, 403)
  })
})

test('team endpoints preserve CRUD and bounded tenant-list contracts', async () => {
  await withApi(async (base, token, store, auth) => {
    auth.permissions = [{ ...auth.permissions[0], subFeature: 'Teams' }]
    assert.equal((await fetch(`${base}/addTeam`, { method: 'POST', headers: headers(token), body: JSON.stringify({ teamName: 'Sales', teamCode: 'SAL', status: 1 }) })).status, 200)
    assert.equal((await fetch(`${base}/updateTeam`, { method: 'POST', headers: headers(token), body: JSON.stringify({ id: 70, teamName: 'Store Ops', teamCode: 'OPS2', status: 1 }) })).status, 200)
    const list = await fetch(`${base}/getTeams`, { method: 'POST', headers: headers(token), body: JSON.stringify({ searchStr: null, status: null, page: null }) })
    assert.equal(list.status, 200)
    assert.equal((await list.json() as any).data.pagination.perPage, 2)
    const get = await fetch(`${base}/getTeamById`, { method: 'POST', headers: headers(token), body: JSON.stringify({ id: 70 }) })
    assert.deepEqual((await get.json() as any).data, { id: 70, teamName: 'Store Ops', teamCode: 'OPS2', status: 1 })
    assert.equal(store.lastClient, 7n)
  })
})

test('payment-mode endpoints preserve allow-change and authorization behavior', async () => {
  await withApi(async (base, token, store, auth) => {
    auth.permissions = [{ ...auth.permissions[0], subFeature: 'Payment Modes' }]
    assert.equal((await fetch(`${base}/addPaymentMode`, { method: 'POST', headers: headers(token), body: JSON.stringify({ paymentMode: 'Card', allowChange: 0, status: 1 }) })).status, 200)
    const get = await fetch(`${base}/getPaymentModeById`, { method: 'POST', headers: headers(token), body: JSON.stringify({ id: 80 }) })
    assert.deepEqual((await get.json() as any).data, { id: 80, paymentMode: 'Cash', allowChange: 1, status: 1 })
    store.result = 'name_duplicate'
    const duplicate = await fetch(`${base}/updatePaymentMode`, { method: 'POST', headers: headers(token), body: JSON.stringify({ id: 80, paymentMode: 'Card', allowChange: 0, status: 1 }) })
    assert.equal(duplicate.status, 400)
    assert.deepEqual(await duplicate.json(), { errors: 'Payment mode already exists.' })
    auth.permissions = [{ ...auth.permissions[0], view: 0 }]
    const denied = await fetch(`${base}/getPaymentModes`, { method: 'POST', headers: headers(token), body: JSON.stringify({ searchStr: null, status: null, page: 1 }) })
    assert.equal(denied.status, 403)
  })
})

test('tax endpoints preserve percentages, duplicate errors and bounded lists', async () => {
  await withApi(async (base, token, store, auth) => {
    auth.permissions = [{ ...auth.permissions[0], subFeature: 'Taxes' }]
    assert.equal((await fetch(`${base}/addTax`, { method: 'POST', headers: headers(token), body: JSON.stringify({ taxCode: 'GST12', taxName: 'GST 12%', taxPercent: 12, status: 1 }) })).status, 200)
    const get = await fetch(`${base}/getTaxById`, { method: 'POST', headers: headers(token), body: JSON.stringify({ id: 90 }) })
    assert.deepEqual((await get.json() as any).data, { id: 90, taxCode: 'GST5', taxName: 'GST 5%', taxPercent: 5, status: 1 })
    store.result = 'percent_duplicate'
    const duplicate = await fetch(`${base}/updateTax`, { method: 'POST', headers: headers(token), body: JSON.stringify({ id: 90, taxCode: 'X', taxName: 'X', taxPercent: 5, status: 1 }) })
    assert.deepEqual(await duplicate.json(), { errors: 'Tax Percent already exists.' })
  })
})

test('salesman endpoints keep team joins tenant-safe and enforce role grants', async () => {
  await withApi(async (base, token, store, auth) => {
    auth.permissions = [{ ...auth.permissions[0], subFeature: 'Sales Man' }]
    const get = await fetch(`${base}/getSalesManById`, { method: 'POST', headers: headers(token), body: JSON.stringify({ id: 100 }) })
    assert.deepEqual((await get.json() as any).data, { id: 100, smCode: 'SM1', smName: 'Kumar', commissionPercent: '5', teamId: 70, teamName: 'Operations', status: 1 })
    store.result = 'parent_missing'
    const foreign = await fetch(`${base}/addSalesMan`, { method: 'POST', headers: headers(token), body: JSON.stringify({ teamId: 999, smCode: 'SM2', smName: 'Other', commissionPercent: 5, status: 1 }) })
    assert.deepEqual(await foreign.json(), { errors: 'Team not found.' })
    auth.permissions = [{ ...auth.permissions[0], view: 0 }]
    const denied = await fetch(`${base}/getSalesMans`, { method: 'POST', headers: headers(token), body: JSON.stringify({ searchStr: null, status: null, teamId: null, page: 1 }) })
    assert.equal(denied.status, 403)
  })
})

test('floor and table-type APIs retain tenant CRUD and duplicate contracts', async () => {
  await withApi(async (base, token, store, auth) => {
    auth.permissions = [{ ...auth.permissions[0], subFeature: 'Floors' }]
    assert.equal((await fetch(`${base}/addFloor`, { method: 'POST', headers: headers(token), body: JSON.stringify({ floorCode: 'F1', floorName: 'First', status: 1 }) })).status, 200)
    const floor = await fetch(`${base}/getFloorById`, { method: 'POST', headers: headers(token), body: JSON.stringify({ id: 110 }) }); assert.equal((await floor.json() as any).data.floorName, 'Ground')
    auth.permissions = [{ ...auth.permissions[0], subFeature: 'Table Types' }]
    const types = await fetch(`${base}/getTableTypes`, { method: 'POST', headers: headers(token), body: JSON.stringify({ searchStr: null, status: null, page: null }) }); assert.equal((await types.json() as any).data.tableTypes[0].tableType, 'Dining')
    store.result = 'name_duplicate'; const duplicate = await fetch(`${base}/addTableType`, { method: 'POST', headers: headers(token), body: JSON.stringify({ tableType: 'Dining', status: 1 }) }); assert.equal(duplicate.status, 400)
  })
})

test('table APIs preserve joined output and reject foreign parent selections', async () => {
  await withApi(async (base, token, store, auth) => {
    auth.permissions = [{ ...auth.permissions[0], subFeature: 'Tables' }]
    const get = await fetch(`${base}/getTableById`, { method: 'POST', headers: headers(token), body: JSON.stringify({ id: 130 }) })
    assert.deepEqual((await get.json() as any).data, { id: 130, floorId: 110, floorName: 'Ground', tableTypeId: 120, tableType: 'Dining', tableCode: 'T1', tableName: 'Table 1', capacity: 4, acNonAc: 1, tableUnderMaintenance: 0, status: 1 })
    store.result = 'floor_missing'
    const invalid = await fetch(`${base}/addTable`, { method: 'POST', headers: headers(token), body: JSON.stringify({ floorId: 999, tableTypeId: 120, tableCode: 'T2', tableName: 'Table 2', capacity: 4, acNonAc: 1, tableUnderMaintenance: 0, status: 1 }) })
    assert.deepEqual(await invalid.json(), { errors: 'Invalid floor selected.' })
    auth.permissions = [{ ...auth.permissions[0], view: 0 }]
    const denied = await fetch(`${base}/getTables`, { method: 'POST', headers: headers(token), body: JSON.stringify({ searchStr: null, floorId: null, status: null, page: 1 }) }); assert.equal(denied.status, 403)
  })
})

test('role APIs enforce role-management grants and tenant CRUD contracts', async () => {
  await withApi(async (base, token, store, auth) => {
    auth.permissions = [{ ...auth.permissions[0], subFeature: 'Roles' }]
    assert.equal((await fetch(`${base}/addRole`, { method: 'POST', headers: headers(token), body: JSON.stringify({ roleTitle: 'Manager', status: 1 }) })).status, 200)
    const get = await fetch(`${base}/getRoleById`, { method: 'POST', headers: headers(token), body: JSON.stringify({ id: 140 }) }); assert.deepEqual((await get.json() as any).data, { id: 140, roleTitle: 'Cashier', status: 1 })
    store.result = 'name_duplicate'; const duplicate = await fetch(`${base}/updateRole`, { method: 'POST', headers: headers(token), body: JSON.stringify({ id: 140, roleTitle: 'Manager', status: 1 }) }); assert.deepEqual(await duplicate.json(), { errors: 'Role already exists.' })
    auth.permissions = [{ ...auth.permissions[0], view: 0 }]; const denied = await fetch(`${base}/getRoles`, { method: 'POST', headers: headers(token), body: JSON.stringify({ searchStr: null, status: null, page: 1 }) }); assert.equal(denied.status, 403)
  })
})
