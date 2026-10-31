import type { StockMovementSource } from './stock-movement.ts'
export type ReportOption = { label: string; value: number }

export type SalesReportFilters = {
  from: Date
  to: Date
  page: number
  perPage: number
  reportType: 'summary' | 'detailed'
  groupByTax: boolean
  categoryId?: bigint
  subCategoryId?: bigint
  brandId?: bigint
  variantId?: bigint
  itemCode?: string
  itemName?: string
  gstPercentage?: number
  billNumber?: number
}

export type PaymentCollectionFilters = {
  from: Date
  to: Date
  page: number
  perPage: number
  crossTab: boolean
  paymentModeId?: bigint
  userId?: bigint
}

export type SalesSourceRow = {
  id: bigint
  billNumber: number
  billDate: Date
  productId: bigint
  variantId: bigint | null
  qty: number
  salePrice: number
  discountAmount: number
  gstPercentage: number
  gstAmount: number
  exclusiveGst?: boolean
  billMode: number
  productCode: string
  productName: string
  category: string
  subCategory: string
  brand: string
  variantCode: string
  costPrice?: number
  masterCostPrice?: number
  salesmanId?: bigint | null
}

export type PaymentSourceRow = {
  id: bigint
  billNumber: number
  billDate: Date
  paymentModeId: bigint
  paymentMode: string
  userId: bigint | null
  amount: number
  tenderedChange: number
}

export type BillWiseReportFilters = {
  from: Date
  to: Date
  page: number
  perPage: number
  variantId?: bigint
  itemCode?: string
  itemName?: string
  billNumber?: number
}

export type BillWiseSourceRow = SalesSourceRow & { paymentMode: string }

// fromDay is the first business date at UTC midnight (for @db.Date columns); from is its start in the store's zone.
export type StockMovementFilters = {
  fromDay: Date
  from: Date
  categoryId?: bigint
  subCategoryId?: bigint
  brandId?: bigint
  variantId?: bigint
  itemCode?: string
  itemName?: string
}

export type TransferReportFilters = {
  from: Date
  to: Date
  page: number
  perPage: number
  reportType: 'summary' | 'detailed'
  categoryId?: bigint
  subCategoryId?: bigint
  brandId?: bigint
  variantId?: bigint
  itemCode?: string
  itemName?: string
  stockType?: 'IN' | 'OUT'
}

export type TransferSourceRow = {
  id: bigint
  transferNumber: bigint
  transferDate: Date
  productId: bigint
  variantId: bigint
  qty: number
  freeQty: number
  mrp: number
  costPrice: number
  salePrice?: number
  salePriceBasis?: 'transaction' | 'master'
  productCode: string
  productName: string
  eanCode: string
  hsnCode: string
  category: string
  subCategory: string
  brand: string
  variantCode: string
  stockType?: string
  reason?: string
}

export type SalesReportOptions = {
  categories: ReportOption[]
  subCategories: Array<ReportOption & { categoryId: number }>
  brands: ReportOption[]
  variants: Array<ReportOption & { code: string; productId: number; productCode?: string; productName?: string }>
  taxes: ReportOption[]
}

export type PaymentReportOptions = { paymentModes: ReportOption[]; users: ReportOption[] }

export type BillSummaryFilters = { from: Date; to: Date; page: number; perPage: number; paymentModeId?: bigint; userId?: bigint }
export type BillSummarySource = {
  bills: Array<{ billNumber: number; billDate: Date; userId: bigint | null; salesmanId: bigint | null; amount: number }>
  payments: PaymentSourceRow[]
  salesmanCodes: Map<bigint, string>
  truncated: boolean
}

export type StockReportFilters = SalesReportFilters & { asOnDate?: Date }
export type StockSourceRow = {
  id: bigint; stockDate: Date; productId: bigint; variantId: bigint | null; productCode: string; productName: string
  category: string; subCategory: string; brand: string; variantCode: string; gstPercentage: number
  availableQty?: number; packSize?: string; sales: number; purchaseReturn: number; gstAmount: number; salesValue: number; discount: number
  eanCode?: string; hsnCode?: string; mrp?: number; costPrice?: number; salePrice?: number
  uom?: string; lastInwardDate?: Date | null
}

