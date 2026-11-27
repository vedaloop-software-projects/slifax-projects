import type { PrismaClient } from '@prisma/client'
import { businessCalendarDay } from '../system/business-time.ts'
import { round2, round3 } from './calc.ts'
import { docNumber, invoiceOutstanding, pendingQty } from './rules.ts'
import { dateText, monthName, netSalesByVariant, num, supplierNames, variantInfo, type VariantInfo } from './shared.ts'

export type ColumnType = 'text' | 'money' | 'qty' | 'percent' | 'date' | 'status'
export type ReportColumn = { key: string; title: string; type?: ColumnType; total?: boolean }
export type ReportFilter = { from: Date; to: Date; supplierId: bigint | null; status: string | null; categoryId: bigint | null; brandId: bigint | null }
type Row = Record<string, string | number | null>
type Result = { columns: ReportColumn[]; rows: Row[]; note?: string }

// The catalogue the app shows. `filters` lists which filters apply to each report.
export const REPORTS = [
  { key: 'purchase_register', group: 'Registers', title: 'Purchase Register', description: 'Posted purchase invoices with GST, payments and what is still due.', filters: ['dates', 'supplier', 'status'] },
  { key: 'po_register', group: 'Registers', title: 'Purchase Order Register', description: 'Purchase orders and their status.', filters: ['dates', 'supplier', 'status'] },
  { key: 'grn_register', group: 'Registers', title: 'GRN Register', description: 'Goods receipts with quantities and value.', filters: ['dates', 'supplier', 'status'] },
  { key: 'return_register', group: 'Registers', title: 'Purchase Return Register', description: 'Goods returned to suppliers.', filters: ['dates', 'supplier', 'status'] },
  { key: 'debit_note_register', group: 'Registers', title: 'Debit Note Register', description: 'Debit notes raised on returns.', filters: ['dates', 'supplier', 'status'] },
  { key: 'credit_note_register', group: 'Registers', title: 'Supplier Credit Note Register', description: 'Credit notes received from suppliers.', filters: ['dates', 'supplier', 'status'] },
  { key: 'payment_register', group: 'Registers', title: 'Supplier Payment Register', description: 'Payments by date, supplier and mode.', filters: ['dates', 'supplier', 'status'] },
  { key: 'pending_po', group: 'Pending', title: 'Pending PO Report', description: 'Ordered, received and still-to-come quantities on open POs.', filters: ['supplier', 'product'] },
  { key: 'pending_invoice_grn', group: 'Pending', title: 'Pending Invoice GRN', description: 'Goods received that are not yet invoiced.', filters: ['supplier', 'product'] },
  { key: 'item_wise', group: 'Analysis', title: 'Item-wise Purchase', description: 'Quantity and value purchased per product.', filters: ['dates', 'supplier', 'product'] },
  { key: 'supplier_wise', group: 'Analysis', title: 'Supplier-wise Purchase', description: 'Purchases, returns and payments per supplier.', filters: ['dates', 'supplier'] },
  { key: 'rate_analysis', group: 'Analysis', title: 'Purchase Rate Analysis', description: 'Rates paid per product and supplier: last, lowest, highest, average.', filters: ['dates', 'supplier', 'product'] },
  { key: 'gst', group: 'Analysis', title: 'Purchase GST Report', description: 'Taxable value and GST by rate, less debit and credit notes.', filters: ['dates', 'supplier'] },
  { key: 'auto_po', group: 'Analysis', title: 'Auto PO Suggestion Report', description: 'What Auto PO suggested against what was ordered.', filters: ['dates', 'supplier', 'product'] },
  { key: 'margin', group: 'Analysis', title: 'Purchase Margin Report', description: 'Purchase cost against the selling price per product.', filters: ['dates', 'supplier', 'product'] },
  { key: 'purchase_vs_sales', group: 'Analysis', title: 'Purchase vs Sales', description: 'Quantity received against quantity sold in the same period.', filters: ['dates', 'supplier', 'product'] },
  { key: 'slow_moving', group: 'Analysis', title: 'Slow-moving / Dead Stock after Purchase', description: 'Products received in the period that have sold little or nothing since.', filters: ['dates', 'supplier', 'product'] },
] as const
export type ReportKey = (typeof REPORTS)[number]['key']

const LIMIT = 5000
const POSTED_DN = ['posted', 'sent', 'acknowledged', 'settled']
const statusIn = (status: string | null) => (status ? { status: { in: status.split(',') } } : {})
const daysBetween = (from: Date, to: Date) => Math.max(Math.round((to.getTime() - from.getTime()) / 86_400_000), 0)
const productCells = (info: VariantInfo | undefined) => ({ productCode: info?.productCode ?? '', product: info ? `${info.name} (${info.packSize})` : 'Unknown product' })
const PRODUCT_COLUMNS: ReportColumn[] = [{ key: 'productCode', title: 'Code' }, { key: 'product', title: 'Product' }]

