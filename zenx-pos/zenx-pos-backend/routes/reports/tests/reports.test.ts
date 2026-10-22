import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Account, AuthStore, PermissionRow } from '../../../models/auth/contracts.ts'
import type {
  PaymentCollectionFilters, PaymentSourceRow, ReportStore, SalesReportFilters,
  SalesSourceRow,
  TransferReportFilters, TransferSourceRow,
} from '../../../models/reports/contracts.ts'
import { ApiError } from '../../auth/service.ts'
import { ReportService } from '../service.ts'

const account: Account = {
  user: { id: 3n, clientId: 7n, name: 'Cashier', mobile: '9876543210', email: null, passwordHash: null, roleId: 4, updatedAt: null },
  client: { id: 7n, businessTypeId: 1, businessName: 'Store', logo: null, address: '', city: '', startDate: new Date('2025-01-01'), endDate: new Date('2030-01-01') },
  businessType: 'Retail', roleTitle: 'Cashier',
}

class Auth implements AuthStore {
  permissions: PermissionRow[] = [{ featureId: 1n, feature: 'Reports', featurePriority: 1, subFeatureId: null, subFeature: null, subFeaturePriority: null, view: 1, add: 0, edit: 0 }]
  async findAccountByLogin() { return null }
  async findAccountByIdentity() { return null }
  async listPermissions() { return this.permissions }
  async getProfile() { return null }
  async recordAudit() {}
  async changePassword() { return new Date() }
}

const sale = (overrides: Partial<SalesSourceRow> = {}): SalesSourceRow => ({
  id: 1n, billNumber: 10, billDate: new Date(2026, 9, 21), productId: 2n, variantId: 3n,
  qty: 2, salePrice: 100, discountAmount: 10, gstPercentage: 5, gstAmount: 9, billMode: 1,
  productCode: 'P1', productName: 'Rice', category: 'Food', subCategory: 'Rice', brand: 'Brand', variantCode: '3',
  ...overrides,
})

