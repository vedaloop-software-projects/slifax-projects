// Purchase arithmetic. Pure functions so the rules can be tested without a database.
// Purchase rates exclude GST; amounts are rounded to paise, quantities to 3 decimals.

export type TaxType = 'intra' | 'inter'
export type DiscountType = 'percent' | 'amount'

export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
export const round3 = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000

// CGST + SGST when the supplier is in the store's state (or has no state on record), IGST otherwise.
export function taxTypeFor(storeStateId: number | null, supplierStateId: number | null): TaxType {
  return supplierStateId && storeStateId && supplierStateId !== storeStateId ? 'inter' : 'intra'
}

export function splitTax(tax: number, taxType: TaxType) {
  if (taxType === 'inter') return { cgst: 0, sgst: 0, igst: round2(tax) }
  const cgst = round2(tax / 2)
  return { cgst, sgst: round2(tax - cgst), igst: 0 }
}

export type LineInput = { qty: number; rate: number; discountPercent?: number; discountAmount?: number; taxPercent: number }

// A percentage discount wins over an amount; a discount never exceeds the line.
export function lineValues(line: LineInput) {
  const gross = round2(line.qty * line.rate)
  const percent = Math.min(Math.max(line.discountPercent ?? 0, 0), 100)
  const discount = percent > 0 ? round2(gross * percent / 100) : round2(Math.min(Math.max(line.discountAmount ?? 0, 0), gross))
  const taxable = round2(gross - discount)
  const tax = round2(taxable * line.taxPercent / 100)
  return { gross, discount, taxable, tax, total: round2(taxable + tax) }
}

export type LineValues = ReturnType<typeof lineValues>

// Header totals for a PO / GRN: CGST/SGST or IGST, rounded to the rupee.
export function documentTotals(lines: Array<LineValues & { qty: number; freeQty?: number }>, taxType: TaxType) {
  const sum = (pick: (line: (typeof lines)[number]) => number) => lines.reduce((total, line) => total + pick(line), 0)
  const tax = round2(sum(line => line.tax)), taxable = round2(sum(line => line.taxable)), exact = round2(taxable + tax), net = Math.round(exact)
  return {
    totalQty: round3(sum(line => line.qty)), freeQty: round3(sum(line => line.freeQty ?? 0)),
    gross: round2(sum(line => line.gross)), discount: round2(sum(line => line.discount)), taxable, tax, ...splitTax(tax, taxType),
    roundOff: round2(net - exact), net,
  }
}

export type HeaderDiscount = { type: DiscountType; value: number }

const headerAmount = (base: number, discount: HeaderDiscount) =>
  discount.type === 'percent' ? round2(base * Math.min(Math.max(discount.value, 0), 100) / 100) : round2(Math.min(Math.max(discount.value, 0), base))

// Purchase invoice: line discounts first, then the overall discount, then the supplier
// scheme discount (on what is left). Header discounts are spread over the lines in
// proportion to their taxable value, before GST; the last line takes the paise left over.
export function invoiceValues(lines: Array<LineInput & { freeQty?: number }>, overall: HeaderDiscount, scheme: HeaderDiscount, taxType: TaxType, roundOffOverride?: number) {
  const base = lines.map(lineValues)
  const afterLines = round2(base.reduce((total, line) => total + line.taxable, 0))
  const overallAmount = headerAmount(afterLines, overall)
  const schemeAmount = headerAmount(round2(afterLines - overallAmount), scheme)
  const headerTotal = round2(overallAmount + schemeAmount)
  let spread = 0
  const values = base.map((line, index) => {
    const share = index === base.length - 1 ? round2(headerTotal - spread) : afterLines > 0 ? round2(headerTotal * line.taxable / afterLines) : 0
    spread = round2(spread + share)
    const taxable = round2(Math.max(line.taxable - share, 0))
    const tax = round2(taxable * lines[index]!.taxPercent / 100)
    return { ...line, headerDiscount: share, taxable, tax, ...splitTax(tax, taxType), total: round2(taxable + tax) }
  })
  const taxable = round2(values.reduce((total, line) => total + line.taxable, 0))
  const tax = round2(values.reduce((total, line) => total + line.tax, 0))
  const exact = round2(taxable + tax)
  const roundOff = roundOffOverride === undefined ? round2(Math.round(exact) - exact) : round2(roundOffOverride)
  return {
    lines: values,
    gross: round2(base.reduce((total, line) => total + line.gross, 0)), lineDiscount: round2(base.reduce((total, line) => total + line.discount, 0)),
    overallDiscount: overallAmount, schemeDiscount: schemeAmount, taxable, tax, ...splitTax(tax, taxType), roundOff, net: round2(exact + roundOff),
  }
}

