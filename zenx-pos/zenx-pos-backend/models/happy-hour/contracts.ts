import type { Account } from '../auth/contracts.ts'

export type ProductChild = { id: bigint | null; productId: bigint; variantId: bigint }
export type GroupChild = { id: bigint | null; groupType: number; groupId: bigint; discountPercentage: number }
export type WindowInput = { name: string; fromTime: Date; toTime: Date; fromDate: Date; toDate: Date; status: number }
export type ProductHappyHourInput = WindowInput & { discountPercentage: number; products: ProductChild[] }
export type GroupHappyHourInput = WindowInput & { groups: GroupChild[] }
export type HappyHourResult = 'created' | 'updated' | 'missing' | 'child_missing' | 'overlap' | 'product_missing' | 'variant_missing' | 'group_missing'
export type ProductHappyHourRow = WindowInput & { id: bigint; discountPercentage: number; products: Array<ProductChild & { productCode: string; productShortName: string; productFullName: string; packSize: string }> }
export type GroupHappyHourRow = WindowInput & { id: bigint; groups: Array<GroupChild & { groupTypeName: string; groupName: string; groupCode: string }> }
export type ListFilter = { page: number; pageSize: number; status?: number; search?: string }
export type Page<T> = { rows: T[]; total: number }

export interface HappyHourStore {
  createProduct(account: Account, input: ProductHappyHourInput): Promise<HappyHourResult>
  updateProduct(account: Account, id: bigint, input: ProductHappyHourInput): Promise<HappyHourResult>
  getProduct(clientId: bigint, id: bigint): Promise<ProductHappyHourRow | null>
  listProducts(clientId: bigint, filter: ListFilter): Promise<Page<ProductHappyHourRow>>
  deleteProductChild(account: Account, id: bigint): Promise<HappyHourResult>
  createGroup(account: Account, input: GroupHappyHourInput): Promise<HappyHourResult>
  updateGroup(account: Account, id: bigint, input: GroupHappyHourInput): Promise<HappyHourResult>
  getGroup(clientId: bigint, id: bigint): Promise<GroupHappyHourRow | null>
  listGroups(clientId: bigint, filter: ListFilter): Promise<Page<GroupHappyHourRow>>
  deleteGroupChild(account: Account, id: bigint): Promise<HappyHourResult>
}