class Store implements ReportStore {
  salesFilters?: SalesReportFilters
  paymentFilters?: PaymentCollectionFilters
  transferFilters?: TransferReportFilters
  salesRows: SalesSourceRow[] = [sale(), sale({ id: 2n, qty: -1, salePrice: 50, discountAmount: 0, gstAmount: -2.5, billMode: 4 })]
  paymentRows: PaymentSourceRow[] = [
    { id: 1n, billNumber: 10, billDate: new Date(2026, 9, 21), paymentModeId: 1n, paymentMode: 'Cash', userId: 3n, amount: 200, tenderedChange: 1 },
    { id: 2n, billNumber: 10, billDate: new Date(2026, 9, 21), paymentModeId: 1n, paymentMode: 'Cash', userId: 3n, amount: 20, tenderedChange: 2 },
  ]
  async salesSource(clientId: bigint, filters: SalesReportFilters) { assert.equal(clientId, 7n); this.salesFilters = filters; return { rows: this.salesRows, truncated: false } }
  async salesOptions() { return { categories: [{ label: 'Food', value: 1 }], subCategories: [], brands: [], variants: [], taxes: [{ label: '5', value: 5 }] } }
  async paymentSource(clientId: bigint, filters: PaymentCollectionFilters) { assert.equal(clientId, 7n); this.paymentFilters = filters; return { rows: this.paymentRows, truncated: false } }
  async paymentOptions() { return { paymentModes: [{ label: 'Cash', value: 1 }], users: [{ label: 'Cashier', value: 3 }] } }
  async billWiseSource(clientId: bigint, _filters: import('../../../models/reports/contracts.ts').BillWiseReportFilters) {
    assert.equal(clientId, 7n)
    return { rows: this.salesRows.map((row) => ({ ...row, paymentMode: 'Cash' })), truncated: false }
  }
  async transferSource(clientId: bigint, direction: 'in' | 'out', filters: TransferReportFilters) {
    assert.equal(clientId, 7n); this.transferFilters = filters
    const row: TransferSourceRow = {
      id: 1n, transferNumber: 12n, transferDate: new Date(2026, 9, 21), productId: 2n, variantId: 3n,
      qty: direction === 'in' ? 5 : 3, freeQty: direction === 'in' ? 1 : 0, mrp: 120, costPrice: 80,
      productCode: 'P1', productName: 'Rice', eanCode: '8901', hsnCode: '1006', category: 'Food',
      subCategory: 'Rice', brand: 'Brand', variantCode: '3',
    }
    return { rows: [row, { ...row, id: 2n, transferNumber: 13n, qty: 2 }], truncated: false }
  }
  async billSummarySource() { return { bills: [{ billNumber: 10, billDate: new Date(2026, 9, 21), userId: 3n, salesmanId: 5n, amount: 190 }], payments: this.paymentRows, salesmanCodes: new Map([[5n, 'SM5']]), truncated: false } }
  async stockSource() { return { rows: [{ id: 1n, stockDate: new Date(2026, 9, 21), productId: 2n, variantId: 3n, productCode: 'P1', productName: 'Rice', category: 'Food', subCategory: 'Rice', brand: 'Brand', variantCode: '3', gstPercentage: 5, sales: 2, purchaseReturn: 1, gstAmount: 9, salesValue: 190, discount: 10 }], truncated: false } }
  async kotSource() { return { rows: [{ id: 1n, kotNo: 'K1', kotDate: new Date(2026, 9, 21), userId: 3n, userName: 'Cashier', status: 1, items: [{ name: 'Rice', qty: 2 }] }, { id: 2n, kotNo: 'K2', kotDate: new Date(2026, 9, 21), userId: 3n, userName: 'Cashier', status: 0, items: [] }], truncated: false } }
  async salesmanSource() { return { rows: [{ id: 1n, billDate: new Date(2026, 9, 21), salesmanId: 5n, salesmanCode: 'SM5', salesmanName: 'Seller', commission: 5, productName: 'Rice', qty: 2, unitPrice: 100, discount: 5 }], truncated: false } }
  async salesmanOptions() { return [{ label: 'SM5 · Seller', value: 5 }] }
  async customerSalesSource() { return { rows: this.salesRows.map((row) => ({ ...row, customerId: 8n, customerName: 'Buyer' })), truncated: false } }
  async customerOptions() { return [{ label: 'Buyer', value: 8 }] }
}

test('sales report supports detailed, summary and tax-grouped tenant results', async () => {
  const store = new Store(), service = new ReportService(store, new Auth(), 25)
  const detailed = await service.sales(account, { fromDate: '21-10-2026', toDate: '21-10-2026', page: '1', reportType: 'detailed', groupByTax: false, categoryId: '1' })
  assert.equal(detailed.rows.length, 2)
  assert.deepEqual(detailed.totals, { qtySold: 2, qtyRefund: 1, taxAmount: 6.5, netExcl: 133.5, netIncl: 140 })
  assert.equal(store.salesFilters?.categoryId, 1n)
  assert.equal(detailed.pagination.totalRecords, 2)
  const summary = await service.sales(account, { fromDate: '21-10-2026', toDate: '21-10-2026', page: 1, reportType: 'summary', groupByTax: false })
  assert.equal(summary.rows.length, 1)
  assert.equal(summary.rows[0]?.qtyRefund, 1)
  const tax = await service.sales(account, { fromDate: '21-10-2026', toDate: '21-10-2026', page: 1, reportType: 'detailed', groupByTax: true })
  assert.equal(tax.rows.length, 1)
  assert.equal(tax.rows[0]?.taxPercent, 5)
})

test('payment collection groups modes and subtracts tendered change', async () => {
  const store = new Store(), service = new ReportService(store, new Auth(), 25)
  const data = await service.paymentCollection(account, { fromDate: '21-10-2026', toDate: '21-10-2026', page: '1', crossTab: true, paymentModeId: '1', userId: '3' })
  assert.equal(data.rows.length, 1)
  assert.equal(data.rows[0]?.totalCollection, 180)
  assert.equal(data.totalCollection, 180)
  assert.equal(store.paymentFilters?.paymentModeId, 1n)
  assert.equal(store.paymentFilters?.userId, 3n)
})

