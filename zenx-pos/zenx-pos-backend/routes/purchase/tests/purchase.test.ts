import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Account } from '../../../models/auth/contracts.ts'
import { applyOrderRules, averageSalesSuggestion, calendarDays, documentTotals, invoiceValues, lineValues, minMaxSuggestion, netStock, splitTax, taxTypeFor } from '../../../models/purchase/calc.ts'
import { ageBucket, checkAllocations, checkReceipt, overdueDays, debitNoteTarget, docNumber, dueDate, grnQuantities, invoiceOutstanding, invoicePaymentStatus, pendingQty, poActionTarget, poStatusAfterReceipt, prnStatusAfterPost, PurchaseError, rejectedReturnableQty, returnableQty } from '../../../models/purchase/rules.ts'
import { businessCalendarDay } from '../../../models/system/business-time.ts'
import { ApiError } from '../../auth/service.ts'
import { PurchaseService, type PurchaseStores } from '../service.ts'

const account: Account = { user: { id: 3n, clientId: 7n, name: 'A', mobile: '9', email: 'a@x', passwordHash: null, roleId: 4, isAdmin: 1, updatedAt: null }, client: { id: 7n, businessTypeId: 1, businessName: 'S', logo: null, address: '', city: '', startDate: new Date('2025-01-01'), endDate: new Date('2030-01-01') }, businessType: 'Retail', roleTitle: 'Admin' }

// ------------------------------------------------------------------ arithmetic

test('line values: discount % before GST, discount never above the line', () => {
  assert.deepEqual(lineValues({ qty: 10, rate: 50, discountPercent: 10, taxPercent: 18 }), { gross: 500, discount: 50, taxable: 450, tax: 81, total: 531 })
  assert.equal(lineValues({ qty: 1, rate: 100, discountAmount: 500, taxPercent: 5 }).taxable, 0)
})

test('GST split: CGST + SGST inside the state, IGST across, odd paise kept', () => {
  assert.deepEqual(splitTax(10.01, 'intra'), { cgst: 5.01, sgst: 5, igst: 0 })
  assert.deepEqual(splitTax(10.01, 'inter'), { cgst: 0, sgst: 0, igst: 10.01 })
  assert.equal(taxTypeFor(36, 36), 'intra')
  assert.equal(taxTypeFor(36, 29), 'inter')
  assert.equal(taxTypeFor(36, null), 'intra')
})

test('document totals round to the rupee', () => {
  const lines = [{ ...lineValues({ qty: 3, rate: 33.33, taxPercent: 5 }), qty: 3, freeQty: 1 }]
  const totals = documentTotals(lines, 'intra')
  assert.equal(totals.taxable, 99.99)
  assert.equal(totals.tax, 5)
  assert.equal(totals.net, 105)
  assert.equal(totals.roundOff, 0.01)
  assert.equal(totals.freeQty, 1)
})

test('invoice: overall then scheme discount spread over lines before GST', () => {
  const result = invoiceValues([{ qty: 1, rate: 100, taxPercent: 18 }, { qty: 1, rate: 300, taxPercent: 5 }], { type: 'percent', value: 10 }, { type: 'amount', value: 36 }, 'intra')
  assert.equal(result.overallDiscount, 40)
  assert.equal(result.schemeDiscount, 36)
  assert.equal(result.lines[0]!.headerDiscount + result.lines[1]!.headerDiscount, 76)
  assert.equal(result.lines[0]!.taxable, 81)
  assert.equal(result.lines[1]!.taxable, 243)
  assert.equal(result.taxable, 324)
  assert.equal(result.tax, round(81 * 0.18 + 243 * 0.05))
  assert.equal(result.net, Math.round(result.taxable + result.tax))
})
const round = (value: number) => Math.round(value * 100) / 100

// ------------------------------------------------------------------ Auto PO (decisions of 16-Nov-2026)

test('order rules: multiple rounds up, MOQ is a floor and is not rounded again', () => {
  assert.deepEqual(applyOrderRules(25, { purchaseMultiple: 12, supplierMoq: 0 }), { qty: 36, reasons: ['Multiple Rounding'] })
  assert.deepEqual(applyOrderRules(10, { purchaseMultiple: 12, supplierMoq: 50 }), { qty: 50, reasons: ['Multiple Rounding', 'MOQ Forced'] })
  assert.deepEqual(applyOrderRules(0, { purchaseMultiple: 12, supplierMoq: 50 }), { qty: 0, reasons: [] })
})

test('net stock adds pending PO (goods already coming), never subtracts it', () => {
  assert.equal(netStock(10, 50), 60)
  // 10 on hand, 50 ordered, target 40 -> nothing more to order.
  assert.equal(averageSalesSuggestion({ netSalesQty: 40, days: 10, coverageDays: 10, leadTimeDays: 0, safetyStock: 0, available: 10, pendingPo: 50, pendingGrn: 0, purchaseMultiple: 0, supplierMoq: 0 }).suggestedQty, 0)
})