// ---------------------------------------------------------------- Auto PO

export type Rounding = { purchaseMultiple: number; supplierMoq: number }

// Order multiple first (ceiling), then the supplier MOQ as a floor. The MOQ is not
// rounded again to the multiple. Returns the reasons that changed the quantity.
export function applyOrderRules(baseQty: number, rules: Rounding) {
  const reasons: string[] = []
  let qty = round3(Math.max(baseQty, 0))
  if (qty <= 0) return { qty: 0, reasons }
  if (rules.purchaseMultiple > 0) {
    const rounded = round3(Math.ceil(round3(qty / rules.purchaseMultiple)) * rules.purchaseMultiple)
    if (rounded !== qty) reasons.push('Multiple Rounding')
    qty = rounded
  }
  if (rules.supplierMoq > 0 && qty < rules.supplierMoq) { qty = round3(rules.supplierMoq); reasons.push('MOQ Forced') }
  return { qty, reasons }
}

// Net Stock for reordering = what is on hand plus what is already coming. Pending GRN is
// only stock received on a GRN not yet posted (and not against a PO, which is already in
// Pending PO), so nothing is counted twice.
export const netStock = (available: number, pendingPo: number, pendingGrn = 0) => round3(available + pendingPo + pendingGrn)

export type AverageSalesInput = Rounding & {
  netSalesQty: number; days: number; coverageDays: number; leadTimeDays: number; safetyStock: number
  available: number; pendingPo: number; pendingGrn: number
}

// Avg Daily Sales = Net Sales Qty ÷ calendar days in the period.
// Target = Avg Daily Sales × (Coverage Days + Lead Time Days) + Safety Stock
// (with no lead time this is the spec's Avg × Coverage + Safety).
// Suggested = MAX(0, Target − Net Stock), then order multiple and MOQ.
export function averageSalesSuggestion(input: AverageSalesInput) {
  const avgDaily = input.days > 0 ? Math.max(input.netSalesQty, 0) / input.days : 0
  const target = round3(avgDaily * (input.coverageDays + Math.max(input.leadTimeDays, 0)) + Math.max(input.safetyStock, 0))
  const net = netStock(input.available, input.pendingPo, input.pendingGrn)
  const base = round3(Math.max(0, target - net))
  const ordered = applyOrderRules(base, input)
  return { avgDaily: round3(avgDaily), target, netStock: net, baseQty: base, suggestedQty: ordered.qty, reason: base > 0 ? ['Coverage Shortfall', ...ordered.reasons].join(', ') : '' }
}

export type MinMaxInput = Rounding & { available: number; pendingPo: number; pendingGrn: number; minStock: number; maxStock: number }

// Reorder only when Net Stock < Minimum: Base = Maximum − Net Stock, then multiple and MOQ.
export function minMaxSuggestion(input: MinMaxInput) {
  const net = netStock(input.available, input.pendingPo, input.pendingGrn)
  const base = net < input.minStock ? round3(Math.max(input.maxStock - net, 0)) : 0
  const ordered = applyOrderRules(base, input)
  return { netStock: net, baseQty: base, suggestedQty: ordered.qty, reason: base > 0 ? ['Below Minimum', ...ordered.reasons].join(', ') : '' }
}

// Calendar days from..to inclusive (both @db.Date values at UTC midnight).
export const calendarDays = (from: Date, to: Date) => Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1
