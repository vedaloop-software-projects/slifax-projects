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
  async reportVariants() { return [] }
  async dashboard() { return { totalSales: 0, yesterdaySales: 0, salesPercentage: 0, totalBills: 0, paymentSummary: [], income: { totalIncome: 0 }, expenses: { totalExpense: 0 }, collectionSummary: { sales: 0, income: 0, expenses: 0, netProfit: 0 }, salesComparison: { weekly: [], monthly: [], yearly: [] }, recentOrders: [] } }
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

test('dashboard returns the single tenant-scoped aggregate contract', async () => {
  const service = new ReportService(new Store(), new Auth(), 25)
  const data = await service.dashboard(account)
  assert.equal(data.totalSales, 0)
  assert.deepEqual(data.salesComparison, { weekly: [], monthly: [], yearly: [] })
  assert.deepEqual(data.recentOrders, [])
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

test('billwise reports accept numeric bill numbers after legacy request normalization', async () => {
 const result = await new ReportService(new Store(), new Auth()).billWiseSales(account, {fromDate:'21-10-2026',toDate:'21-10-2026',page:1,billNo:10,variantId:null,itemCode:null,itemName:null}); assert.equal(result.rows.length,2)
})

test('sales timestamps use India day boundaries and transfer dates use date-only boundaries',async()=>{
 const store=new Store(),service=new ReportService(store,new Auth());
 await service.sales(account,{fromDate:'24-10-2026',toDate:'24-10-2026'});
 assert.equal(store.salesFilters?.from.toISOString(),'2026-10-23T18:30:00.000Z');assert.equal(store.salesFilters?.to.toISOString(),'2026-10-24T18:29:59.999Z');
 await service.transfer(account,'in',{fromDate:'24-10-2026',toDate:'24-10-2026'});
 assert.equal(store.transferFilters?.from.toISOString(),'2026-10-24T00:00:00.000Z');assert.equal(store.transferFilters?.to.toISOString(),'2026-10-24T23:59:59.999Z');
})

test('sales source includes archived rows using the same tenant and date filters',async()=>{
 const {PrismaReportStore}=await import('../../../models/reports/prisma-store.ts');
 const billDate=new Date('2026-10-23T18:35:00Z');let archivedWhere:any;
 const empty={findMany:async()=>[]};
 const fake={products:{findMany:async()=>[{id:2n,product_code:'008-00002',product_full_name:'Rice',category_id:1n}]},billTran:empty,billMaster:empty,prevBillTran:{findMany:async({where}:any)=>{archivedWhere=where;return[{id:1n,bill_num:7,bill_date:billDate,product_id:2n,variant_id:3n,qty:1,sale_price:100,manual_discount_value:0,gst_percentage:5,gst_amount:4.76,bill_mode:1}]}},prevBillMaster:{findMany:async()=>[{bill_num:7,bill_date:billDate}]},productVariants:{findMany:async()=>[{id:3n,variant_code:'008-00002-001'}]},categories:{findMany:async()=>[{id:1n,category_name:'Food'}]},subCategories:empty,brands:empty};
 const from=new Date('2026-10-23T18:30:00Z'),to=new Date('2026-10-24T18:29:59.999Z');
 const data=await new PrismaReportStore(fake as any).salesSource(8n,{from,to,page:1,perPage:25,reportType:'detailed',groupByTax:false},100);
 assert.equal(data.rows.length,1);assert.equal(data.rows[0]?.variantCode,'008-00002-001');assert.equal(archivedWhere.client_id,8n);assert.deepEqual(archivedWhere.bill_date,{gte:from,lte:to});
})

test('free sale lines are not refunds, exclusive GST reconciles in detail and tax groups', async () => {
  const store = new Store()
  store.salesRows = [
    sale({ qty: 2, salePrice: 100, discountAmount: 20, gstAmount: 9, exclusiveGst: true }),
    sale({ id: 2n, qty: 1, salePrice: 0, discountAmount: 0, gstAmount: 0, gstPercentage: 0, billMode: 4 }),
    sale({ id: 3n, qty: -1, salePrice: 100, discountAmount: -10, gstAmount: -4.5, exclusiveGst: true, billMode: 4 }),
  ]
  const service = new ReportService(store, new Auth())
  const dates = { fromDate: '21-10-2026', toDate: '21-10-2026' }
  const detailed = await service.sales(account, { ...dates, reportType: 'detailed' })
  assert.deepEqual(detailed.totals, { qtySold: 3, qtyRefund: 1, taxAmount: 4.5, netExcl: 90, netIncl: 94.5 })
  assert.equal(detailed.rows[1]?.qtyRefund, 0)
  const tax = await service.sales(account, { ...dates, groupByTax: true })
  assert.equal(tax.rows.reduce((sum, row) => sum + Number(row.taxAmount), 0), detailed.totals.taxAmount)
  assert.equal(tax.rows.reduce((sum, row) => sum + Number(row.netIncl), 0), detailed.totals.netIncl)
})

test('summary aggregates categories while detail retains individual variant codes', async () => {
  const store = new Store()
  store.salesRows = [sale(), sale({ id: 2n, productId: 9n, variantId: 10n, variantCode: '007-00009-002' })]
  const service = new ReportService(store, new Auth())
  const dates = { fromDate: '21-10-2026', toDate: '21-10-2026' }
  assert.equal((await service.sales(account, { ...dates, reportType: 'summary' })).rows.length, 1)
  const details = await service.sales(account, { ...dates, reportType: 'detailed' })
  assert.equal(details.rows.length, 2)
  assert.equal(details.rows[1]?.variantCode, '007-00009-002')
})

test('transfer summary retains historical prices rather than repricing other transfers', async () => {
  const store = new Store()
  const source = store.transferSource.bind(store)
  store.transferSource = async (...args) => {
    const result = await source(...args)
    result.rows[1]!.mrp = 150
    result.rows[1]!.costPrice = 90
    return result
  }
  const data = await new ReportService(store, new Auth()).transfer(account, 'in', { fromDate: '21-10-2026', toDate: '21-10-2026', reportType: 'summary' })
  assert.equal(data.rows.length, 2)
  assert.equal(data.rows[1]?.cp, 90)
  assert.equal(data.rows[1]?.mrp, 150)
  assert.equal(data.totals.totalAmount, 580)
  assert.equal(data.rows.reduce((sum, row) => sum + Number(row.totalAmount), 0), 580)
})

test('stock status includes variants without period movements and preserves negative availability', async () => {
  const { PrismaReportStore } = await import('../../../models/reports/prisma-store.ts')
  const empty = { findMany: async () => [] }
  const fake = {
    products: { findMany: async () => [{ id: 2n, product_code: '007-00002', product_full_name: 'Rice', category_id: 1n, tax_id: 6n, trash: 0 }] },
    productVariants: { findMany: async () => [
      { id: 3n, product_id: 2n, variant_code: '007-00002-001', pack_size: '1KG', variant_qty: -2, trash: 0 },
      { id: 4n, product_id: 2n, variant_code: '007-00002-002', pack_size: '5KG', variant_qty: 10, trash: 0 },
    ] }, stock: empty, categories: empty, subCategories: empty, brands: empty, taxes: empty,
  }
  const rows = await new PrismaReportStore(fake as any).stockSource(7n, { from: new Date('2026-10-21'), to: new Date('2026-10-21'), page: 1, perPage: 25, reportType: 'detailed', groupByTax: false }, 100)
  assert.deepEqual(rows.rows.map(row => [row.variantCode, row.availableQty, row.sales]), [['007-00002-001', -2, 0], ['007-00002-002', 10, 0]])
})

test('variant lookup is tenant scoped, exact product-code matched and returns display codes', async () => {
  const { PrismaReportStore } = await import('../../../models/reports/prisma-store.ts')
  const fake = {
    products: { findMany: async ({ where }: any) => { assert.deepEqual(where, { client_id: 7n, product_code: '007-00002' }); return [{ id: 2n, product_code: '007-00002' }] } },
    productVariants: { findMany: async ({ where }: any) => { assert.equal(where.client_id, 7n); assert.deepEqual(where.product_id, { in: [2n] }); return [{ id: 1037n, product_id: 2n, variant_code: '007-00002-001', pack_size: '1KG' }] } },
  }
  const rows = await new PrismaReportStore(fake as any).reportVariants(7n, '007-00002')
  assert.equal(rows[0]?.value, 1037)
  assert.equal(rows[0]?.code, '007-00002-001')
})

test('stock adjustment report filters completed movements and preserves direction and reasons', async () => {
  const { PrismaReportStore } = await import('../../../models/reports/prisma-store.ts')
  const empty = { findMany: async () => [] }
  const from = new Date('2026-10-21'), to = new Date('2026-10-22')
  const fake = {
    products: { findMany: async () => [{ id: 2n, product_code: '007-00002', product_full_name: 'Rice', category_id: 1n, hsn_code: '1006' }] },
    stockAdjustmentsMast: { findMany: async ({ where }: any) => { assert.deepEqual(where, { client_id: 7n, status: 1, stock_adjustment_date: { gte: from, lte: to } }); return [{ id: 1n, stock_type: 2, stock_adjustment_date: from }] } },
    stockAdjustmentsTran: { findMany: async ({ where }: any) => { assert.equal(where.client_id, 7n); assert.equal(where.variant_id, 3n); return [{ id: 1n, stock_adjustment_id: 1n, product_id: 2n, variant_id: 3n, qty: 2, cost_price: 80, mrp: 120, reason: 'Damage' }] } },
    productVariants: { findMany: async () => [{ id: 3n, variant_code: '007-00002-001' }] }, categories: empty, subCategories: empty, brands: empty,
  }
  const result = await new PrismaReportStore(fake as any).transferSource(7n, 'adjustment', { from, to, page: 1, perPage: 25, reportType: 'detailed', variantId: 3n }, 100)
  assert.equal(result.rows[0]?.stockType, 'OUT')
  assert.equal(result.rows[0]?.reason, 'Damage')
  assert.equal(result.rows[0]?.qty, 2)
})

test('Laravel positive refund rows and zero-price free sale rows retain their different meanings', async () => {
  const { PrismaReportStore } = await import('../../../models/reports/prisma-store.ts')
  const date = new Date('2026-10-21T10:00:00Z'), empty = { findMany: async () => [] }
  const fake = {
    products: { findMany: async () => [{ id: 2n, product_code: '007-00002', product_full_name: 'Rice', category_id: 1n }] },
    productVariants: { findMany: async () => [{ id: 3n, variant_code: '007-00002-001' }] },
    billMaster: { findMany: async () => [{ bill_num: 1, bill_date: date, refund_against_bill_num: 'B100' }, { bill_num: 2, bill_date: date }] },
    billTran: { findMany: async () => [
      { id: 1n, bill_num: 1, bill_date: date, product_id: 2n, variant_id: 3n, qty: 2, sale_price: 100, manual_discount_value: 10, gst_percentage: 5, gst_amount: 9, bill_mode: 3 },
      { id: 2n, bill_num: 2, bill_date: date, product_id: 2n, variant_id: 3n, qty: 1, sale_price: 0, manual_discount_value: 0, gst_percentage: 0, gst_amount: 0, bill_mode: 4 },
    ] },
    prevBillMaster: empty, prevBillTran: empty, categories: empty, subCategories: empty, brands: empty,
  }
  const result = await new PrismaReportStore(fake as any).salesSource(7n, { from: date, to: date, page: 1, perPage: 25, reportType: 'detailed', groupByTax: false }, 100)
  const refund = result.rows.find(row => row.billNumber === 1)!
  assert.equal(refund.qty, -2)
  assert.equal(refund.discountAmount, -10)
  assert.equal(refund.gstAmount, -9)
  assert.equal(result.rows.find(row => row.billNumber === 2)?.qty, 1)
})

test('report boolean strings do not accidentally activate tax grouping', async () => {
  const result = await new ReportService(new Store(), new Auth()).sales(account, { fromDate: '21-10-2026', toDate: '21-10-2026', reportType: 'detailed', groupByTax: 'false' })
  assert.equal(result.rows.length, 2)
  assert.equal(result.rows[0]?.taxName, undefined)
})
