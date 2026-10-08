import type { Account } from '../auth/contracts.ts'
export type DiscountResult = 'created' | 'updated' | 'missing' | 'child_missing' | 'group_missing' | 'overlap' | 'product_missing' | 'variant_missing' | 'free_product_missing' | 'free_variant_missing' | 'discount_too_high'
export type GroupDiscountInput = { groupType: number; groupId: bigint; discount: number; fromDate: Date; toDate: Date; status: number }
export type GroupDiscountRow = GroupDiscountInput & { id: bigint; groupTypeName: string; groupName: string; groupCode: string }
export type DiscountListFilter = { page: number; pageSize: number; status?: number; groupType?: number; groupId?: bigint }
export type ItemDiscountInput = { productId: bigint; variantId: bigint; purchaseQty: number; freeProductId: bigint; freeVariantId: bigint; freeQty: number; discountPercentage: number; discountValue: number; fromDate: Date; toDate: Date; status: number }
export type ProductInfo = { productCode: string; productShortName: string; productFullName: string; packSize: string; mrp: number; salePrice: number }
export type ItemDiscountRow = ItemDiscountInput & ProductInfo & { id: bigint; freeProductCode: string; freeProductShortName: string; freeProductFullName: string; freePackSize: string; freeMrp: number; freeSalePrice: number }
export type ItemListFilter = { page: number; pageSize: number; status?: number; search?: string }
export type PurchaseTier = { id: bigint | null; purchaseQty: number; salePrice: number }
export type PurchaseDiscountInput = { productId: bigint; variantId: bigint; fromDate: Date; toDate: Date; status: number; discounts: PurchaseTier[] }
export type PurchaseDiscountRow = Omit<PurchaseDiscountInput, 'discounts'> & ProductInfo & { id: bigint; discounts: PurchaseTier[] }
export type BillBusterChild = { id: bigint | null; productId: bigint; variantId: bigint; freeQty: number; discountPercentage: number }
export type BillBusterInput = { schemeName: string; billAmount: number; discountPercentage: number; fromDate: Date; toDate: Date; status: number; discounts: BillBusterChild[] }
export type BillBusterRow = Omit<BillBusterInput, 'discounts'> & { id: bigint; discounts: Array<BillBusterChild & ProductInfo> }
export interface DiscountStore {
  createGroup(account: Account, input: GroupDiscountInput): Promise<DiscountResult>
  updateGroup(account: Account, id: bigint, input: GroupDiscountInput): Promise<DiscountResult>
  getGroup(clientId: bigint, id: bigint): Promise<GroupDiscountRow | null>
  listGroups(clientId: bigint, filter: DiscountListFilter): Promise<{ rows: GroupDiscountRow[]; total: number }>
  createItem(account: Account, input: ItemDiscountInput): Promise<DiscountResult>
  updateItem(account: Account, id: bigint, input: ItemDiscountInput): Promise<DiscountResult>
  getItem(clientId: bigint, id: bigint): Promise<ItemDiscountRow | null>
  searchItems(clientId: bigint, productId: bigint, variantId: bigint): Promise<ItemDiscountRow[]>
  listItems(clientId: bigint, filter: ItemListFilter): Promise<{ rows: ItemDiscountRow[]; total: number }>
  createPurchase(account: Account, input: PurchaseDiscountInput): Promise<DiscountResult>
  updatePurchase(account: Account, id: bigint, input: PurchaseDiscountInput): Promise<DiscountResult>
  getPurchase(clientId: bigint, id: bigint): Promise<PurchaseDiscountRow | null>
  searchPurchases(clientId: bigint, productId: bigint, variantId: bigint): Promise<PurchaseDiscountRow[]>
  listPurchases(clientId: bigint, filter: ItemListFilter): Promise<{ rows: PurchaseDiscountRow[]; total: number }>
  deletePurchaseChild(account: Account, id: bigint): Promise<DiscountResult>
  createBillBuster(account: Account, input: BillBusterInput): Promise<DiscountResult>
  updateBillBuster(account: Account, id: bigint, input: BillBusterInput): Promise<DiscountResult>
  getBillBuster(clientId: bigint, id: bigint): Promise<BillBusterRow | null>
  listBillBusters(clientId: bigint, filter: ItemListFilter): Promise<{ rows: BillBusterRow[]; total: number }>
  deleteBillBusterChild(account: Account, id: bigint): Promise<DiscountResult>
}
