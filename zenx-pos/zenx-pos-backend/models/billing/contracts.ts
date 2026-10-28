import type { Account } from '../auth/contracts.ts'

export const billingOperations = [
  'searchEanCode', 'getCustomerByMobile', 'updateTempProductQty', 'updateTempProductSalePrice',
  'clearTempBill', 'updateVoid', 'updateTempProductDiscount', 'getShortcutKeys', 'suspendBill',
  'getProductDetails', 'addProductToTemp', 'getSuspendedItems', 'resumeSuspendedBill',
  'getTempBillItems', 'getTempBillItem', 'updateManualDiscount', 'clearManualDiscount',
  'getFreeProductDetails', 'saveBill', 'getApplicableBillBuster', 'applyBillBuster',
  'overingBill', 'checkRefundBill', 'addRefundProductToTemp', 'saveRefundBill', 'getPrint',
  'getDayCloseReport', 'dayClose', 'getPendingDayCloses', 'getBillFormats',
] as const
export type BillingOperation = typeof billingOperations[number]
export type BillingPayload = Record<string, unknown>
export interface BillingStore {
  execute(operation: BillingOperation, account: Account, payload: BillingPayload): Promise<unknown>
}