test('average sales: Avg × (Coverage + Lead) + Safety − Net Stock; no lead time = original formula', () => {
  const base = { netSalesQty: 300, days: 30, coverageDays: 15, safetyStock: 5, available: 20, pendingPo: 10, pendingGrn: 0, purchaseMultiple: 0, supplierMoq: 0 }
  const noLead = averageSalesSuggestion({ ...base, leadTimeDays: 0 })
  assert.equal(noLead.avgDaily, 10)
  assert.equal(noLead.target, 155)
  assert.equal(noLead.suggestedQty, 125)
  assert.equal(noLead.reason, 'Coverage Shortfall')
  const lead = averageSalesSuggestion({ ...base, leadTimeDays: 3 })
  assert.equal(lead.target, 185)
  assert.equal(lead.suggestedQty, 155)
})

test('min/max: reorder to maximum only below minimum', () => {
  const rules = { purchaseMultiple: 6, supplierMoq: 0, pendingGrn: 0 }
  const below = minMaxSuggestion({ ...rules, available: 4, pendingPo: 2, minStock: 10, maxStock: 40 })
  assert.equal(below.netStock, 6)
  assert.equal(below.baseQty, 34)
  assert.equal(below.suggestedQty, 36)
  assert.equal(below.reason, 'Below Minimum, Multiple Rounding')
  assert.equal(minMaxSuggestion({ ...rules, available: 8, pendingPo: 2, minStock: 10, maxStock: 40 }).suggestedQty, 0)
})

test('calendar days are inclusive', () => {
  assert.equal(calendarDays(new Date('2026-11-01T00:00:00Z'), new Date('2026-11-30T00:00:00Z')), 30)
})

// ------------------------------------------------------------------ document rules

test('PO actions follow the approval flow', () => {
  assert.equal(poActionTarget('submit', 'draft', false), 'pending_approval')
  assert.equal(poActionTarget('approve', 'pending_approval', false), 'approved')
  assert.equal(poActionTarget('reject', 'pending_approval', false), 'draft')
  assert.equal(poActionTarget('cancel', 'approved', false), 'cancelled')
  assert.equal(poActionTarget('cancel', 'partially_received', true), 'closed')
  assert.throws(() => poActionTarget('approve', 'received', true), PurchaseError)
  assert.throws(() => poActionTarget('cancel', 'cancelled', false), PurchaseError)
})

test('PO receipt status and pending quantity', () => {
  assert.equal(pendingQty({ ordered: 10, received: 4, cancelled: 1 }), 5)
  assert.equal(poStatusAfterReceipt([{ ordered: 10, received: 4, cancelled: 0 }, { ordered: 5, received: 0, cancelled: 0 }]), 'partially_received')
  assert.equal(poStatusAfterReceipt([{ ordered: 10, received: 10, cancelled: 0 }, { ordered: 5, received: 2, cancelled: 3 }]), 'received')
  assert.equal(poStatusAfterReceipt([{ ordered: 10, received: 0, cancelled: 0 }]), 'approved')
})

test('excess receipt needs permission; GRN accepted = received − rejected', () => {
  assert.throws(() => checkReceipt(5, 6, false, 'Tea'), /only 5 is pending/)
  assert.doesNotThrow(() => checkReceipt(5, 6, true, 'Tea'))
  assert.deepEqual(grnQuantities({ receivedQty: 10, rejectedQty: 2 }, 'Tea'), { received: 10, rejected: 2, accepted: 8 })
  assert.throws(() => grnQuantities({ receivedQty: 1, rejectedQty: 2 }, 'Tea'), PurchaseError)
})

test('returns are capped by what was kept and not yet returned', () => {
  assert.equal(returnableQty({ accepted: 8, returned: 3 }), 5)
  assert.equal(rejectedReturnableQty({ rejected: 2, rejectedReturned: 2 }), 0)
  assert.equal(prnStatusAfterPost(true), 'pending_debit_note')
  assert.equal(prnStatusAfterPost(false), 'completed')
})

test('debit note statuses', () => {
  assert.equal(debitNoteTarget('post', 'draft'), 'posted')
  assert.equal(debitNoteTarget('acknowledged', 'sent'), 'acknowledged')
  assert.throws(() => debitNoteTarget('post', 'posted'), PurchaseError)
  assert.throws(() => debitNoteTarget('cancel', 'settled'), PurchaseError)
})

