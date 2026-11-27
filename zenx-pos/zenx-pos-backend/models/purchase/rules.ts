import { round3 } from './calc.ts'

// A business rule was broken; the message is shown to the store as is.
export class PurchaseError extends Error {
  readonly status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}
export const fail = (message: string, status = 422): never => { throw new PurchaseError(status, message) }

export const PO_STATUSES = ['draft', 'pending_approval', 'approved', 'partially_received', 'received', 'closed', 'cancelled'] as const
export type PoStatus = (typeof PO_STATUSES)[number]
// POs that still expect goods (counted as Pending PO; drafts too, so Auto PO never orders twice).
export const OPEN_PO_STATUSES: PoStatus[] = ['draft', 'pending_approval', 'approved', 'partially_received']
// POs a GRN can be made against.
export const RECEIVABLE_PO_STATUSES: PoStatus[] = ['approved', 'partially_received']

export type PoAction = 'submit' | 'approve' | 'reject' | 'cancel'
const PO_FROM: Record<PoAction, PoStatus[]> = {
  submit: ['draft'],
  approve: ['draft', 'pending_approval'],
  reject: ['pending_approval'],
  cancel: ['draft', 'pending_approval', 'approved', 'partially_received'],
}

// Cancelling a PO that already received goods short-closes it: the rest is cancelled.
export function poActionTarget(action: PoAction, current: string, anythingReceived: boolean): PoStatus {
  if (!PO_FROM[action].includes(current as PoStatus)) fail(`A ${label(current)} purchase order cannot be ${PAST[action]}.`)
  if (action === 'submit') return 'pending_approval'
  if (action === 'approve') return 'approved'
  if (action === 'reject') return 'draft'
  return anythingReceived ? 'closed' : 'cancelled'
}
const PAST: Record<PoAction, string> = { submit: 'submitted', approve: 'approved', reject: 'rejected', cancel: 'cancelled' }
const label = (status: string) => status.replaceAll('_', ' ')

export type PoLineQty = { ordered: number; received: number; cancelled: number }
export const pendingQty = (line: PoLineQty) => round3(Math.max(line.ordered - line.received - line.cancelled, 0))

export function poStatusAfterReceipt(lines: PoLineQty[]): PoStatus {
  if (lines.every(line => pendingQty(line) <= 0)) return 'received'
  return lines.some(line => line.received > 0) ? 'partially_received' : 'approved'
}

// Receiving more than is pending needs an admin and a reason.
export function checkReceipt(pending: number, receiving: number, excessAllowed: boolean, product: string) {
  if (receiving > pending + 1e-9 && !excessAllowed) fail(`${product}: receiving ${receiving} but only ${pending} is pending on the purchase order. An admin can allow excess receipt with a reason.`)
}

// GRN quantities: received = accepted + rejected.
export function grnQuantities(line: { receivedQty: number; rejectedQty: number }, product: string) {
  const rejected = round3(line.rejectedQty), received = round3(line.receivedQty)
  if (rejected > received) fail(`${product}: rejected quantity cannot be more than received.`)
  return { received, rejected, accepted: round3(received - rejected) }
}

export const invoiceableQty = (line: { accepted: number; invoiced: number }) => round3(Math.max(line.accepted - line.invoiced, 0))
// Paid (accepted) goods can be returned; free goods are not valued, so they are not returned on a PRN.
export const returnableQty = (line: { accepted: number; returned: number }) => round3(Math.max(line.accepted - line.returned, 0))
export const rejectedReturnableQty = (line: { rejected: number; rejectedReturned: number }) => round3(Math.max(line.rejected - line.rejectedReturned, 0))

// After posting, a PRN waits for its debit note (if one is wanted) before it is complete.
export const prnStatusAfterPost = (debitNoteRequired: boolean) => debitNoteRequired ? 'pending_debit_note' : 'completed'

export type DebitNoteAction = 'post' | 'sent' | 'acknowledged' | 'settled' | 'cancel'
const DN_FROM: Record<DebitNoteAction, string[]> = {
  post: ['draft'], sent: ['posted'], acknowledged: ['posted', 'sent'], settled: ['posted', 'sent', 'acknowledged'], cancel: ['draft', 'posted'],
}
export function debitNoteTarget(action: DebitNoteAction, current: string) {
  if (!DN_FROM[action].includes(current)) fail(`A ${label(current)} debit note cannot be marked ${action === 'post' ? 'posted' : action === 'cancel' ? 'cancelled' : action}.`)
  return action === 'post' ? 'posted' : action === 'cancel' ? 'cancelled' : action
}

export const DOC_PREFIX = { PO: 'PO', GRN: 'GRN', PI: 'PI', PRN: 'PRN', DN: 'DN', SCN: 'SCN', PAY: 'PAY' } as const
export type DocType = keyof typeof DOC_PREFIX
export const docNumber = (type: DocType, number: bigint | number) => `${DOC_PREFIX[type]}-${String(number).padStart(5, '0')}`

// Due date = invoice date + credit days (both calendar days at UTC midnight).
export const dueDate = (invoiceDate: Date, creditDays: number) => new Date(invoiceDate.getTime() + Math.max(creditDays, 0) * 86_400_000)

// ---------------------------------------------------------------- Payments

const cents = (value: number) => Math.round(value * 100)

// What is still owed on an invoice after notes against it and payments.
export const invoiceOutstanding = (invoice: { net: number; paid: number; adjusted: number }) => Math.max(cents(invoice.net) - cents(invoice.paid) - cents(invoice.adjusted), 0) / 100

export function invoicePaymentStatus(invoice: { net: number; paid: number; adjusted: number }) {
  if (invoiceOutstanding(invoice) <= 0) return 'paid'
  return invoice.paid > 0 || invoice.adjusted > 0 ? 'partially_paid' : 'unpaid'
}

export type Allocation = { invoiceId: bigint | null; amount: number }

// Every allocation is positive, each invoice appears once, and together they fit in what is paid.
export function checkAllocations(allocations: Allocation[], available: number) {
  const seen = new Set<string>()
  let total = 0
  for (const allocation of allocations) {
    if (!(allocation.amount > 0)) fail('Each allocation must be more than 0.')
    const key = allocation.invoiceId === null ? 'opening' : String(allocation.invoiceId)
    if (seen.has(key)) fail('An invoice appears twice in the allocation.')
    seen.add(key)
    total += cents(allocation.amount)
  }
  if (total > cents(available)) fail(`Allocated ₹${(total / 100).toFixed(2)} is more than the ₹${available.toFixed(2)} available.`)
  return total / 100
}

export const PAYMENT_MODES = ['cash', 'bank', 'upi', 'cheque', 'other'] as const
export type PaymentMode = (typeof PAYMENT_MODES)[number]

// ---------------------------------------------------------------- Ageing

export const AGE_BUCKETS = ['not_due', 'd1_30', 'd31_60', 'd61_90', 'd90_plus'] as const
export type AgeBucket = (typeof AGE_BUCKETS)[number]

// Whole days from the due date to the as-on date (both UTC-midnight calendar days).
export const overdueDays = (dueDate: Date, asOn: Date) => Math.round((asOn.getTime() - dueDate.getTime()) / 86_400_000)

export function ageBucket(days: number): AgeBucket {
  if (days <= 0) return 'not_due'
  if (days <= 30) return 'd1_30'
  if (days <= 60) return 'd31_60'
  if (days <= 90) return 'd61_90'
  return 'd90_plus'
}
