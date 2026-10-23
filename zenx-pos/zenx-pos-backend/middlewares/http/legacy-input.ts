import type { RequestHandler } from 'express'

const numericKeys = new Set([
  'acNonAc', 'acOrNonac', 'add', 'additionalCharges', 'allowChange', 'allowDecimals', 'allowDiscount', 'allowPriceOverride', 'allowRefund',
  'allowWeighingScale', 'allowNegativeInventory', 'amount', 'appStatus', 'askQtyWhileAddingItems', 'askSalesmanCode',
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

// Laravel validated these text fields with regex, digits, or bare `required` rules,
// which also accept JSON numbers such as "mobile": 9876543210 from numeric keypads
// and barcode scanners. The Node schemas expect text, so integers become strings.
const digitTextKeys = new Set(['alternateMobile', 'alternate_mobile', 'hsnCode', 'mobile', 'mobileEmail', 'searchStr'])

// Text fields whose names would otherwise match the `Id` suffix rule.
const textKeys = new Set(['upiId'])

const numericText = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i

function isNumericKey(key: string) {
  if (textKeys.has(key)) return false
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
  if (typeof value === 'number' && digitTextKeys.has(key) && Number.isSafeInteger(value)) return String(value)
  return value
}

export const legacyInput: RequestHandler = (request, _response, next) => {
  if (request.body !== undefined) request.body = normalizeLegacyInput(request.body)
  next()
}