test('document numbers and due dates', () => {
  assert.equal(docNumber('GRN', 42n), 'GRN-00042')
  assert.equal(dueDate(new Date('2026-11-10T00:00:00Z'), 30).toISOString().slice(0, 10), '2026-12-10')
})

// ------------------------------------------------------------------ service validation

function service() {
  const saved: Record<string, unknown> = {}
  const masters = {
    saveSupplier: async (_a: Account, _id: bigint | null, input: unknown) => { saved.supplier = input; return 1n },
    getSupplier: async () => saved.supplier,
  }
  const orders = { save: async (_a: Account, _id: bigint | null, input: unknown, action: string) => { saved.order = input; saved.action = action; return { id: 1n, number: 'PO-00001', status: 'draft' } } }
  return { saved, purchase: new PurchaseService({ masters, orders, receipts: {}, returns: {} } as unknown as PurchaseStores) }
}

const supplier = { code: 'S001', name: 'Sri Traders', mobile: '9876543210', stateId: 36, gstRegistration: 'registered', gstin: '36ABCDE1234F1Z5', creditDays: 30, openingBalance: 0, visitDay: 'Monday' }

test('supplier: GST No required when registered; PAN filled from the GST No', async () => {
  const { saved, purchase } = service()
  await purchase.saveSupplier(account, null, supplier)
  assert.equal((saved.supplier as { pan: string }).pan, 'ABCDE1234F')
  await assert.rejects(purchase.saveSupplier(account, null, { ...supplier, gstin: '' }), /GST No is required/)
  await purchase.saveSupplier(account, null, { ...supplier, gstRegistration: 'unregistered', gstin: '' })
  assert.equal((saved.supplier as { gstin: string | null }).gstin, null)
})

test('supplier field validation', async () => {
  const { purchase } = service()
  const rejects = (patch: object, pattern: RegExp) => assert.rejects(purchase.saveSupplier(account, null, { ...supplier, ...patch }), (error: unknown) => error instanceof ApiError && error.status === 422 && pattern.test(error.message))
  await rejects({ mobile: '98765' }, /10 digits/)
  await rejects({ alternateMobile: '12' }, /Alternate mobile/)
  await rejects({ email: 'not-an-email' }, /valid email/)
  await rejects({ pincode: '5000' }, /6 digits/)
  await rejects({ gstin: '36ABCDE1234F1Y5' }, /valid 15-character/)
  await rejects({ pan: 'ABCDE1234' }, /valid PAN/)
  await rejects({ pan: 'ZZZZZ1234F' }, /does not match/)
  await rejects({ creditDays: -1 }, /cannot be negative/)
  await rejects({ creditDays: 1.5 }, /whole number/)
  await rejects({ openingBalance: -10 }, /cannot be negative/)
  await rejects({ visitDay: 'Funday' }, /visitDay/)
  await rejects({ code: '' }, /code is required/)
  await rejects({ stateId: '' }, /stateId/)
})

test('purchase orders cannot be dated in the future (store calendar, server clock)', async () => {
  const { saved, purchase } = service()
  const future = new Date(businessCalendarDay().getTime() + 2 * 86_400_000)
  const text = `${String(future.getUTCDate()).padStart(2, '0')}-${String(future.getUTCMonth() + 1).padStart(2, '0')}-${future.getUTCFullYear()}`
  const order = { supplierId: '5', lines: [{ variantId: '9', qty: 2, rate: 10 }] }
  await assert.rejects(purchase.saveOrder(account, null, { ...order, date: text }), /future/)
  await purchase.saveOrder(account, null, { ...order, action: 'submit' })
  assert.equal(saved.action, 'submit')
  assert.equal((saved.order as { date: Date }).date.getTime(), businessCalendarDay().getTime())
  await assert.rejects(purchase.saveOrder(account, null, { ...order, lines: [{ variantId: '9', qty: 0, rate: 10 }] }), /more than 0/)
})

