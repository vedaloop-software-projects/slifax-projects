import { Prisma, type PrismaClient } from '@prisma/client'
import { round2 } from './calc.ts'
import { ageBucket, AGE_BUCKETS, docNumber, overdueDays, type AgeBucket } from './rules.ts'
import { dateText, num } from './shared.ts'

export type OutstandingFilter = { asOn: Date; supplierId: bigint | null; dueFrom: Date | null; dueTo: Date | null; overdueOnly: boolean; search: string }

type Buckets = Record<AgeBucket, number>
const emptyBuckets = (): Buckets => ({ not_due: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 })
const POSTED_DN = ['posted', 'sent', 'acknowledged', 'settled']
const sumBy = <T>(rows: T[], key: (row: T) => bigint | null, value: (row: T) => number) => {
  const map = new Map<bigint, number>()
  for (const row of rows) { const id = key(row); if (id !== null) map.set(id, round2((map.get(id) ?? 0) + value(row))) }
  return map
}

// Supplier balances and open invoices as they stood on a date (store calendar).
// Ledger-based, so the supplier balance always matches the ledger; the part of it not tied
// to an invoice (advances, notes without an invoice) is shown as "unallocated".
export class PurchaseAccountsStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  async outstanding(clientId: bigint, filter: OutstandingFilter) {
    const asOn = filter.asOn
    const supplierWhere: Prisma.SuppliersWhereInput = {
      client_id: clientId, trash: 0, ...(filter.supplierId ? { id: filter.supplierId } : {}),
      ...(filter.search ? { OR: [{ supplier_name: { contains: filter.search } }, { supplier_code: { contains: filter.search } }, { mobile: { contains: filter.search } }] } : {}),
    }
    const suppliers = await this.prisma.suppliers.findMany({ where: supplierWhere, orderBy: { supplier_name: 'asc' } })
    const ids = suppliers.map(row => row.id)
    if (!ids.length) return this.empty(asOn)

    const [ledger, invoices, openingPaid] = await Promise.all([
      this.prisma.supplierLedger.groupBy({ by: ['supplier_id'], where: { client_id: clientId, supplier_id: { in: ids }, entry_date: { lte: asOn } }, _sum: { credit: true, debit: true } }),
      this.prisma.purchaseInvoices.findMany({ where: { client_id: clientId, supplier_id: { in: ids }, status: { notIn: ['draft', 'cancelled'] }, invoice_date: { lte: asOn } }, orderBy: [{ due_date: 'asc' }, { id: 'asc' }], take: 20_000 }),
      this.prisma.supplierPaymentAllocations.groupBy({ by: ['supplier_id'], where: { client_id: clientId, supplier_id: { in: ids }, invoice_id: null, reversed: 0, allocated_on: { lte: asOn } }, _sum: { amount: true } }),
    ])
    const invoiceIds = invoices.map(row => row.id)
    const [paidRows, debitNotes, creditNotes] = invoiceIds.length ? await Promise.all([
      this.prisma.supplierPaymentAllocations.groupBy({ by: ['invoice_id'], where: { client_id: clientId, invoice_id: { in: invoiceIds }, reversed: 0, allocated_on: { lte: asOn } }, _sum: { amount: true } }),
      this.prisma.purchaseDebitNotes.groupBy({ by: ['invoice_id'], where: { client_id: clientId, invoice_id: { in: invoiceIds }, status: { in: POSTED_DN }, dn_date: { lte: asOn } }, _sum: { total_amount: true } }),
      this.prisma.supplierCreditNotes.groupBy({ by: ['invoice_id'], where: { client_id: clientId, invoice_id: { in: invoiceIds }, status: 'posted', adjusts_payable: 1, credit_note_date: { lte: asOn } }, _sum: { total_amount: true } }),
    ]) : [[], [], []]
    const paid = sumBy(paidRows, row => row.invoice_id, row => num(row._sum.amount))
    const adjusted = sumBy([...debitNotes, ...creditNotes], row => row.invoice_id, row => num(row._sum.total_amount))
    const ledgerMap = new Map(ledger.map(row => [row.supplier_id, round2(num(row._sum.credit) - num(row._sum.debit))]))
    const openingPaidMap = new Map(openingPaid.map(row => [row.supplier_id, num(row._sum.amount)]))
    const supplierMap = new Map(suppliers.map(row => [row.id, row]))
    const inDueRange = (due: Date) => (!filter.dueFrom || due >= filter.dueFrom) && (!filter.dueTo || due <= filter.dueTo)

    const invoiceRows = invoices.flatMap(row => {
      const amount = num(row.net_amount), adj = adjusted.get(row.id) ?? 0, pay = paid.get(row.id) ?? 0
      const outstanding = round2(Math.max(amount - adj - pay, 0))
      if (outstanding <= 0) return []
      const days = overdueDays(row.due_date, asOn), bucket = ageBucket(days)
      const supplier = supplierMap.get(row.supplier_id)!
      return [{
        invoiceId: row.id, number: docNumber('PI', row.invoice_number), supplierId: row.supplier_id, supplierName: supplier.supplier_name, supplierCode: supplier.supplier_code,
        supplierInvoiceNo: row.supplier_invoice_no, invoiceDate: dateText(row.supplier_invoice_date), dueDate: dateText(row.due_date), dueAt: row.due_date,
        amount, adjusted: adj, paid: pay, outstanding, overdueDays: Math.max(days, 0), bucket,
      }]
    })

