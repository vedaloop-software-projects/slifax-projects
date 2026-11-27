import { Prisma, type PrismaClient } from '@prisma/client'
import type { Account } from '../auth/contracts.ts'
import { round2 } from './calc.ts'
import { checkAllocations, docNumber, fail, invoiceOutstanding, PurchaseError, type Allocation, type PaymentMode } from './rules.ts'
import { activeSupplier, audit, dateText, isAdmin, ledgerEntry, nextNumber, num, refreshInvoiceStatus, supplierNames, userNames, type Tx } from './shared.ts'
import type { DocFilter } from './receipts-store.ts'

// How each payment mode reads in the ledger: "Payment by bank transfer (UTR…)".
const MODE_WORDS: Record<string, string> = { cash: 'cash', bank: 'bank transfer', upi: 'UPI', cheque: 'cheque', other: 'other means' }

export type PaymentInput = {
  date: Date; supplierId: bigint; mode: PaymentMode; bankAccount: string | null; referenceNo: string | null; chequeDate: Date | null
  amount: number; tdsAmount: number; remarks: string | null; allocations: Allocation[]
}

type LockedInvoice = { id: bigint; supplier_id: bigint; status: string; invoice_number: bigint; net_amount: Prisma.Decimal; paid_amount: Prisma.Decimal; adjusted_amount: Prisma.Decimal }
type LockedSupplier = { id: bigint; opening_balance: Prisma.Decimal; opening_paid: Prisma.Decimal }

const PAID_LIKE = ['posted']

