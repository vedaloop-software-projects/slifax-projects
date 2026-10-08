import type { Account } from '../auth/contracts.ts'

export type WriteResult = 'saved' | 'missing' | 'parent_missing' | 'floor_missing' | 'table_type_missing' | 'code_duplicate' | 'name_duplicate' | 'percent_duplicate'

export type CategoryInput = {
  code: string
  name: string
  printerPath: string | null
  status: number
}

export type SubCategoryInput = {
  categoryId: bigint
  code: string
  name: string
  status: number
}

export type CategoryRow = CategoryInput & { id: bigint }
export type SimpleMasterInput = { code: string; name: string; status: number }
export type SimpleMasterRow = SimpleMasterInput & { id: bigint }
export type PaymentModeInput = { name: string; allowChange: number; status: number }
export type PaymentModeRow = PaymentModeInput & { id: bigint }
export type TaxInput = { code: string; name: string; percent: number; status: number }
export type TaxRow = TaxInput & { id: bigint }
export type SalesManInput = { teamId: bigint | null; code: string; name: string; commissionPercent: string | null; status: number }
export type SalesManRow = SalesManInput & { id: bigint; teamName: string }
export type NamedMasterInput = { name: string; status: number }
export type NamedMasterRow = NamedMasterInput & { id: bigint }
export type TableInput = { floorId: bigint; tableTypeId: bigint; code: string; name: string; capacity: number; acNonAc: number; underMaintenance: number; status: number }
export type TableRow = TableInput & { id: bigint; floorName: string; tableType: string }
export type SubCategoryRow = SubCategoryInput & {
  id: bigint
  categoryName: string
  categoryCode: string
}

export type Page<T> = { rows: T[]; total: number }
export type ListFilters = { search?: string; status?: number; page: number; perPage: number }
export type SubCategoryFilters = ListFilters & { categoryId?: bigint }
export type SalesManFilters = ListFilters & { teamId?: bigint }
export type TableFilters = ListFilters & { floorId?: bigint }

export type FeatureRow = {
  id: bigint
  feature: string
  subFeatures: { id: bigint; featureId: bigint; subFeature: string }[]
}

export interface MasterStore {
  listFeatures(): Promise<FeatureRow[]>
  listCategories(clientId: bigint, filters: ListFilters): Promise<Page<CategoryRow>>
  getCategory(clientId: bigint, id: bigint): Promise<CategoryRow | null>
  createCategory(account: Account, value: CategoryInput): Promise<WriteResult>
  updateCategory(account: Account, id: bigint, value: CategoryInput): Promise<WriteResult>
  listSubCategories(clientId: bigint, filters: SubCategoryFilters): Promise<Page<SubCategoryRow>>
  getSubCategory(clientId: bigint, id: bigint): Promise<SubCategoryRow | null>
  createSubCategory(account: Account, value: SubCategoryInput): Promise<WriteResult>
  updateSubCategory(account: Account, id: bigint, value: SubCategoryInput): Promise<WriteResult>
  listBrands(clientId: bigint, filters: ListFilters): Promise<Page<SimpleMasterRow>>
  getBrand(clientId: bigint, id: bigint): Promise<SimpleMasterRow | null>
  createBrand(account: Account, value: SimpleMasterInput): Promise<WriteResult>
  updateBrand(account: Account, id: bigint, value: SimpleMasterInput): Promise<WriteResult>
  listColours(clientId: bigint, filters: ListFilters): Promise<Page<SimpleMasterRow>>
  getColour(clientId: bigint, id: bigint): Promise<SimpleMasterRow | null>
  createColour(account: Account, value: SimpleMasterInput): Promise<WriteResult>
  updateColour(account: Account, id: bigint, value: SimpleMasterInput): Promise<WriteResult>
  listSizes(clientId: bigint, filters: ListFilters): Promise<Page<SimpleMasterRow>>
  getSize(clientId: bigint, id: bigint): Promise<SimpleMasterRow | null>
  createSize(account: Account, value: SimpleMasterInput): Promise<WriteResult>
  updateSize(account: Account, id: bigint, value: SimpleMasterInput): Promise<WriteResult>
  listUnitTypes(clientId: bigint, filters: ListFilters): Promise<Page<SimpleMasterRow>>
  getUnitType(clientId: bigint, id: bigint): Promise<SimpleMasterRow | null>
  createUnitType(account: Account, value: SimpleMasterInput): Promise<WriteResult>
  updateUnitType(account: Account, id: bigint, value: SimpleMasterInput): Promise<WriteResult>
  listTeams(clientId: bigint, filters: ListFilters): Promise<Page<SimpleMasterRow>>
  getTeam(clientId: bigint, id: bigint): Promise<SimpleMasterRow | null>
  createTeam(account: Account, value: SimpleMasterInput): Promise<WriteResult>
  updateTeam(account: Account, id: bigint, value: SimpleMasterInput): Promise<WriteResult>
  listPaymentModes(clientId: bigint, filters: ListFilters): Promise<Page<PaymentModeRow>>
  getPaymentMode(clientId: bigint, id: bigint): Promise<PaymentModeRow | null>
  createPaymentMode(account: Account, value: PaymentModeInput): Promise<WriteResult>
  updatePaymentMode(account: Account, id: bigint, value: PaymentModeInput): Promise<WriteResult>
  listTaxes(clientId: bigint, filters: ListFilters): Promise<Page<TaxRow>>
  getTax(clientId: bigint, id: bigint): Promise<TaxRow | null>
  createTax(account: Account, value: TaxInput): Promise<WriteResult>
  updateTax(account: Account, id: bigint, value: TaxInput): Promise<WriteResult>
  listSalesMans(clientId: bigint, filters: SalesManFilters): Promise<Page<SalesManRow>>
  getSalesMan(clientId: bigint, id: bigint): Promise<SalesManRow | null>
  createSalesMan(account: Account, value: SalesManInput): Promise<WriteResult>
  updateSalesMan(account: Account, id: bigint, value: SalesManInput): Promise<WriteResult>
  listFloors(clientId: bigint, filters: ListFilters): Promise<Page<SimpleMasterRow>>
  getFloor(clientId: bigint, id: bigint): Promise<SimpleMasterRow | null>
  createFloor(account: Account, value: SimpleMasterInput): Promise<WriteResult>
  updateFloor(account: Account, id: bigint, value: SimpleMasterInput): Promise<WriteResult>
  listTableTypes(clientId: bigint, filters: ListFilters): Promise<Page<NamedMasterRow>>
  getTableType(clientId: bigint, id: bigint): Promise<NamedMasterRow | null>
  createTableType(account: Account, value: NamedMasterInput): Promise<WriteResult>
  updateTableType(account: Account, id: bigint, value: NamedMasterInput): Promise<WriteResult>
  listTables(clientId: bigint, filters: TableFilters): Promise<Page<TableRow>>
  getTable(clientId: bigint, id: bigint): Promise<TableRow | null>
  createTable(account: Account, value: TableInput): Promise<WriteResult>
  updateTable(account: Account, id: bigint, value: TableInput): Promise<WriteResult>
  listRoles(clientId: bigint, filters: ListFilters): Promise<Page<NamedMasterRow>>
  getRole(clientId: bigint, id: bigint): Promise<NamedMasterRow | null>
  createRole(account: Account, value: NamedMasterInput): Promise<WriteResult>
  updateRole(account: Account, id: bigint, value: NamedMasterInput): Promise<WriteResult>
}