export type KotReportFilters = { from: Date; to: Date; page: number; perPage: number; reportType: 'summary' | 'detailed'; userId?: bigint }
export type KotSourceRow = { id: bigint; kotNo: string; kotDate: Date; userId: bigint | null; userName: string; status: number; items: Array<{ name: string; qty: number }> }

export type SalesmanReportFilters = { from: Date; to: Date; page: number; perPage: number; reportType: 'commission' | 'sale'; salesmanId?: bigint; itemCode?: string; itemName?: string; variantId?: bigint }
export type SalesmanSourceRow = { id: bigint; billDate: Date; salesmanId: bigint; salesmanCode: string; salesmanName: string; commission: number; productName: string; qty: number; unitPrice: number; discount: number; discountAmount?: number; productId?: bigint; variantId?: bigint | null; productCode?: string; variantCode?: string }

export type CustomerSalesReportFilters = { from: Date; to: Date; page: number; perPage: number; reportType: 'summary' | 'detailed'; customerId?: bigint; itemCode?: string; itemName?: string; variantId?: bigint }
export type CustomerSalesSourceRow = SalesSourceRow & { customerId: bigint; customerName: string }

export type DashboardData = {
  totalSales: number
  yesterdaySales: number
  salesPercentage: number
  totalBills: number
  paymentSummary: Array<{ paymentModeId: number; paymentMode: string; amount: number }>
  income: { totalIncome: number }
  expenses: { totalExpense: number }
  collectionSummary: { sales: number; income: number; expenses: number; netProfit: number }
  salesComparison: {
    weekly: Array<{ label: string; value: number }>
    monthly: Array<{ label: string; value: number }>
    yearly: Array<{ label: string; value: number }>
  }
  recentOrders: Array<{ id: string; bill: string; qty: number; amount: number; payment: string; name: string; type: string; date: string }>
}

export interface ReportStore {
  dashboard(clientId: bigint, now: Date): Promise<DashboardData>
  salesSource(clientId: bigint, filters: SalesReportFilters, limit: number): Promise<{ rows: SalesSourceRow[]; truncated: boolean }>
  reportVariants(clientId: bigint, itemCode: string): Promise<SalesReportOptions['variants']>
  salesOptions(clientId: bigint): Promise<SalesReportOptions>
  paymentSource(clientId: bigint, filters: PaymentCollectionFilters, limit: number): Promise<{ rows: PaymentSourceRow[]; truncated: boolean }>
  paymentOptions(clientId: bigint): Promise<PaymentReportOptions>
  billWiseSource(clientId: bigint, filters: BillWiseReportFilters, limit: number): Promise<{ rows: BillWiseSourceRow[]; truncated: boolean }>
  transferSource(clientId: bigint, direction: 'in' | 'out' | 'adjustment', filters: TransferReportFilters, limit: number): Promise<{ rows: TransferSourceRow[]; truncated: boolean }>
  stockMovementSource(clientId: bigint, filters: StockMovementFilters, limit: number): Promise<StockMovementSource>
  billSummarySource(clientId: bigint, filters: BillSummaryFilters, limit: number): Promise<BillSummarySource>
  stockSource(clientId: bigint, filters: StockReportFilters, limit: number): Promise<{ rows: StockSourceRow[]; truncated: boolean }>
  kotSource(clientId: bigint, filters: KotReportFilters, limit: number): Promise<{ rows: KotSourceRow[]; truncated: boolean }>
  salesmanSource(clientId: bigint, filters: SalesmanReportFilters, limit: number): Promise<{ rows: SalesmanSourceRow[]; truncated: boolean }>
  salesmanOptions(clientId: bigint): Promise<ReportOption[]>
  customerSalesSource(clientId: bigint, filters: CustomerSalesReportFilters, limit: number): Promise<{ rows: CustomerSalesSourceRow[]; truncated: boolean }>
  customerOptions(clientId: bigint): Promise<ReportOption[]>
}
