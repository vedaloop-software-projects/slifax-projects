import type { RequestHandler } from 'express'

const numericKeys = new Set([
  'acNonAc', 'acOrNonac', 'add', 'additionalCharges', 'allowChange', 'allowDecimals', 'allowDiscount', 'allowPriceOverride', 'allowRefund',
  'allowWeighingScale', 'amount', 'appStatus', 'askQtyWhileAddingItems', 'askSalesmanCode',
  'basicCost', 'billAmount', 'billMode', 'billNo', 'billNumber', 'billType', 'capacity', 'cashChange', 'cashDrawer', 'companyLogoOnBills',
  'confirmationToPrintBill', 'costPrice',
  'commissionPercent', 'creditDays', 'creditLimit', 'customerType', 'discount',
  'discountAmount', 'discountOnDiscountedItems', 'discountPercentage', 'discountType', 'discountValue', 'dineInPrice', 'durationMinutes',
  'edit', 'enableKds', 'enableKot', 'enableSplitSummary', 'enableTakeAway', 'exclusiveGstBilling',
  'expenseType', 'extendContract', 'gender',
  'freeQty', 'groupType', 'gst', 'gstPercentage', 'happyHours', 'isAdd', 'isEdit', 'isView', 'kit', 'kotRequired', 'lineNum', 'lockDays',
  'maxDiscountPercentage', 'minAmount', 'mrp',
  'noOfPersons', 'noofPersons', 'outstandingAmount', 'page', 'paymentMode', 'pincode',
  'price', 'printKotCategoryWise', 'printTokenCategoryWise', 'priority', 'purchaseQty', 'qoh',
  'qrCodeInBill', 'qty', 'resetBillNoAfterDayClose', 'roundOffValue', 'salePrice',
  'salonDuration', 'status', 'subscriptionDuration', 'subscriptionDiscountType',
  'subscriptionDiscountValue', 'subscriptionGst', 'subscriptionAmount', 'tableUnderMaintenance',
  'subTotal', 'takeAwayPrice', 'taxPercent', 'total', 'totalAmount', 'transferInNumber', 'transferOutNumber', 'validationMode', 'view', 'voidFlag', 'weekOff', 'wholeSalePrice',
])

const numericText = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i

function isNumericKey(key: string) {
  return key === 'id' || key.endsWith('Id') || key.endsWith('_id') || numericKeys.has(key)
}

export function normalizeLegacyInput(value: unknown, key = ''): unknown {
  if (value === '') return null
  if (Array.isArray(value)) return value.map((item) => normalizeLegacyInput(item, key))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, normalizeLegacyInput(childValue, childKey)]))
  }
  if (typeof value === 'string' && isNumericKey(key) && numericText.test(value.trim())) {
    const number = Number(value)
    if (Number.isFinite(number)) return number
  }
  return value
}

export const legacyInput: RequestHandler = (request, _response, next) => {
  if (request.body !== undefined) request.body = normalizeLegacyInput(request.body)
  next()
}