test('reports reject invalid ranges and missing view permission', async () => {
  const auth = new Auth(), service = new ReportService(new Store(), auth)
  await assert.rejects(() => service.sales(account, { fromDate: '22-10-2026', toDate: '21-10-2026' }), (error: ApiError) => error.status === 422)
  auth.permissions[0]!.view = 0
  await assert.rejects(() => service.paymentCollection(account, { fromDate: '21-10-2026', toDate: '21-10-2026' }), (error: ApiError) => error.status === 403)
})

test('tax breakup supports summary and detailed calculations', async () => {
  const store = new Store()
  store.salesRows = [sale({ gstPercentage: 5, gstAmount: 9 }), sale({ id: 2n, billNumber: 11, gstPercentage: 12, gstAmount: 12, salePrice: 56, discountAmount: 0 })]
  const service = new ReportService(store, new Auth(), 25)
  const summary = await service.taxBreakup(account, { fromDate: '21-10-2026', toDate: '21-10-2026', page: 1, reportType: 'summary', gstRegister: true })
  assert.equal(summary.rows.length, 1)
  assert.equal(summary.rows[0]?.gst5Sales, 181)
  assert.equal(summary.rows[0]?.gst12Sales, 100)
  assert.equal(summary.totals.totalAmount, 302)
  const detailed = await service.taxBreakup(account, { fromDate: '21-10-2026', toDate: '21-10-2026', page: 1, reportType: 'detailed', gstRegister: true })
  assert.equal(detailed.rows.length, 2)
})

test('billwise report normalizes legacy bill labels and returns line totals', async () => {
  const store = new Store(), service = new ReportService(store, new Auth(), 25)
  const data = await service.billWiseSales(account, { fromDate: '21-10-2026', toDate: '21-10-2026', page: '1', billNo: 'B10', variantId: '3' })
  assert.equal(data.rows.length, 2)
  assert.equal(data.rows[0]?.paymentMode, 'Cash')
  assert.equal(data.rows[0]?.totalAmount, 190)
  assert.equal(data.totals.qtyRefund, 1)
})

test('transfer reports support summary, detailed filters and totals', async () => {
  const store = new Store(), service = new ReportService(store, new Auth(), 25)
  const incoming = await service.transfer(account, 'in', { fromDate: '21-10-2026', toDate: '21-10-2026', page: '1', reportType: 'summary', categoryId: '1' })
  assert.equal(incoming.rows.length, 1)
  assert.equal(incoming.rows[0]?.qty, 7)
  assert.equal(incoming.rows[0]?.freeQty, 2)
  assert.equal(incoming.totals.totalAmount, 560)
  assert.equal(store.transferFilters?.categoryId, 1n)
  const outgoing = await service.transfer(account, 'out', { fromDate: '21-10-2026', toDate: '21-10-2026', page: 1, reportType: 'detailed', variantId: '3' })
  assert.equal(outgoing.rows.length, 2)
  assert.equal(outgoing.rows[0]?.groupType, 'Transfer')
  assert.equal(outgoing.totals.qty, 5)
})

test('remaining report services return real response contracts', async () => {
  const service = new ReportService(new Store(), new Auth(), 25)
  const dates = { fromDate: '21-10-2026', toDate: '21-10-2026', page: 1 }
  const bills = await service.billSummary(account, dates)
  assert.equal(bills.rows[0]?.smCode, 'SM5')
  assert.equal(bills.totals.amount, 180)
  const stock = await service.stockStatus(account, { ...dates, reportType: 'detailed', groupByTax: false })
  assert.equal(stock.rows[0]?.qtySold, 2)
  const kot = await service.kot(account, { ...dates, reportType: 'summary' })
  assert.equal(kot.rows[0]?.kotCancelled, 1)
  const salesman = await service.salesman(account, { ...dates, reportType: 'sale' })
  assert.equal(salesman.rows[0]?.amount, 190)
  const customer = await service.customerSales(account, { ...dates, reportType: 'summary' })
  assert.equal(customer.rows[0]?.customerName, 'Buyer')
})