    const summary = suppliers.map(supplier => {
      const opening = round2(Math.max(num(supplier.opening_balance) - (openingPaidMap.get(supplier.id) ?? 0), 0))
      const balance = round2(num(supplier.opening_balance) + (ledgerMap.get(supplier.id) ?? 0))
      const mine = invoiceRows.filter(row => row.supplierId === supplier.id)
      const buckets = emptyBuckets()
      for (const row of mine) buckets[row.bucket] = round2(buckets[row.bucket] + row.outstanding)
      const invoicesTotal = round2(mine.reduce((sum, row) => sum + row.outstanding, 0))
      const overdue = round2(invoicesTotal - buckets.not_due)
      return {
        supplierId: supplier.id, name: supplier.supplier_name, code: supplier.supplier_code, mobile: supplier.mobile, creditDays: supplier.credit_days,
        opening, ...buckets, invoices: invoicesTotal, overdue, unallocated: round2(balance - opening - invoicesTotal), balance,
        oldestDue: mine.length ? dateText(mine[0]!.dueAt) : null, maxOverdueDays: mine.reduce((max, row) => Math.max(max, row.overdueDays), 0), invoiceCount: mine.length,
      }
    })

    // Filters on due dates / overdue narrow the invoice list and suppliers shown, not the balances.
    const shownInvoices = invoiceRows.filter(row => inDueRange(row.dueAt) && (!filter.overdueOnly || row.overdueDays > 0))
    const narrowed = !!(filter.dueFrom || filter.dueTo || filter.overdueOnly)
    const shownSuppliers = summary.filter(row => narrowed ? shownInvoices.some(invoice => invoice.supplierId === row.supplierId) || (filter.overdueOnly && !filter.dueFrom && !filter.dueTo && row.opening > 0) : row.balance !== 0 || row.opening !== 0 || row.invoiceCount > 0)
      .sort((a, b) => b.balance - a.balance)
    const totals = { opening: 0, ...emptyBuckets(), invoices: 0, overdue: 0, unallocated: 0, balance: 0 }
    for (const row of shownSuppliers) for (const key of Object.keys(totals) as (keyof typeof totals)[]) totals[key] = round2(totals[key] + row[key])
    return {
      asOn: dateText(asOn), buckets: AGE_BUCKETS, totals, suppliers: shownSuppliers,
      invoices: shownInvoices.slice(0, 2000).map(({ dueAt: _dueAt, ...row }) => row), truncated: shownInvoices.length > 2000,
    }
  }

  // Supplier ledger (statement of account) for a date range. Credit = billed (you owe more),
  // debit = paid or reduced by a note. Balance > 0 = you owe the supplier, < 0 = advance.
  async ledger(clientId: bigint, supplierId: bigint, from: Date, to: Date) {
    const supplier = await this.prisma.suppliers.findFirst({ where: { id: supplierId, client_id: clientId, trash: 0 } })
    if (!supplier) return null
    // A cancelled document and its reversal are left out of the opening balance and the list.
    const reversals = await this.prisma.supplierLedger.findMany({ where: { client_id: clientId, supplier_id: supplierId, doc_type: { endsWith: '_cancel' } }, select: { doc_type: true, doc_id: true } })
    const cancelled = new Map<string, bigint[]>()
    for (const row of reversals) {
      const type = row.doc_type.slice(0, -'_cancel'.length)
      cancelled.set(type, [...(cancelled.get(type) ?? []), row.doc_id])
    }
    const live = { client_id: clientId, supplier_id: supplierId, NOT: [...cancelled].map(([type, ids]) => ({ doc_type: { in: [type, `${type}_cancel`] }, doc_id: { in: ids } })) }
    const before = await this.prisma.supplierLedger.aggregate({ where: { ...live, entry_date: { lt: from } }, _sum: { credit: true, debit: true } })
    const opening = round2(num(supplier.opening_balance) + num(before._sum.credit) - num(before._sum.debit))
    const rows = await this.prisma.supplierLedger.findMany({ where: { ...live, entry_date: { gte: from, lte: to } }, orderBy: [{ entry_date: 'asc' }, { id: 'asc' }], take: 5001 })
    let balance = opening, totalDebit = 0, totalCredit = 0
    const entries = rows.slice(0, 5000).map(row => {
      const debit = num(row.debit), credit = num(row.credit)
      balance = round2(balance + credit - debit); totalDebit = round2(totalDebit + debit); totalCredit = round2(totalCredit + credit)
      return { id: row.id, date: dateText(row.entry_date), docType: row.doc_type, docId: row.doc_id, docNumber: row.doc_number, particulars: row.particulars, debit, credit, balance, recordedAt: row.created_at }
    })
    return {
      supplier: { id: supplier.id, code: supplier.supplier_code, name: supplier.supplier_name, mobile: supplier.mobile, gstin: supplier.gstin, address: supplier.address, city: supplier.city, creditDays: supplier.credit_days },
      from: dateText(from), to: dateText(to), opening, entries, totals: { debit: totalDebit, credit: totalCredit }, closing: balance, truncated: rows.length > 5000,
    }
  }

  private empty(asOn: Date) {
    return { asOn: dateText(asOn), buckets: AGE_BUCKETS, totals: { opening: 0, ...emptyBuckets(), invoices: 0, overdue: 0, unallocated: 0, balance: 0 }, suppliers: [], invoices: [], truncated: false }
  }
}