export class PurchaseReportStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  async run(clientId: bigint, key: ReportKey, filter: ReportFilter) {
    const meta = REPORTS.find(report => report.key === key)!
    const result = await this[key](clientId, filter)
    const truncated = result.rows.length > LIMIT
    const rows = result.rows.slice(0, LIMIT)
    const totals: Row = {}
    for (const column of result.columns) if (column.total) totals[column.key] = column.type === 'qty' ? round3(rows.reduce((sum, row) => sum + num(row[column.key] as number), 0)) : round2(rows.reduce((sum, row) => sum + num(row[column.key] as number), 0))
    return { key, title: meta.title, description: meta.description, columns: result.columns, rows, totals, truncated, note: result.note ?? null }
  }

  // Variants allowed by the category / brand filter (null = no product filter).
  private async productScope(clientId: bigint, filter: ReportFilter) {
    if (!filter.categoryId && !filter.brandId) return null
    const products = await this.prisma.products.findMany({ where: { client_id: clientId, ...(filter.categoryId ? { category_id: filter.categoryId } : {}), ...(filter.brandId ? { brand_id: filter.brandId } : {}) }, select: { id: true } })
    return new Set(products.map(row => row.id))
  }
  private inScope = (scope: Set<bigint> | null, productId: bigint) => !scope || scope.has(productId)
  private supplierWhere = (filter: ReportFilter) => (filter.supplierId ? { supplier_id: filter.supplierId } : {})
  private names = (clientId: bigint, ids: bigint[]) => supplierNames(this.prisma, clientId, ids)

  // ---------------------------------------------------------------- registers

  private async purchase_register(clientId: bigint, f: ReportFilter): Promise<Result> {
    const rows = await this.prisma.purchaseInvoices.findMany({ where: { client_id: clientId, invoice_date: { gte: f.from, lte: f.to }, ...this.supplierWhere(f), ...(f.status ? statusIn(f.status) : { status: { not: 'draft' } }) }, orderBy: [{ invoice_date: 'asc' }, { id: 'asc' }], take: LIMIT + 1 })
    const suppliers = await this.names(clientId, rows.map(row => row.supplier_id))
    return {
      columns: [
        { key: 'number', title: 'Invoice no' }, { key: 'date', title: 'Entry date', type: 'date' }, { key: 'supplier', title: 'Supplier' }, { key: 'supplierInvoiceNo', title: 'Supplier bill' },
        { key: 'billDate', title: 'Bill date', type: 'date' }, { key: 'dueDate', title: 'Due date', type: 'date' }, { key: 'taxable', title: 'Taxable', type: 'money', total: true },
        { key: 'cgst', title: 'CGST', type: 'money', total: true }, { key: 'sgst', title: 'SGST', type: 'money', total: true }, { key: 'igst', title: 'IGST', type: 'money', total: true },
        { key: 'net', title: 'Net amount', type: 'money', total: true }, { key: 'adjusted', title: 'Notes', type: 'money', total: true }, { key: 'paid', title: 'Paid', type: 'money', total: true },
        { key: 'outstanding', title: 'Outstanding', type: 'money', total: true }, { key: 'status', title: 'Status', type: 'status' },
      ],
      rows: rows.map(row => {
        const cancelled = row.status === 'cancelled', net = cancelled ? 0 : num(row.net_amount)
        return {
          number: docNumber('PI', row.invoice_number), date: dateText(row.invoice_date), supplier: suppliers.get(row.supplier_id)?.supplier_name ?? '', supplierInvoiceNo: row.supplier_invoice_no,
          billDate: dateText(row.supplier_invoice_date), dueDate: dateText(row.due_date), taxable: cancelled ? 0 : num(row.taxable_amount), cgst: cancelled ? 0 : num(row.cgst_amount),
          sgst: cancelled ? 0 : num(row.sgst_amount), igst: cancelled ? 0 : num(row.igst_amount), net, adjusted: cancelled ? 0 : num(row.adjusted_amount), paid: cancelled ? 0 : num(row.paid_amount),
          outstanding: cancelled ? 0 : invoiceOutstanding({ net, paid: num(row.paid_amount), adjusted: num(row.adjusted_amount) }), status: row.status,
        }
      }),
      note: 'Cancelled invoices are listed with zero amounts.',
    }
  }

  private async po_register(clientId: bigint, f: ReportFilter): Promise<Result> {
    const rows = await this.prisma.purchaseOrders.findMany({ where: { client_id: clientId, po_date: { gte: f.from, lte: f.to }, ...this.supplierWhere(f), ...statusIn(f.status) }, orderBy: [{ po_date: 'asc' }, { id: 'asc' }], take: LIMIT + 1 })
    const suppliers = await this.names(clientId, rows.map(row => row.supplier_id))
    const TYPE: Record<string, string> = { manual: 'Manual', avg_sales: 'Auto · average sales', mbq: 'Auto · min/max', forecast: 'Auto · AI forecast' }
    return {
      columns: [
        { key: 'number', title: 'PO no' }, { key: 'date', title: 'PO date', type: 'date' }, { key: 'supplier', title: 'Supplier' }, { key: 'type', title: 'Type' },
        { key: 'expected', title: 'Expected', type: 'date' }, { key: 'qty', title: 'Qty', type: 'qty', total: true }, { key: 'taxable', title: 'Taxable', type: 'money', total: true },
        { key: 'tax', title: 'GST', type: 'money', total: true }, { key: 'net', title: 'Net amount', type: 'money', total: true }, { key: 'status', title: 'Status', type: 'status' },
      ],
      rows: rows.map(row => ({
        number: docNumber('PO', row.po_number), date: dateText(row.po_date), supplier: suppliers.get(row.supplier_id)?.supplier_name ?? '', type: TYPE[row.po_type] ?? row.po_type,
        expected: dateText(row.expected_date), qty: num(row.total_qty), taxable: num(row.taxable_amount), tax: round2(num(row.cgst_amount) + num(row.sgst_amount) + num(row.igst_amount)), net: num(row.net_amount), status: row.status,
      })),
    }
  }

  private async grn_register(clientId: bigint, f: ReportFilter): Promise<Result> {
    const rows = await this.prisma.grns.findMany({ where: { client_id: clientId, grn_date: { gte: f.from, lte: f.to }, ...this.supplierWhere(f), ...statusIn(f.status) }, orderBy: [{ grn_date: 'asc' }, { id: 'asc' }], take: LIMIT + 1 })
    const suppliers = await this.names(clientId, rows.map(row => row.supplier_id))
    const orders = new Map((await this.prisma.purchaseOrders.findMany({ where: { id: { in: rows.flatMap(row => row.po_id ? [row.po_id] : []) } }, select: { id: true, po_number: true } })).map(row => [row.id, row.po_number]))
    return {
      columns: [
        { key: 'number', title: 'GRN no' }, { key: 'date', title: 'Date', type: 'date' }, { key: 'supplier', title: 'Supplier' }, { key: 'po', title: 'PO' }, { key: 'supplierInvoiceNo', title: 'Supplier bill' },
        { key: 'qty', title: 'Accepted qty', type: 'qty', total: true }, { key: 'free', title: 'Free qty', type: 'qty', total: true }, { key: 'taxable', title: 'Taxable', type: 'money', total: true },
        { key: 'tax', title: 'GST', type: 'money', total: true }, { key: 'total', title: 'Total', type: 'money', total: true }, { key: 'status', title: 'Status', type: 'status' },
      ],
      rows: rows.map(row => ({
        number: docNumber('GRN', row.grn_number), date: dateText(row.grn_date), supplier: suppliers.get(row.supplier_id)?.supplier_name ?? '', po: row.po_id && orders.has(row.po_id) ? docNumber('PO', orders.get(row.po_id)!) : 'Without PO',
        supplierInvoiceNo: row.supplier_invoice_no, qty: num(row.total_qty), free: num(row.free_qty), taxable: num(row.taxable_amount), tax: num(row.tax_amount), total: num(row.total_amount), status: row.status,
      })),
    }
  }

  private async return_register(clientId: bigint, f: ReportFilter): Promise<Result> {
    const rows = await this.prisma.purchaseReturns.findMany({ where: { client_id: clientId, prn_date: { gte: f.from, lte: f.to }, ...this.supplierWhere(f), ...statusIn(f.status) }, orderBy: [{ prn_date: 'asc' }, { id: 'asc' }], take: LIMIT + 1 })
    const suppliers = await this.names(clientId, rows.map(row => row.supplier_id))
    const grns = new Map((await this.prisma.grns.findMany({ where: { id: { in: rows.flatMap(row => row.grn_id ? [row.grn_id] : []) } }, select: { id: true, grn_number: true } })).map(row => [row.id, row.grn_number]))
    return {
      columns: [
        { key: 'number', title: 'PRN no' }, { key: 'date', title: 'Date', type: 'date' }, { key: 'supplier', title: 'Supplier' }, { key: 'grn', title: 'GRN' }, { key: 'reason', title: 'Reason' },
        { key: 'qty', title: 'Qty', type: 'qty', total: true }, { key: 'taxable', title: 'Taxable', type: 'money', total: true }, { key: 'tax', title: 'GST', type: 'money', total: true },
        { key: 'total', title: 'Return value', type: 'money', total: true }, { key: 'debitNote', title: 'Debit note' }, { key: 'status', title: 'Status', type: 'status' },
      ],
      rows: rows.map(row => ({
        number: docNumber('PRN', row.prn_number), date: dateText(row.prn_date), supplier: suppliers.get(row.supplier_id)?.supplier_name ?? '', grn: row.grn_id && grns.has(row.grn_id) ? docNumber('GRN', grns.get(row.grn_id)!) : 'Direct',
        reason: row.return_reason.replaceAll('_', ' '), qty: num(row.total_qty), taxable: num(row.taxable_amount), tax: num(row.tax_amount), total: num(row.total_amount), debitNote: row.debit_note_required ? 'Required' : 'Not required', status: row.status,
      })),
    }
  }

  private async debit_note_register(clientId: bigint, f: ReportFilter): Promise<Result> {
    const rows = await this.prisma.purchaseDebitNotes.findMany({ where: { client_id: clientId, dn_date: { gte: f.from, lte: f.to }, ...this.supplierWhere(f), ...statusIn(f.status) }, orderBy: [{ dn_date: 'asc' }, { id: 'asc' }], take: LIMIT + 1 })
    const suppliers = await this.names(clientId, rows.map(row => row.supplier_id))
    const prns = new Map((await this.prisma.purchaseReturns.findMany({ where: { id: { in: rows.flatMap(row => row.prn_id ? [row.prn_id] : []) } }, select: { id: true, prn_number: true } })).map(row => [row.id, row.prn_number]))
    const invoices = new Map((await this.prisma.purchaseInvoices.findMany({ where: { id: { in: rows.flatMap(row => row.invoice_id ? [row.invoice_id] : []) } }, select: { id: true, invoice_number: true } })).map(row => [row.id, row.invoice_number]))
    return {
      columns: [
        { key: 'number', title: 'DN no' }, { key: 'date', title: 'Date', type: 'date' }, { key: 'supplier', title: 'Supplier' }, { key: 'prn', title: 'Return' }, { key: 'invoice', title: 'Invoice' },
        { key: 'taxable', title: 'Taxable', type: 'money', total: true }, { key: 'cgst', title: 'CGST', type: 'money', total: true }, { key: 'sgst', title: 'SGST', type: 'money', total: true },
        { key: 'igst', title: 'IGST', type: 'money', total: true }, { key: 'total', title: 'Total', type: 'money', total: true }, { key: 'status', title: 'Status', type: 'status' },
      ],
      rows: rows.map(row => ({
        number: docNumber('DN', row.dn_number), date: dateText(row.dn_date), supplier: suppliers.get(row.supplier_id)?.supplier_name ?? '', prn: row.prn_id && prns.has(row.prn_id) ? docNumber('PRN', prns.get(row.prn_id)!) : '',
        invoice: row.invoice_id && invoices.has(row.invoice_id) ? docNumber('PI', invoices.get(row.invoice_id)!) : '', taxable: num(row.taxable_amount), cgst: num(row.cgst_amount), sgst: num(row.sgst_amount),
        igst: num(row.igst_amount), total: num(row.total_amount), status: row.status,
      })),
    }
  }

  private async credit_note_register(clientId: bigint, f: ReportFilter): Promise<Result> {
    const rows = await this.prisma.supplierCreditNotes.findMany({ where: { client_id: clientId, credit_note_date: { gte: f.from, lte: f.to }, ...this.supplierWhere(f), ...statusIn(f.status) }, orderBy: [{ credit_note_date: 'asc' }, { id: 'asc' }], take: LIMIT + 1 })
    const suppliers = await this.names(clientId, rows.map(row => row.supplier_id))
    return {
      columns: [
        { key: 'number', title: 'Entry no' }, { key: 'supplierNoteNo', title: 'Supplier note no' }, { key: 'date', title: 'Date', type: 'date' }, { key: 'supplier', title: 'Supplier' }, { key: 'reason', title: 'Reason' },
        { key: 'taxable', title: 'Taxable', type: 'money', total: true }, { key: 'gst', title: 'GST', type: 'money', total: true }, { key: 'total', title: 'Total', type: 'money', total: true },
        { key: 'adjusts', title: 'Payable' }, { key: 'status', title: 'Status', type: 'status' },
      ],
      rows: rows.map(row => ({
        number: docNumber('SCN', row.entry_number), supplierNoteNo: row.credit_note_no, date: dateText(row.credit_note_date), supplier: suppliers.get(row.supplier_id)?.supplier_name ?? '', reason: row.reason.replaceAll('_', ' '),
        taxable: num(row.taxable_amount), gst: round2(num(row.cgst_amount) + num(row.sgst_amount) + num(row.igst_amount)), total: num(row.total_amount),
        adjusts: row.status !== 'posted' ? '' : row.adjusts_payable ? 'Reduced' : 'Confirms debit note', status: row.status,
      })),
    }
  }

  private async payment_register(clientId: bigint, f: ReportFilter): Promise<Result> {
    const rows = await this.prisma.supplierPayments.findMany({ where: { client_id: clientId, payment_date: { gte: f.from, lte: f.to }, ...this.supplierWhere(f), ...statusIn(f.status) }, orderBy: [{ payment_date: 'asc' }, { id: 'asc' }], take: LIMIT + 1 })
    const suppliers = await this.names(clientId, rows.map(row => row.supplier_id))
    const MODE: Record<string, string> = { cash: 'Cash', bank: 'Bank transfer', upi: 'UPI', cheque: 'Cheque', other: 'Other' }
    return {
      columns: [
        { key: 'number', title: 'Payment no' }, { key: 'date', title: 'Date', type: 'date' }, { key: 'supplier', title: 'Supplier' }, { key: 'mode', title: 'Mode' }, { key: 'reference', title: 'Reference' },
        { key: 'amount', title: 'Amount', type: 'money', total: true }, { key: 'tds', title: 'TDS', type: 'money', total: true }, { key: 'allocated', title: 'Allocated', type: 'money', total: true },
        { key: 'advance', title: 'Advance', type: 'money', total: true }, { key: 'cheque', title: 'Cheque' }, { key: 'status', title: 'Status', type: 'status' },
      ],
      rows: rows.map(row => {
        const live = row.status === 'posted'
        return {
          number: docNumber('PAY', row.payment_number), date: dateText(row.payment_date), supplier: suppliers.get(row.supplier_id)?.supplier_name ?? '', mode: MODE[row.payment_mode] ?? row.payment_mode,
          reference: row.reference_no, amount: live ? num(row.amount) : 0, tds: live ? num(row.tds_amount) : 0, allocated: live ? num(row.allocated_amount) : 0,
          advance: live ? round2(num(row.amount) + num(row.tds_amount) - num(row.allocated_amount)) : 0, cheque: row.payment_mode === 'cheque' ? row.cheque_status : '', status: row.status,
        }
      }),
      note: 'Cancelled payments and bounced cheques are listed with zero amounts.',
    }
  }

  // ---------------------------------------------------------------- pending

  private async pending_po(clientId: bigint, f: ReportFilter): Promise<Result> {
    const orders = await this.prisma.purchaseOrders.findMany({ where: { client_id: clientId, status: { in: ['approved', 'partially_received'] }, ...this.supplierWhere(f) }, take: LIMIT })
    const lines = orders.length ? await this.prisma.purchaseOrderLines.findMany({ where: { client_id: clientId, po_id: { in: orders.map(row => row.id) } }, orderBy: [{ po_id: 'asc' }, { line_num: 'asc' }] }) : []
    const scope = await this.productScope(clientId, f), today = businessCalendarDay()
    const orderMap = new Map(orders.map(row => [row.id, row]))
    const info = await variantInfo(this.prisma, clientId, lines.map(row => row.variant_id), true)
    const suppliers = await this.names(clientId, orders.map(row => row.supplier_id))
    return {
      columns: [
        { key: 'number', title: 'PO no' }, { key: 'date', title: 'PO date', type: 'date' }, { key: 'supplier', title: 'Supplier' }, ...PRODUCT_COLUMNS,
        { key: 'ordered', title: 'Ordered', type: 'qty', total: true }, { key: 'received', title: 'Received', type: 'qty', total: true }, { key: 'pending', title: 'Pending', type: 'qty', total: true },
        { key: 'rate', title: 'Rate', type: 'money' }, { key: 'value', title: 'Pending value', type: 'money', total: true }, { key: 'expected', title: 'Expected', type: 'date' }, { key: 'age', title: 'Days open', type: 'qty' },
      ],
      rows: lines.flatMap(line => {
        const order = orderMap.get(line.po_id)!
        const pending = pendingQty({ ordered: num(line.ordered_qty), received: num(line.received_qty), cancelled: num(line.cancelled_qty) })
        if (pending <= 0 || !this.inScope(scope, line.product_id)) return []
        return [{
          number: docNumber('PO', order.po_number), date: dateText(order.po_date), supplier: suppliers.get(order.supplier_id)?.supplier_name ?? '', ...productCells(info.get(line.variant_id)),
          ordered: num(line.ordered_qty), received: num(line.received_qty), pending, rate: num(line.rate), value: round2(pending * num(line.rate)), expected: dateText(order.expected_date), age: daysBetween(order.po_date, today),
        }]
      }),
    }
  }

  private async pending_invoice_grn(clientId: bigint, f: ReportFilter): Promise<Result> {
    const grns = await this.prisma.grns.findMany({ where: { client_id: clientId, status: 'posted', ...this.supplierWhere(f) }, take: LIMIT })
    const lines = grns.length ? await this.prisma.grnLines.findMany({ where: { client_id: clientId, grn_id: { in: grns.map(row => row.id) } }, orderBy: [{ grn_id: 'asc' }, { line_num: 'asc' }] }) : []
    const scope = await this.productScope(clientId, f), today = businessCalendarDay()
    const grnMap = new Map(grns.map(row => [row.id, row]))
    const info = await variantInfo(this.prisma, clientId, lines.map(row => row.variant_id), true)
    const suppliers = await this.names(clientId, grns.map(row => row.supplier_id))
    return {
      columns: [
        { key: 'number', title: 'GRN no' }, { key: 'date', title: 'GRN date', type: 'date' }, { key: 'supplier', title: 'Supplier' }, { key: 'supplierInvoiceNo', title: 'Supplier bill' }, ...PRODUCT_COLUMNS,
        { key: 'accepted', title: 'Accepted', type: 'qty', total: true }, { key: 'invoiced', title: 'Invoiced', type: 'qty', total: true }, { key: 'pending', title: 'To invoice', type: 'qty', total: true },
        { key: 'rate', title: 'Rate', type: 'money' }, { key: 'value', title: 'Value', type: 'money', total: true }, { key: 'age', title: 'Days since receipt', type: 'qty' },
      ],
      rows: lines.flatMap(line => {
        const grn = grnMap.get(line.grn_id)!, pending = round3(num(line.accepted_qty) - num(line.invoiced_qty))
        if (pending <= 0 || !this.inScope(scope, line.product_id)) return []
        return [{
          number: docNumber('GRN', grn.grn_number), date: dateText(grn.grn_date), supplier: suppliers.get(grn.supplier_id)?.supplier_name ?? '', supplierInvoiceNo: grn.supplier_invoice_no, ...productCells(info.get(line.variant_id)),
          accepted: num(line.accepted_qty), invoiced: num(line.invoiced_qty), pending, rate: num(line.rate), value: round2(pending * num(line.rate) * (1 - num(line.discount_percent) / 100)), age: daysBetween(grn.grn_date, today),
        }]
      }),
    }
  }

  // ---------------------------------------------------------------- analysis

  // Posted invoice lines in the period (cancelled invoices excluded).
  private async invoiceLines(clientId: bigint, f: ReportFilter) {
    const invoices = await this.prisma.purchaseInvoices.findMany({ where: { client_id: clientId, invoice_date: { gte: f.from, lte: f.to }, status: { notIn: ['draft', 'cancelled'] }, ...this.supplierWhere(f) }, select: { id: true, supplier_id: true, invoice_date: true } })
    const lines = invoices.length ? await this.prisma.purchaseInvoiceLines.findMany({ where: { client_id: clientId, invoice_id: { in: invoices.map(row => row.id) } } }) : []
    const scope = await this.productScope(clientId, f)
    const invoiceMap = new Map(invoices.map(row => [row.id, row]))
    return lines.filter(line => this.inScope(scope, line.product_id)).map(line => ({ ...line, supplierId: invoiceMap.get(line.invoice_id)!.supplier_id, date: invoiceMap.get(line.invoice_id)!.invoice_date }))
  }

  private async item_wise(clientId: bigint, f: ReportFilter): Promise<Result> {
    const lines = await this.invoiceLines(clientId, f)
    const groups = new Map<bigint, { qty: number; free: number; taxable: number; gst: number; total: number; bills: Set<bigint> }>()
    for (const line of lines) {
      const g = groups.get(line.variant_id) ?? { qty: 0, free: 0, taxable: 0, gst: 0, total: 0, bills: new Set<bigint>() }
      g.qty += num(line.qty); g.free += num(line.free_qty); g.taxable += num(line.taxable_amount); g.gst += num(line.cgst_amount) + num(line.sgst_amount) + num(line.igst_amount); g.total += num(line.line_amount); g.bills.add(line.invoice_id)
      groups.set(line.variant_id, g)
    }
    const info = await variantInfo(this.prisma, clientId, [...groups.keys()], true)
    return {
      columns: [...PRODUCT_COLUMNS, { key: 'bills', title: 'Invoices', type: 'qty' }, { key: 'qty', title: 'Qty', type: 'qty', total: true }, { key: 'free', title: 'Free', type: 'qty', total: true },
        { key: 'avgRate', title: 'Avg rate', type: 'money' }, { key: 'taxable', title: 'Taxable', type: 'money', total: true }, { key: 'gst', title: 'GST', type: 'money', total: true }, { key: 'total', title: 'Total', type: 'money', total: true }],
      rows: [...groups].map(([variantId, g]) => ({ ...productCells(info.get(variantId)), bills: g.bills.size, qty: round3(g.qty), free: round3(g.free), avgRate: g.qty ? round2(g.taxable / g.qty) : 0, taxable: round2(g.taxable), gst: round2(g.gst), total: round2(g.total) }))
        .sort((a, b) => b.taxable - a.taxable),
    }
  }

  private async supplier_wise(clientId: bigint, f: ReportFilter): Promise<Result> {
    const base = { client_id: clientId, ...this.supplierWhere(f) }
    const [invoices, debitNotes, creditNotes, payments] = await Promise.all([
      this.prisma.purchaseInvoices.groupBy({ by: ['supplier_id'], where: { ...base, invoice_date: { gte: f.from, lte: f.to }, status: { notIn: ['draft', 'cancelled'] } }, _sum: { taxable_amount: true, cgst_amount: true, sgst_amount: true, igst_amount: true, net_amount: true }, _count: true }),
      this.prisma.purchaseDebitNotes.groupBy({ by: ['supplier_id'], where: { ...base, dn_date: { gte: f.from, lte: f.to }, status: { in: POSTED_DN } }, _sum: { total_amount: true } }),
      this.prisma.supplierCreditNotes.groupBy({ by: ['supplier_id'], where: { ...base, credit_note_date: { gte: f.from, lte: f.to }, status: 'posted', adjusts_payable: 1 }, _sum: { total_amount: true } }),
      this.prisma.supplierPayments.groupBy({ by: ['supplier_id'], where: { ...base, payment_date: { gte: f.from, lte: f.to }, status: 'posted' }, _sum: { amount: true, tds_amount: true } }),
    ])
    const ids = [...new Set([...invoices, ...debitNotes, ...creditNotes, ...payments].map(row => row.supplier_id))]
    const suppliers = await this.names(clientId, ids)
    const by = <T extends { supplier_id: bigint }>(rows: T[]) => new Map(rows.map(row => [row.supplier_id, row]))
    const inv = by(invoices), dn = by(debitNotes), cn = by(creditNotes), pay = by(payments)
    return {
      columns: [{ key: 'supplier', title: 'Supplier' }, { key: 'code', title: 'Code' }, { key: 'invoices', title: 'Invoices', type: 'qty', total: true }, { key: 'taxable', title: 'Taxable', type: 'money', total: true },
        { key: 'gst', title: 'GST', type: 'money', total: true }, { key: 'purchases', title: 'Purchases', type: 'money', total: true }, { key: 'returns', title: 'Debit / credit notes', type: 'money', total: true },
        { key: 'net', title: 'Net purchases', type: 'money', total: true }, { key: 'paid', title: 'Paid (incl. TDS)', type: 'money', total: true }],
      rows: ids.map(id => {
        const i = inv.get(id), purchases = num(i?._sum.net_amount), returns = round2(num(dn.get(id)?._sum.total_amount) + num(cn.get(id)?._sum.total_amount))
        return {
          supplier: suppliers.get(id)?.supplier_name ?? '', code: suppliers.get(id)?.supplier_code ?? '', invoices: i?._count ?? 0, taxable: num(i?._sum.taxable_amount),
          gst: round2(num(i?._sum.cgst_amount) + num(i?._sum.sgst_amount) + num(i?._sum.igst_amount)), purchases, returns, net: round2(purchases - returns),
          paid: round2(num(pay.get(id)?._sum.amount) + num(pay.get(id)?._sum.tds_amount)),
        }
      }).sort((a, b) => b.net - a.net),
    }
  }

  private async rate_analysis(clientId: bigint, f: ReportFilter): Promise<Result> {
    const lines = (await this.invoiceLines(clientId, f)).sort((a, b) => a.date.getTime() - b.date.getTime() || Number(a.id - b.id))
    const groups = new Map<string, { variantId: bigint; supplierId: bigint; qty: number; value: number; min: number; max: number; last: number; lastDate: Date }>()
    for (const line of lines) {
      const key = `${line.variant_id}:${line.supplierId}`, rate = num(line.rate)
      const g = groups.get(key) ?? { variantId: line.variant_id, supplierId: line.supplierId, qty: 0, value: 0, min: rate, max: rate, last: rate, lastDate: line.date }
      g.qty += num(line.qty); g.value += num(line.qty) * rate; g.min = Math.min(g.min, rate); g.max = Math.max(g.max, rate); g.last = rate; g.lastDate = line.date
      groups.set(key, g)
    }
    const all = [...groups.values()]
    const cheapest = new Map<bigint, number>()
    for (const g of all) cheapest.set(g.variantId, Math.min(cheapest.get(g.variantId) ?? Infinity, g.last))
    const info = await variantInfo(this.prisma, clientId, all.map(g => g.variantId), true)
    const suppliers = await this.names(clientId, all.map(g => g.supplierId))
    return {
      columns: [...PRODUCT_COLUMNS, { key: 'supplier', title: 'Supplier' }, { key: 'qty', title: 'Qty', type: 'qty', total: true }, { key: 'last', title: 'Last rate', type: 'money' }, { key: 'lastDate', title: 'Last bought', type: 'date' },
        { key: 'min', title: 'Lowest', type: 'money' }, { key: 'max', title: 'Highest', type: 'money' }, { key: 'avg', title: 'Average', type: 'money' }, { key: 'vsBest', title: 'Above best last rate', type: 'percent' }],
      rows: all.map(g => {
        const best = cheapest.get(g.variantId)!
        return {
          ...productCells(info.get(g.variantId)), supplier: suppliers.get(g.supplierId)?.supplier_name ?? '', qty: round3(g.qty), last: g.last, lastDate: dateText(g.lastDate), min: g.min, max: g.max,
          avg: g.qty ? round2(g.value / g.qty) : g.last, vsBest: best > 0 ? round2((g.last - best) / best * 100) : 0,
        }
      }).sort((a, b) => String(a.product).localeCompare(String(b.product)) || a.last - b.last),
      note: '"Above best last rate" compares each supplier\'s last rate with the lowest last rate any supplier charged for the product.',
    }
  }

  private async gst(clientId: bigint, f: ReportFilter): Promise<Result> {
    const lines = await this.invoiceLines(clientId, f)
    type Bucket = { taxable: number; cgst: number; sgst: number; igst: number }
    const add = (map: Map<number, Bucket>, rate: number, b: Bucket) => {
      const g = map.get(rate) ?? { taxable: 0, cgst: 0, sgst: 0, igst: 0 }
      g.taxable += b.taxable; g.cgst += b.cgst; g.sgst += b.sgst; g.igst += b.igst; map.set(rate, g)
    }
    const purchases = new Map<number, Bucket>(), notes = new Map<number, Bucket>()
    for (const line of lines) add(purchases, num(line.tax_percent), { taxable: num(line.taxable_amount), cgst: num(line.cgst_amount), sgst: num(line.sgst_amount), igst: num(line.igst_amount) })
    // Debit notes: rate-wise from their return lines. Supplier credit notes carry one rate each.
    const debitNotes = await this.prisma.purchaseDebitNotes.findMany({ where: { client_id: clientId, dn_date: { gte: f.from, lte: f.to }, status: { in: POSTED_DN }, ...this.supplierWhere(f) } })
    const prnLines = debitNotes.length ? await this.prisma.purchaseReturnLines.findMany({ where: { prn_id: { in: debitNotes.flatMap(row => row.prn_id ? [row.prn_id] : []) } } }) : []
    const interPrn = new Set(debitNotes.filter(row => row.tax_type === 'inter').flatMap(row => row.prn_id ? [row.prn_id] : []))
    for (const line of prnLines) {
      const tax = num(line.tax_amount), inter = interPrn.has(line.prn_id), half = round2(tax / 2)
      add(notes, num(line.tax_percent), { taxable: num(line.taxable_amount), cgst: inter ? 0 : half, sgst: inter ? 0 : round2(tax - half), igst: inter ? tax : 0 })
    }
    const creditNotes = await this.prisma.supplierCreditNotes.findMany({ where: { client_id: clientId, credit_note_date: { gte: f.from, lte: f.to }, status: 'posted', adjusts_payable: 1, ...this.supplierWhere(f) } })
    for (const note of creditNotes) add(notes, num(note.tax_percent), { taxable: num(note.taxable_amount), cgst: num(note.cgst_amount), sgst: num(note.sgst_amount), igst: num(note.igst_amount) })
    const rates = [...new Set([...purchases.keys(), ...notes.keys()])].sort((a, b) => a - b)
    const row = (section: string, rate: number, b: Bucket | undefined, sign: number): Row => ({
      section, rate, taxable: round2(sign * (b?.taxable ?? 0)), cgst: round2(sign * (b?.cgst ?? 0)), sgst: round2(sign * (b?.sgst ?? 0)), igst: round2(sign * (b?.igst ?? 0)),
      gst: round2(sign * ((b?.cgst ?? 0) + (b?.sgst ?? 0) + (b?.igst ?? 0))),
    })
    return {
      columns: [{ key: 'section', title: 'Section' }, { key: 'rate', title: 'GST rate', type: 'percent' }, { key: 'taxable', title: 'Taxable', type: 'money', total: true },
        { key: 'cgst', title: 'CGST', type: 'money', total: true }, { key: 'sgst', title: 'SGST', type: 'money', total: true }, { key: 'igst', title: 'IGST', type: 'money', total: true }, { key: 'gst', title: 'Total GST', type: 'money', total: true }],
      rows: [
        ...rates.filter(rate => purchases.has(rate)).map(rate => row('Purchases', rate, purchases.get(rate), 1)),
        ...rates.filter(rate => notes.has(rate)).map(rate => row('Less: debit / credit notes', rate, notes.get(rate), -1)),
      ],
      note: 'Totals are net input GST for the period. Confirm GST treatment with your accountant before filing.',
    }
  }

  private async auto_po(clientId: bigint, f: ReportFilter): Promise<Result> {
    const orders = await this.prisma.purchaseOrders.findMany({ where: { client_id: clientId, po_date: { gte: f.from, lte: f.to }, po_type: { in: ['avg_sales', 'mbq'] }, ...this.supplierWhere(f) }, take: LIMIT })
    const lines = orders.length ? await this.prisma.purchaseOrderLines.findMany({ where: { client_id: clientId, po_id: { in: orders.map(row => row.id) } }, orderBy: [{ po_id: 'asc' }, { line_num: 'asc' }] }) : []
    const scope = await this.productScope(clientId, f)
    const orderMap = new Map(orders.map(row => [row.id, row]))
    const info = await variantInfo(this.prisma, clientId, lines.map(row => row.variant_id), true)
    const suppliers = await this.names(clientId, orders.map(row => row.supplier_id))
    return {
      columns: [{ key: 'number', title: 'PO no' }, { key: 'date', title: 'Date', type: 'date' }, { key: 'method', title: 'Method' }, { key: 'supplier', title: 'Supplier' }, ...PRODUCT_COLUMNS,
        { key: 'suggested', title: 'Suggested', type: 'qty', total: true }, { key: 'ordered', title: 'Ordered', type: 'qty', total: true }, { key: 'difference', title: 'Changed by', type: 'qty', total: true },
        { key: 'reason', title: 'Reason' }, { key: 'status', title: 'PO status', type: 'status' }],
      rows: lines.filter(line => this.inScope(scope, line.product_id)).map(line => {
        const order = orderMap.get(line.po_id)!, suggested = line.suggested_qty === null ? num(line.ordered_qty) : num(line.suggested_qty)
        return {
          number: docNumber('PO', order.po_number), date: dateText(order.po_date), method: order.po_type === 'mbq' ? 'Min / max' : 'Average sales', supplier: suppliers.get(order.supplier_id)?.supplier_name ?? '',
          ...productCells(info.get(line.variant_id)), suggested, ordered: num(line.ordered_qty), difference: round3(num(line.ordered_qty) - suggested), reason: line.suggestion_reason, status: order.status,
        }
      }),
    }
  }

  private async margin(clientId: bigint, f: ReportFilter): Promise<Result> {
    const lines = await this.invoiceLines(clientId, f)
    const groups = new Map<bigint, { qty: number; value: number; last: number; lastAt: number }>()
    for (const line of lines) {
      const g = groups.get(line.variant_id) ?? { qty: 0, value: 0, last: 0, lastAt: 0 }
      g.qty += num(line.qty) + num(line.free_qty); g.value += num(line.taxable_amount)
      if (line.date.getTime() >= g.lastAt) { g.last = num(line.rate); g.lastAt = line.date.getTime() }
      groups.set(line.variant_id, g)
    }
    const info = await variantInfo(this.prisma, clientId, [...groups.keys()], true)
    return {
      columns: [...PRODUCT_COLUMNS, { key: 'qty', title: 'Qty bought', type: 'qty', total: true }, { key: 'cost', title: 'Avg cost (incl. free)', type: 'money' }, { key: 'last', title: 'Last rate', type: 'money' },
        { key: 'mrp', title: 'MRP', type: 'money' }, { key: 'sale', title: 'Selling price', type: 'money' }, { key: 'saleExGst', title: 'Selling excl. GST', type: 'money' },
        { key: 'margin', title: 'Margin per unit', type: 'money' }, { key: 'marginPct', title: 'Margin %', type: 'percent' }],
      rows: [...groups].map(([variantId, g]) => {
        const p = info.get(variantId), cost = g.qty ? round2(g.value / g.qty) : g.last
        const saleExGst = p ? round2(p.salePrice / (1 + p.taxPercent / 100)) : 0
        return {
          ...productCells(p), qty: round3(g.qty), cost, last: g.last, mrp: p?.mrp ?? 0, sale: p?.salePrice ?? 0, saleExGst,
          margin: round2(saleExGst - cost), marginPct: saleExGst > 0 ? round2((saleExGst - cost) / saleExGst * 100) : 0,
        }
      }).sort((a, b) => a.marginPct - b.marginPct),
      note: 'Selling price is taken as GST-inclusive and compared with the purchase cost before GST. Free goods lower the average cost.',
    }
  }

  // GRN quantities (accepted + free) received in the period, per variant.
  private async received(clientId: bigint, f: ReportFilter) {
    const grns = await this.prisma.grns.findMany({ where: { client_id: clientId, status: 'posted', grn_date: { gte: f.from, lte: f.to }, ...this.supplierWhere(f) }, select: { id: true, grn_date: true } })
    const lines = grns.length ? await this.prisma.grnLines.findMany({ where: { client_id: clientId, grn_id: { in: grns.map(row => row.id) } } }) : []
    const scope = await this.productScope(clientId, f)
    const dates = new Map(grns.map(row => [row.id, row.grn_date]))
    const map = new Map<bigint, { qty: number; value: number; first: Date; last: Date }>()
    for (const line of lines) {
      if (!this.inScope(scope, line.product_id)) continue
      const date = dates.get(line.grn_id)!, g = map.get(line.variant_id) ?? { qty: 0, value: 0, first: date, last: date }
      g.qty += num(line.accepted_qty) + num(line.free_qty); g.value += num(line.taxable_amount)
      if (date < g.first) g.first = date
      if (date > g.last) g.last = date
      map.set(line.variant_id, g)
    }
    return map
  }

  private async purchase_vs_sales(clientId: bigint, f: ReportFilter): Promise<Result> {
    const received = await this.received(clientId, f)
    const ids = [...received.keys()]
    const [sold, info] = await Promise.all([netSalesByVariant(this.prisma, clientId, f.from, f.to, ids), variantInfo(this.prisma, clientId, ids, true)])
    return {
      columns: [...PRODUCT_COLUMNS, { key: 'received', title: 'Received', type: 'qty', total: true }, { key: 'value', title: 'Purchase value', type: 'money', total: true },
        { key: 'sold', title: 'Sold', type: 'qty', total: true }, { key: 'sellThrough', title: 'Sold / received', type: 'percent' }, { key: 'stock', title: 'Stock now', type: 'qty', total: true }],
      rows: ids.map(id => {
        const r = received.get(id)!, s = round3(sold.get(id) ?? 0)
        return { ...productCells(info.get(id)), received: round3(r.qty), value: round2(r.value), sold: s, sellThrough: r.qty > 0 ? round2(s / r.qty * 100) : 0, stock: round3(info.get(id)?.stock ?? 0) }
      }).sort((a, b) => a.sellThrough - b.sellThrough),
      note: 'Received = accepted + free quantity on posted GRNs. Sold = sales less refunds in the same period.',
    }
  }

  private async slow_moving(clientId: bigint, f: ReportFilter): Promise<Result> {
    const received = await this.received(clientId, f)
    const ids = [...received.keys()], today = businessCalendarDay()
    const info = await variantInfo(this.prisma, clientId, ids, true)
    // Sales from the first receipt in the period up to today.
    const sold = new Map<bigint, number>()
    const byFirst = new Map<number, bigint[]>()
    for (const id of ids) { const t = received.get(id)!.first.getTime(); byFirst.set(t, [...(byFirst.get(t) ?? []), id]) }
    for (const [time, group] of byFirst) for (const [id, qty] of await netSalesByVariant(this.prisma, clientId, new Date(time), today, group)) sold.set(id, qty)
    return {
      columns: [...PRODUCT_COLUMNS, { key: 'lastReceived', title: 'Last received', type: 'date' }, { key: 'days', title: 'Days since', type: 'qty' }, { key: 'received', title: 'Received', type: 'qty', total: true },
        { key: 'sold', title: 'Sold since', type: 'qty', total: true }, { key: 'sellThrough', title: 'Sold / received', type: 'percent' }, { key: 'stock', title: 'Stock now', type: 'qty', total: true },
        { key: 'stockValue', title: 'Stock value (cost)', type: 'money', total: true }, { key: 'status', title: 'Movement', type: 'status' }],
      rows: ids.flatMap(id => {
        const r = received.get(id)!, s = round3(sold.get(id) ?? 0), through = r.qty > 0 ? s / r.qty * 100 : 0
        if (through >= 50) return []
        const p = info.get(id), cost = r.qty > 0 ? r.value / r.qty : p?.costPrice ?? 0
        return [{
          ...productCells(p), lastReceived: dateText(r.last), days: daysBetween(r.last, today), received: round3(r.qty), sold: s, sellThrough: round2(through), stock: round3(p?.stock ?? 0),
          stockValue: round2(Math.max(p?.stock ?? 0, 0) * cost), status: s <= 0 ? 'dead' : 'slow',
        }]
      }).sort((a, b) => a.sellThrough - b.sellThrough || b.days - a.days),
      note: 'Dead = nothing sold since it was received. Slow = less than half of what was received has sold.',
    }
  }

  // ---------------------------------------------------------------- analytics (charts)
  // Purchase orders, suppliers and supplier bills in the period; the trend covers the 12 calendar
  // months up to `to`. All dates are store calendar days.
  async analytics(clientId: bigint, from: Date, to: Date) {
    const LIVE = { notIn: ['draft', 'cancelled'] }
    const period = { gte: from, lte: to }
    const months = Array.from({ length: 12 }, (_v, i) => new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 11 + i, 1)))
    const monthKey = (date: Date) => `${date.getUTCFullYear()}-${date.getUTCMonth()}`
    const trend = { gte: months[0]!, lte: to }
    const [poByStatus, poBySupplier, livePos, invoices, paymentsByMode, paymentsBySupplier, trendOrders, trendInvoices, trendPayments, supplierMix] = await Promise.all([
      this.prisma.purchaseOrders.groupBy({ by: ['status'], where: { client_id: clientId, po_date: period }, _count: true, _sum: { net_amount: true } }),
      this.prisma.purchaseOrders.groupBy({ by: ['supplier_id'], where: { client_id: clientId, po_date: period, status: LIVE }, _count: true, _sum: { net_amount: true } }),
      this.prisma.purchaseOrders.findMany({ where: { client_id: clientId, po_date: period, status: LIVE }, select: { id: true }, take: 20_000 }),
      this.prisma.purchaseInvoices.findMany({ where: { client_id: clientId, invoice_date: period, status: LIVE }, select: { supplier_id: true, net_amount: true, paid_amount: true, adjusted_amount: true, status: true, due_date: true }, take: 20_000 }),
      this.prisma.supplierPayments.groupBy({ by: ['payment_mode'], where: { client_id: clientId, payment_date: period, status: 'posted' }, _count: true, _sum: { amount: true } }),
      this.prisma.supplierPayments.groupBy({ by: ['supplier_id'], where: { client_id: clientId, payment_date: period, status: 'posted' }, _sum: { amount: true } }),
      this.prisma.purchaseOrders.findMany({ where: { client_id: clientId, po_date: trend, status: LIVE }, select: { po_date: true, net_amount: true } }),
      this.prisma.purchaseInvoices.findMany({ where: { client_id: clientId, invoice_date: trend, status: LIVE }, select: { invoice_date: true, net_amount: true } }),
      this.prisma.supplierPayments.findMany({ where: { client_id: clientId, payment_date: trend, status: 'posted' }, select: { payment_date: true, amount: true } }),
      this.prisma.suppliers.groupBy({ by: ['gst_registration', 'status'], where: { client_id: clientId, trash: 0 }, _count: true }),
    ])

    // Order lines of the live POs: category split and how much of what was ordered has arrived.
    const lines = livePos.length ? await this.prisma.purchaseOrderLines.findMany({ where: { client_id: clientId, po_id: { in: livePos.map(row => row.id) } }, select: { product_id: true, line_amount: true, ordered_qty: true, received_qty: true, cancelled_qty: true } }) : []
    const products = lines.length ? await this.prisma.products.findMany({ where: { client_id: clientId, id: { in: [...new Set(lines.map(row => row.product_id))] } }, select: { id: true, category_id: true } }) : []
    const categoryOf = new Map(products.map(row => [row.id, row.category_id]))
    const categories = products.length ? await this.prisma.categories.findMany({ where: { client_id: clientId, id: { in: [...new Set(products.map(row => row.category_id))] } }, select: { id: true, category_name: true } }) : []
    const categoryName = new Map(categories.map(row => [row.id, row.category_name]))
    const byCategory = new Map<string, number>()
    const fulfilment = { received: 0, pending: 0, shortClosed: 0 }
    for (const line of lines) {
      const id = categoryOf.get(line.product_id), name = (id !== undefined && categoryName.get(id)) || 'Uncategorised'
      byCategory.set(name, (byCategory.get(name) ?? 0) + num(line.line_amount))
      const ordered = num(line.ordered_qty), received = num(line.received_qty), cancelled = num(line.cancelled_qty)
      fulfilment.received += Math.min(received, ordered)
      fulfilment.shortClosed += cancelled
      fulfilment.pending += pendingQty({ ordered, received, cancelled })
    }

    // Supplier bills raised in the period: settled, still due, overdue (as of `to`).
    const bills = { paid: 0, due: 0, overdue: 0, count: invoices.length, paidCount: 0, partCount: 0, unpaidCount: 0, overdueCount: 0 }
    const invoicedBySupplier = new Map<bigint, number>()
    for (const row of invoices) {
      const net = num(row.net_amount), left = invoiceOutstanding({ net, paid: num(row.paid_amount), adjusted: num(row.adjusted_amount) })
      invoicedBySupplier.set(row.supplier_id, (invoicedBySupplier.get(row.supplier_id) ?? 0) + net)
      bills.paid += net - left
      if (left > 0 && row.due_date < to) { bills.overdue += left; bills.overdueCount++ } else bills.due += left
      if (row.status === 'paid') bills.paidCount++; else if (row.status === 'partially_paid') bills.partCount++; else bills.unpaidCount++
    }

    const ordered = round2(poBySupplier.reduce((sum, row) => sum + num(row._sum.net_amount), 0))
    const orderCount = poBySupplier.reduce((sum, row) => sum + row._count, 0)
    const paidBySupplier = new Map(paymentsBySupplier.map(row => [row.supplier_id, num(row._sum.amount)]))
    const ranked = [...poBySupplier].sort((a, b) => num(b._sum.net_amount) - num(a._sum.net_amount))
    const names = await this.names(clientId, ranked.slice(0, 10).map(row => row.supplier_id))
    const supplierName = (id: bigint) => names.get(id)?.supplier_name ?? 'Unknown supplier'
    const topShare = ranked.slice(0, 5).map(row => ({ name: supplierName(row.supplier_id), amount: round2(num(row._sum.net_amount)) }))
    const others = round2(ordered - topShare.reduce((sum, row) => sum + row.amount, 0))
    const sumByMonth = <T>(rows: T[], date: (row: T) => Date, value: (row: T) => number) => {
      const map = new Map<string, number>()
      for (const row of rows) map.set(monthKey(date(row)), (map.get(monthKey(date(row))) ?? 0) + value(row))
      return map
    }
    const orderedByMonth = sumByMonth(trendOrders, row => row.po_date, row => num(row.net_amount))
    const invoicedByMonth = sumByMonth(trendInvoices, row => row.invoice_date, row => num(row.net_amount))
    const paidByMonth = sumByMonth(trendPayments, row => row.payment_date, row => num(row.amount))
    const categoryRows = [...byCategory].map(([name, amount]) => ({ name, amount: round2(amount) })).sort((a, b) => b.amount - a.amount)
    const activeSuppliers = supplierMix.filter(row => row.status === 1).reduce((sum, row) => sum + row._count, 0)
    const mix = new Map<string, number>()
    for (const row of supplierMix) if (row.status === 1) mix.set(row.gst_registration, (mix.get(row.gst_registration) ?? 0) + row._count)

    return {
      from: dateText(from), to: dateText(to),
      kpis: {
        ordered, orderCount, averageOrder: orderCount ? round2(ordered / orderCount) : 0, suppliersOrdered: poBySupplier.length, activeSuppliers,
        invoiced: round2(invoices.reduce((sum, row) => sum + num(row.net_amount), 0)), invoiceCount: invoices.length,
        paid: round2(paymentsByMode.reduce((sum, row) => sum + num(row._sum.amount), 0)),
      },
      poStatus: poByStatus.map(row => ({ status: row.status, count: row._count, amount: round2(num(row._sum.net_amount)) })).sort((a, b) => b.count - a.count),
      supplierShare: others > 0.005 ? [...topShare, { name: 'Others', amount: others }] : topShare,
      topSuppliers: ranked.slice(0, 10).map(row => ({
        supplierId: row.supplier_id, name: supplierName(row.supplier_id), orders: row._count, ordered: round2(num(row._sum.net_amount)),
        invoiced: round2(invoicedBySupplier.get(row.supplier_id) ?? 0), paid: round2(paidBySupplier.get(row.supplier_id) ?? 0),
      })),
      categoryShare: categoryRows.length > 6 ? [...categoryRows.slice(0, 5), { name: 'Others', amount: round2(categoryRows.slice(5).reduce((sum, row) => sum + row.amount, 0)) }] : categoryRows,
      fulfilment: { received: round3(fulfilment.received), pending: round3(fulfilment.pending), shortClosed: round3(fulfilment.shortClosed) },
      bills: { ...bills, paid: round2(bills.paid), due: round2(bills.due), overdue: round2(bills.overdue) },
      paymentModes: paymentsByMode.map(row => ({ mode: row.payment_mode, count: row._count, amount: round2(num(row._sum.amount)) })).sort((a, b) => b.amount - a.amount),
      supplierMix: [...mix].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
      trend: months.map(date => ({
        month: monthName(date), year: date.getUTCFullYear(),
        ordered: round2(orderedByMonth.get(monthKey(date)) ?? 0), invoiced: round2(invoicedByMonth.get(monthKey(date)) ?? 0), paid: round2(paidByMonth.get(monthKey(date)) ?? 0),
      })),
    }
  }
}

export const isReportKey = (value: string): value is ReportKey => REPORTS.some(report => report.key === value)
export const reportCatalogue = () => REPORTS.map(({ key, group, title, description, filters }) => ({ key, group, title, description, filters: [...filters] }))