export class PurchasePaymentStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  // Applies allocations inside the caller's transaction. Rows are locked first so two
  // payments can never settle the same invoice (or the opening balance) twice.
  private async allocate(t: Tx, account: Account, paymentId: bigint, supplierId: bigint, date: Date, allocations: Allocation[]) {
    const clientId = account.client.id, now = new Date()
    const invoiceIds = allocations.flatMap(row => row.invoiceId === null ? [] : [row.invoiceId])
    const [supplier] = await t.$queryRaw<LockedSupplier[]>(Prisma.sql`SELECT id, opening_balance, opening_paid FROM suppliers WHERE id = ${supplierId} AND client_id = ${clientId} FOR UPDATE`)
    const invoices = invoiceIds.length ? new Map((await t.$queryRaw<LockedInvoice[]>(Prisma.sql`
      SELECT id, supplier_id, status, invoice_number, net_amount, paid_amount, adjusted_amount FROM purchase_invoices
      WHERE client_id = ${clientId} AND id IN (${Prisma.join(invoiceIds)}) FOR UPDATE`)).map(row => [row.id, row])) : new Map<bigint, LockedInvoice>()
    for (const allocation of allocations) {
      if (allocation.invoiceId === null) {
        const open = round2(num(supplier?.opening_balance) - num(supplier?.opening_paid))
        if (allocation.amount > open + 0.001) fail(`Only ₹${open.toFixed(2)} of the opening balance is still due.`)
        await t.suppliers.update({ where: { id: supplierId }, data: { opening_paid: { increment: allocation.amount }, updated_at: now } })
      } else {
        const invoice = invoices.get(allocation.invoiceId)
        if (!invoice || invoice.supplier_id !== supplierId) fail('An allocated invoice was not found for this supplier.')
        if (['draft', 'cancelled'].includes(invoice!.status)) fail(`${docNumber('PI', invoice!.invoice_number)} is not a posted invoice.`)
        const open = invoiceOutstanding({ net: num(invoice!.net_amount), paid: num(invoice!.paid_amount), adjusted: num(invoice!.adjusted_amount) })
        if (allocation.amount > open + 0.001) fail(`Only ₹${open.toFixed(2)} is still due on ${docNumber('PI', invoice!.invoice_number)}.`)
        await t.purchaseInvoices.update({ where: { id: invoice!.id }, data: { paid_amount: { increment: allocation.amount }, updated_at: now } })
        await refreshInvoiceStatus(t, invoice!.id)
      }
      await t.supplierPaymentAllocations.create({ data: { client_id: clientId, payment_id: paymentId, supplier_id: supplierId, invoice_id: allocation.invoiceId, amount: allocation.amount, allocated_on: date, created_by: account.user.id, created_at: now } })
    }
    const total = round2(allocations.reduce((sum, row) => sum + row.amount, 0))
    if (total) await t.supplierPayments.update({ where: { id: paymentId }, data: { allocated_amount: { increment: total }, updated_at: now } })
    return total
  }

  async save(account: Account, input: PaymentInput) {
    const clientId = account.client.id
    return this.prisma.$transaction(async t => {
      const supplier = await activeSupplier(t, clientId, input.supplierId)
      const settles = round2(input.amount + input.tdsAmount)
      checkAllocations(input.allocations, settles)
      const now = new Date()
      const number = await nextNumber(t, clientId, 'PAY')
      const payment = await t.supplierPayments.create({ data: {
        client_id: clientId, payment_number: number, payment_date: input.date, supplier_id: input.supplierId, payment_mode: input.mode,
        bank_account: input.bankAccount, reference_no: input.referenceNo, cheque_date: input.chequeDate, cheque_status: input.mode === 'cheque' ? 'pending' : 'na',
        amount: input.amount, tds_amount: input.tdsAmount, remarks: input.remarks, status: 'posted',
        created_by: account.user.id, updated_by: account.user.id, created_at: now, updated_at: now,
      } })
      const allocated = await this.allocate(t, account, payment.id, input.supplierId, input.date, input.allocations)
      const label = docNumber('PAY', number)
      const advance = round2(settles - allocated)
      await ledgerEntry(t, account, {
        supplierId: input.supplierId, date: input.date, docType: 'payment', docId: payment.id, docNumber: label,
        particulars: `Payment by ${MODE_WORDS[input.mode] ?? input.mode}${input.referenceNo ? ` (${input.referenceNo})` : ''}${input.tdsAmount ? `, TDS ₹${input.tdsAmount.toFixed(2)}` : ''}${advance > 0 ? `, advance ₹${advance.toFixed(2)}` : ''}`,
        debit: settles,
      })
      await t.audits.create({ data: audit(account, 'add', `Payment ${label} to ${supplier.supplier_name}: ₹${input.amount.toFixed(2)}`, now) })
      return { id: payment.id, number: label, allocated, advance }
    })
  }

  // Uses an earlier payment's unallocated part (an advance) against invoices.
  async allocateAdvance(account: Account, paymentId: bigint, date: Date, allocations: Allocation[]) {
    const clientId = account.client.id
    return this.prisma.$transaction(async t => {
      const [payment] = await t.$queryRaw<Array<{ id: bigint; supplier_id: bigint; status: string; amount: Prisma.Decimal; tds_amount: Prisma.Decimal; allocated_amount: Prisma.Decimal; payment_number: bigint }>>(Prisma.sql`
        SELECT id, supplier_id, status, amount, tds_amount, allocated_amount, payment_number FROM supplier_payments WHERE id = ${paymentId} AND client_id = ${clientId} FOR UPDATE`)
      if (!payment) fail('Payment was not found.', 404)
      if (!PAID_LIKE.includes(payment!.status)) fail('Only a posted payment can be allocated.')
      const free = round2(num(payment!.amount) + num(payment!.tds_amount) - num(payment!.allocated_amount))
      checkAllocations(allocations, free)
      const allocated = await this.allocate(t, account, paymentId, payment!.supplier_id, date, allocations)
      const label = docNumber('PAY', payment!.payment_number)
      await t.audits.create({ data: audit(account, 'edit', `Allocated ₹${allocated.toFixed(2)} of advance ${label}`, new Date()) })
      return { id: paymentId, number: label, allocated, advance: round2(free - allocated) }
    })
  }

  // Cancelling (or a bounced cheque) undoes the allocations and adds the amount back to the payable.
  async reverse(account: Account, paymentId: bigint, reason: string, bounced: boolean) {
    const clientId = account.client.id
    if (!isAdmin(account)) fail(`Only an admin can ${bounced ? 'mark a cheque bounced' : 'cancel a payment'}.`, 403)
    return this.prisma.$transaction(async t => {
      const now = new Date()
      const payment = await t.supplierPayments.findFirst({ where: { id: paymentId, client_id: clientId } })
      if (!payment) fail('Payment was not found.', 404)
      if (bounced && (payment!.payment_mode !== 'cheque' || payment!.cheque_status !== 'pending')) fail('Only a pending cheque can bounce.')
      const claimed = await t.supplierPayments.updateMany({ where: { id: paymentId, client_id: clientId, status: 'posted' }, data: {
        status: 'cancelled', status_reason: reason.slice(0, 255), updated_by: account.user.id, updated_at: now, ...(bounced ? { cheque_status: 'bounced' } : {}),
      } })
      if (!claimed.count) fail('This payment is already cancelled.', 409)
      const allocations = await t.supplierPaymentAllocations.findMany({ where: { payment_id: paymentId, reversed: 0 } })
      await t.$queryRaw(Prisma.sql`SELECT id FROM suppliers WHERE id = ${payment!.supplier_id} FOR UPDATE`)
      for (const allocation of allocations) {
        if (allocation.invoice_id) {
          await t.purchaseInvoices.update({ where: { id: allocation.invoice_id }, data: { paid_amount: { decrement: num(allocation.amount) }, updated_at: now } })
          await refreshInvoiceStatus(t, allocation.invoice_id)
        } else {
          await t.suppliers.update({ where: { id: payment!.supplier_id }, data: { opening_paid: { decrement: num(allocation.amount) }, updated_at: now } })
        }
      }
      await t.supplierPaymentAllocations.updateMany({ where: { payment_id: paymentId }, data: { reversed: 1 } })
      const label = docNumber('PAY', payment!.payment_number)
      await ledgerEntry(t, account, { supplierId: payment!.supplier_id, date: payment!.payment_date, docType: 'payment_cancel', docId: paymentId, docNumber: label, particulars: `${bounced ? 'Cheque bounced' : 'Cancelled'}: ${reason}`, credit: round2(num(payment!.amount) + num(payment!.tds_amount)) })
      await t.audits.create({ data: audit(account, 'delete', `${bounced ? 'Cheque bounced on' : 'Cancelled'} payment ${label}: ${reason}`, now) })
      return { id: paymentId, number: label, status: 'cancelled' }
    })
  }

  async chequeCleared(account: Account, paymentId: bigint) {
    const clientId = account.client.id, now = new Date()
    const result = await this.prisma.supplierPayments.updateMany({ where: { id: paymentId, client_id: clientId, status: 'posted', payment_mode: 'cheque', cheque_status: 'pending' }, data: { cheque_status: 'cleared', updated_by: account.user.id, updated_at: now } })
    if (!result.count) fail('Only a pending cheque can be marked cleared.')
    const payment = await this.prisma.supplierPayments.findFirst({ where: { id: paymentId }, select: { payment_number: true } })
    await this.prisma.audits.create({ data: audit(account, 'edit', `Cheque cleared for payment ${docNumber('PAY', payment!.payment_number)}`, now) })
    return { id: paymentId, chequeStatus: 'cleared' }
  }

  // What a payment to this supplier can settle: the opening balance and open invoices, oldest due first,
  // plus earlier payments that still have an unallocated advance.
  async openItems(clientId: bigint, supplierId: bigint) {
    const supplier = await this.prisma.suppliers.findFirst({ where: { id: supplierId, client_id: clientId, trash: 0 } })
    if (!supplier) throw new PurchaseError(404, 'Supplier was not found.')
    const invoices = await this.prisma.purchaseInvoices.findMany({ where: { client_id: clientId, supplier_id: supplierId, status: { in: ['unpaid', 'partially_paid'] } }, orderBy: [{ due_date: 'asc' }, { id: 'asc' }] })
    const payments = await this.prisma.supplierPayments.findMany({ where: { client_id: clientId, supplier_id: supplierId, status: 'posted' }, orderBy: { id: 'asc' } })
    const openingDue = round2(num(supplier.opening_balance) - num(supplier.opening_paid))
    return {
      supplier: { id: supplier.id, name: supplier.supplier_name, code: supplier.supplier_code },
      items: [
        ...(openingDue > 0 ? [{ invoiceId: null, number: 'Opening balance', supplierInvoiceNo: null, date: null, dueDate: null, amount: num(supplier.opening_balance), adjusted: 0, paid: num(supplier.opening_paid), outstanding: openingDue }] : []),
        ...invoices.map(row => ({
          invoiceId: row.id, number: docNumber('PI', row.invoice_number), supplierInvoiceNo: row.supplier_invoice_no, date: dateText(row.supplier_invoice_date), dueDate: dateText(row.due_date),
          amount: num(row.net_amount), adjusted: num(row.adjusted_amount), paid: num(row.paid_amount),
          outstanding: invoiceOutstanding({ net: num(row.net_amount), paid: num(row.paid_amount), adjusted: num(row.adjusted_amount) }),
        })).filter(row => row.outstanding > 0),
      ],
      advances: payments.map(row => ({ paymentId: row.id, number: docNumber('PAY', row.payment_number), date: dateText(row.payment_date), unallocated: round2(num(row.amount) + num(row.tds_amount) - num(row.allocated_amount)) })).filter(row => row.unallocated > 0),
    }
  }

  async list(clientId: bigint, filter: DocFilter) {
    const size = 50, raw = filter.search.replace(/^PAY-?/i, ''), number = /^\d+$/.test(raw) ? BigInt(raw) : null
    const statusWhere: Prisma.SupplierPaymentsWhereInput = filter.status === 'cheque_pending' ? { status: 'posted', cheque_status: 'pending' } : filter.status ? { status: { in: filter.status.split(',') } } : {}
    const where: Prisma.SupplierPaymentsWhereInput = {
      client_id: clientId, ...statusWhere, ...(filter.supplierId ? { supplier_id: filter.supplierId } : {}),
      ...(filter.from || filter.to ? { payment_date: { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) } } : {}),
      ...(filter.search ? number !== null ? { OR: [{ payment_number: number }, { reference_no: { contains: filter.search } }] } : { reference_no: { contains: filter.search } } : {}),
    }
    const [rows, total] = await Promise.all([this.prisma.supplierPayments.findMany({ where, orderBy: { id: 'desc' }, skip: (filter.page - 1) * size, take: size }), this.prisma.supplierPayments.count({ where })])
    const suppliers = await supplierNames(this.prisma, clientId, rows.map(row => row.supplier_id))
    return {
      rows: rows.map(row => ({
        id: row.id, number: docNumber('PAY', row.payment_number), date: dateText(row.payment_date), supplierId: row.supplier_id, supplierName: suppliers.get(row.supplier_id)?.supplier_name ?? '',
        mode: row.payment_mode, referenceNo: row.reference_no, chequeStatus: row.cheque_status, amount: num(row.amount), tdsAmount: num(row.tds_amount),
        allocated: num(row.allocated_amount), unallocated: round2(num(row.amount) + num(row.tds_amount) - num(row.allocated_amount)), status: row.status,
      })),
      total, page: filter.page, pageSize: size,
    }
  }

  async get(clientId: bigint, id: bigint) {
    const payment = await this.prisma.supplierPayments.findFirst({ where: { id, client_id: clientId } })
    if (!payment) throw new PurchaseError(404, 'Payment was not found.')
    const supplier = await this.prisma.suppliers.findFirst({ where: { id: payment.supplier_id, client_id: clientId } })
    const allocations = await this.prisma.supplierPaymentAllocations.findMany({ where: { payment_id: id }, orderBy: { id: 'asc' } })
    const invoices = await this.prisma.purchaseInvoices.findMany({ where: { id: { in: allocations.flatMap(row => row.invoice_id ? [row.invoice_id] : []) } }, select: { id: true, invoice_number: true, supplier_invoice_no: true, supplier_invoice_date: true } })
    const invoiceMap = new Map(invoices.map(row => [row.id, row]))
    const users = await userNames(this.prisma, clientId, [payment.created_by])
    const settles = round2(num(payment.amount) + num(payment.tds_amount))
    return {
      id: payment.id, number: docNumber('PAY', payment.payment_number), date: dateText(payment.payment_date), status: payment.status, statusReason: payment.status_reason,
      supplier: supplier ? { id: supplier.id, code: supplier.supplier_code, name: supplier.supplier_name, gstin: supplier.gstin, mobile: supplier.mobile, address: supplier.address, city: supplier.city } : null,
      mode: payment.payment_mode, bankAccount: payment.bank_account, referenceNo: payment.reference_no, chequeDate: dateText(payment.cheque_date), chequeStatus: payment.cheque_status,
      amount: num(payment.amount), tdsAmount: num(payment.tds_amount), settles, allocated: num(payment.allocated_amount), unallocated: round2(settles - num(payment.allocated_amount)),
      remarks: payment.remarks, createdBy: users.get(payment.created_by) ?? '', createdAt: payment.created_at,
      allocations: allocations.map(row => {
        const invoice = row.invoice_id ? invoiceMap.get(row.invoice_id) : null
        return { id: row.id, invoiceId: row.invoice_id, number: invoice ? docNumber('PI', invoice.invoice_number) : 'Opening balance', supplierInvoiceNo: invoice?.supplier_invoice_no ?? null, supplierInvoiceDate: dateText(invoice?.supplier_invoice_date), amount: num(row.amount), allocatedOn: dateText(row.allocated_on), reversed: row.reversed === 1 }
      }),
    }
  }
}