test('empty optional numbers stay "not given" (null), never 0', async () => {
  const seen: Record<string, unknown> = {}
  const purchase = new PurchaseService({
    masters: { autoPoSuggestions: async (_c: bigint, input: unknown) => { seen.autoPo = input; return {} } },
    orders: {}, receipts: { saveInvoice: async (_a: Account, _id: bigint | null, input: unknown) => { seen.invoice = input; return {} } },
    returns: { saveReturn: async (_a: Account, _id: bigint | null, input: unknown) => { seen.prn = input; return {} } },
  } as unknown as PurchaseStores)
  await purchase.saveInvoice(account, null, { grnId: '4', supplierInvoiceNo: 'B1', supplierInvoiceDate: '01-11-2026', creditDays: null, roundOff: null, lines: [{ grnLineId: '9', qty: 1, rate: 10 }] })
  const invoice = seen.invoice as { roundOff: unknown; creditDays: unknown }
  assert.equal(invoice.roundOff, null)
  assert.equal(invoice.creditDays, null)
  await purchase.saveInvoice(account, null, { grnId: '4', supplierInvoiceNo: 'B1', supplierInvoiceDate: '01-11-2026', roundOff: 0.25, creditDays: '', lines: [{ grnLineId: '9', qty: 1, rate: 10 }] })
  assert.equal((seen.invoice as { roundOff: unknown }).roundOff, 0.25)
  assert.equal((seen.invoice as { creditDays: unknown }).creditDays, null)
  await purchase.saveReturn(account, null, { supplierId: '5', grnId: '4', returnReason: 'damaged', lines: [{ grnLineId: '9', variantId: '3', returnQty: 1, rate: null, discountPercent: null }] })
  const line = (seen.prn as { lines: Array<{ rate: unknown; discountPercent: unknown }> }).lines[0]!
  assert.equal(line.rate, null)
  assert.equal(line.discountPercent, null)
  await purchase.autoPoSuggest(account, { method: 'mbq', leadTimeDays: '' })
  assert.equal((seen.autoPo as { leadTimeDays: unknown }).leadTimeDays, null)
  await purchase.autoPoSuggest(account, { method: 'mbq', leadTimeDays: 0 })
  assert.equal((seen.autoPo as { leadTimeDays: unknown }).leadTimeDays, 0)
})

test('invoice outstanding and payment status', () => {
  assert.equal(invoiceOutstanding({ net: 1000, paid: 300, adjusted: 118.5 }), 581.5)
  assert.equal(invoiceOutstanding({ net: 100, paid: 120, adjusted: 0 }), 0)
  assert.equal(invoicePaymentStatus({ net: 1000, paid: 0, adjusted: 0 }), 'unpaid')
  assert.equal(invoicePaymentStatus({ net: 1000, paid: 0, adjusted: 200 }), 'partially_paid')
  assert.equal(invoicePaymentStatus({ net: 1000, paid: 800, adjusted: 200 }), 'paid')
})

test('allocations: positive, no duplicates, within what is paid (paise exact)', () => {
  assert.equal(checkAllocations([{ invoiceId: 1n, amount: 0.1 }, { invoiceId: 2n, amount: 0.2 }], 0.3), 0.3)
  assert.equal(checkAllocations([{ invoiceId: null, amount: 50 }], 50), 50)
  assert.throws(() => checkAllocations([{ invoiceId: 1n, amount: 10 }, { invoiceId: 1n, amount: 5 }], 100), /twice/)
  assert.throws(() => checkAllocations([{ invoiceId: 1n, amount: 0 }], 100), /more than 0/)
  assert.throws(() => checkAllocations([{ invoiceId: 1n, amount: 100.01 }], 100), /more than/)
})

test('payment validation by mode', async () => {
  let saved: { date: Date; chequeDate: Date | null } | undefined
  const purchase = new PurchaseService({ payments: { save: async (_a: Account, input: typeof saved) => { saved = input; return {} } } } as unknown as PurchaseStores)
  const base = { supplierId: '5', amount: 1000 }
  await purchase.savePayment(account, { ...base, mode: 'cash' })
  assert.equal(saved!.chequeDate, null)
  await assert.rejects(purchase.savePayment(account, { ...base, mode: 'upi' }), /UTR/)
  await assert.rejects(purchase.savePayment(account, { ...base, mode: 'cheque', referenceNo: '000123', bankAccount: 'HDFC 1234' }), /cheque date/)
  await assert.rejects(purchase.savePayment(account, { ...base, mode: 'bank', referenceNo: 'UTR1' }), /bank account/)
  await assert.rejects(purchase.savePayment(account, { supplierId: '5', mode: 'cash', amount: 0 }), /amount paid/)
  await purchase.savePayment(account, { ...base, mode: 'cheque', referenceNo: '000123', bankAccount: 'HDFC 1234', chequeDate: '20-11-2026' })
  assert.equal(saved!.chequeDate!.toISOString().slice(0, 10), '2026-11-20')
})

test('ageing buckets by days past the due date', () => {
  const asOn = new Date('2026-11-16T00:00:00Z')
  assert.equal(overdueDays(new Date('2026-11-16T00:00:00Z'), asOn), 0)
  assert.equal(overdueDays(new Date('2026-12-01T00:00:00Z'), asOn), -15)
  assert.equal(overdueDays(new Date('2026-08-18T00:00:00Z'), asOn), 90)
  assert.deepEqual([-15, 0, 1, 30, 31, 60, 61, 90, 91].map(ageBucket), ['not_due', 'not_due', 'd1_30', 'd1_30', 'd31_60', 'd31_60', 'd61_90', 'd61_90', 'd90_plus'])
})
