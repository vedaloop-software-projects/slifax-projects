import type { BillingOperation } from '../../models/billing/contracts.ts'
import { legacyId } from '../../models/system/legacy-response.ts'
import { successResponse } from '../system/response.ts'

const messages: Record<BillingOperation, string> = {
  searchEanCode: 'Products fetched successfully.',
  getCustomerByMobile: 'Customer details fetched successfully.',
  addProductToTemp: 'Product added successfully.',
  updateTempProductQty: 'Quantity updated successfully.',
  updateTempProductSalePrice: 'Price updated successfully.',
  clearTempBill: 'products removed successfully.',
  updateVoid: 'Void flag updated successfully.',
  updateTempProductDiscount: 'Discount updated successfully.',
  getShortcutKeys: 'Shortcut keys fetched successfully.',
  suspendBill: 'Bill suspended successfully.',
  getProductDetails: 'Product details fetched successfully.',
  getSuspendedItems: 'Suspended Items fetched successfully.',
  resumeSuspendedBill: 'Suspended bill resumed successfully.',
  getTempBillItems: 'Billing items fetched successfully.',
  getTempBillItem: 'Billing items fetched successfully.',
  updateManualDiscount: 'Discount updated successfully.',
  clearManualDiscount: 'Manual discount cleared successfully.',
  getFreeProductDetails: 'Free product details fetched successfully.',
  saveBill: 'Bill generated successfully.',
  getApplicableBillBuster: 'Bill busters retrieved successfully.',
  applyBillBuster: 'Bill buster applied successfully.',
  overingBill: 'Bill overridden successfully.',
  checkRefundBill: 'Bill found successfully.',
  addRefundProductToTemp: 'Product added successfully.',
  saveRefundBill: 'Bill generated successfully.',
  getPrint: 'Bill details fetched successfully.',
  getDayCloseReport: 'Day close report fetched successfully.',
  dayClose: 'Day close completed successfully.',
  getBillFormats: 'Bill formats fetched successfully.',
}

const nullData = new Set<BillingOperation>([
  'addProductToTemp', 'updateTempProductQty', 'updateTempProductSalePrice', 'clearTempBill', 'updateVoid',
  'updateTempProductDiscount', 'resumeSuspendedBill', 'updateManualDiscount', 'clearManualDiscount', 'applyBillBuster',
  'overingBill', 'checkRefundBill', 'addRefundProductToTemp',
])

export function billingSuccessResponse(operation: BillingOperation, result: unknown) {
  if (nullData.has(operation)) return successResponse(messages[operation], null)
  if ((operation === 'saveBill' || operation === 'saveRefundBill') && result && typeof result === 'object') {
    const value = result as { id?: bigint; billNumber?: unknown; billDate?: unknown; total?: unknown }
    return successResponse(messages[operation], { billId: legacyId(value.id), billNo: value.billNumber, billDate: value.billDate, total: value.total })
  }
  return successResponse(messages[operation], result ?? null)
}
