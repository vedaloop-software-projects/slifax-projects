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
  billMode: number
  productCode: string
  productName: string
  category: string
  subCategory: string
  brand: string
  variantCode: string
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
  productCode: string
  productName: string
  eanCode: string
  hsnCode: string
  category: string
  subCategory: string
  brand: string
  variantCode: string
}

export type SalesReportOptions = {
  categories: ReportOption[]
  subCategories: Array<ReportOption & { categoryId: number }>
  brands: ReportOption[]
  variants: Array<ReportOption & { code: string; productId: number }>
  taxes: ReportOption[]
}

export type PaymentReportOptions = { paymentModes: ReportOption[]; users: ReportOption[] }

export interface ReportStore {
  salesSource(clientId: bigint, filters: SalesReportFilters, limit: number): Promise<{ rows: SalesSourceRow[]; truncated: boolean }>
  salesOptions(clientId: bigint): Promise<SalesReportOptions>
  paymentSource(clientId: bigint, filters: PaymentCollectionFilters, limit: number): Promise<{ rows: PaymentSourceRow[]; truncated: boolean }>
  paymentOptions(clientId: bigint): Promise<PaymentReportOptions>
  billWiseSource(clientId: bigint, filters: BillWiseReportFilters, limit: number): Promise<{ rows: BillWiseSourceRow[]; truncated: boolean }>
  transferSource(clientId: bigint, direction: 'in' | 'out', filters: TransferReportFilters, limit: number): Promise<{ rows: TransferSourceRow[]; truncated: boolean }>
}
