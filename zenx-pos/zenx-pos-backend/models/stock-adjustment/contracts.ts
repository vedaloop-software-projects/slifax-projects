import type { Account } from '../auth/contracts.ts'

export type StockAdjustmentType = 'IN' | 'OUT'
export type AdjustmentItem = { id: bigint | null; lineNum: number; productId: bigint; variantId: bigint; qty: number; reason: string }
export type AdjustmentInput = { date: Date; stockType: StockAdjustmentType; reason: string; status: number; products: AdjustmentItem[] }
export type AdjustmentResult = 'created' | 'updated' | 'missing' | 'completed' | 'product_missing' | 'variant_missing' | 'tran_missing' | 'insufficient_stock'
export type AdjustmentLine = { id: bigint; lineNum: number; productId: bigint; variantId: bigint; costPrice: number; mrp: number; qty: number; reason: string; productFullName: string; productShortName: string; productCode: string; variantCode: string; eanCode: string | null; packSize: string }
export type AdjustmentDetail = { id: bigint; date: Date; stockType: StockAdjustmentType; reason: string; totalAmount: number; status: number; products: AdjustmentLine[] }
export type AdjustmentListRow = { id: bigint; date: Date; stockType: StockAdjustmentType; reason: string; userId: bigint; userName: string; status: number }
export type AdjustmentListFilter = { reason?: string; fromDate?: Date; toDate?: Date; status?: number; stockType?: StockAdjustmentType; limit: number }

export interface StockAdjustmentStore {
  create(account: Account, input: AdjustmentInput): Promise<AdjustmentResult>
  update(account: Account, id: bigint, input: AdjustmentInput): Promise<AdjustmentResult>
  get(clientId: bigint, id: bigint): Promise<AdjustmentDetail | null>
  list(clientId: bigint, filter: AdjustmentListFilter): Promise<{ rows: AdjustmentListRow[]; truncated: boolean }>
  removeLine(account: Account, adjustmentId: bigint, lineId: bigint): Promise<AdjustmentResult>
}
