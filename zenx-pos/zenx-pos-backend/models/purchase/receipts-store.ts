import { Prisma, type PrismaClient } from '@prisma/client'
import type { Account } from '../auth/contracts.ts'
import { documentTotals, invoiceValues, lineValues, round2, round3, type HeaderDiscount } from './calc.ts'
import { checkReceipt, docNumber, dueDate, fail, grnQuantities, invoiceableQty, pendingQty, poStatusAfterReceipt, PurchaseError, rejectedReturnableQty, RECEIVABLE_PO_STATUSES, returnableQty, type PoStatus } from './rules.ts'
import { activeSupplier, audit, claimStatus, dateText, isAdmin, ledgerEntry, moveStock, nextNumber, num, requireVariants, supplierNames, taxTypeForSupplier, userNames, variantInfo, variantView, type Tx } from './shared.ts'

export type GrnLineInput = {
  poLineId: bigint | null; variantId: bigint; receivedQty: number; rejectedQty: number; rejectionReason: string | null; freeQty: number
  rate: number; mrp: number; discountPercent: number; discountAmount: number; batchNo: string | null; expiryDate: Date | null
}
export type GrnInput = {
  date: Date; poId: bigint | null; supplierId: bigint; invoiceAvailable: boolean; supplierInvoiceNo: string | null; supplierInvoiceDate: Date | null
  vehicleNo: string | null; remarks: string | null; creditNoteExpected: boolean; excessReason: string | null; lines: GrnLineInput[]
}
export type InvoiceLineInput = { grnLineId: bigint; qty: number; rate: number; discountPercent: number; discountAmount: number }
export type InvoiceInput = {
  date: Date; grnId: bigint; supplierInvoiceNo: string; supplierInvoiceDate: Date; creditDays: number | null; overall: HeaderDiscount; scheme: HeaderDiscount
  roundOff: number | null; varianceReason: string | null; remarks: string | null; lines: InvoiceLineInput[]
}
export type DocFilter = { status: string | null; supplierId: bigint | null; from: Date | null; to: Date | null; search: string; page: number }

type LockedPoLine = { id: bigint; variant_id: bigint; ordered_qty: Prisma.Decimal; received_qty: Prisma.Decimal; cancelled_qty: Prisma.Decimal }
type LockedGrnLine = { id: bigint; accepted_qty: Prisma.Decimal; invoiced_qty: Prisma.Decimal; returned_qty: Prisma.Decimal; rejected_returned_qty: Prisma.Decimal }

const searchNumber = (search: string, prefix: string) => { const raw = search.replace(new RegExp(`^${prefix}-?`, 'i'), ''); return /^\d+$/.test(raw) ? BigInt(raw) : null }

export class PurchaseReceiptStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  // ------------------------------------------------------------------ GRN

  async saveGrn(account: Account, id: bigint | null, input: GrnInput, post: boolean) {
    const clientId = account.client.id
    if (!input.poId && !isAdmin(account)) fail('A GRN without a purchase order needs an admin.', 403)
    const result = await this.prisma.$transaction(async t => {
      const supplier = await activeSupplier(t, clientId, input.supplierId)
      const info = await variantInfo(t, clientId, input.lines.map(line => line.variantId))
      requireVariants(info, input.lines.map(line => line.variantId))
      let taxType = await taxTypeForSupplier(t, clientId, supplier.state_id)
      let poLines = new Map<bigint, Prisma.PurchaseOrderLinesGetPayload<object>>()
      if (input.poId) {
        const order = await t.purchaseOrders.findFirst({ where: { id: input.poId, client_id: clientId } })
        if (!order) fail('Purchase order was not found.', 404)
        if (order!.supplier_id !== input.supplierId) fail('The GRN supplier must be the purchase order supplier.')
        if (!RECEIVABLE_PO_STATUSES.includes(order!.status as PoStatus)) fail(`Goods can only be received against an approved purchase order (this one is ${order!.status.replaceAll('_', ' ')}).`)
        taxType = order!.tax_type === 'inter' ? 'inter' : 'intra'
        poLines = new Map((await t.purchaseOrderLines.findMany({ where: { po_id: order!.id } })).map(line => [line.id, line]))
      }
      const now = new Date()
      let grn = id ? await t.grns.findFirst({ where: { id, client_id: clientId } }) : null
      if (id && !grn) fail('GRN was not found.', 404)
      if (grn && grn.status !== 'draft') fail(`A ${grn.status} GRN cannot be edited.`)
      const rows = input.lines.map((line, index) => {
        const product = info.get(line.variantId)!
        const qty = grnQuantities(line, product.name)
        if (line.poLineId) {
          const poLine = poLines.get(line.poLineId)
          if (!poLine) fail(`${product.name} is not on this purchase order.`)
          if (poLine!.variant_id !== line.variantId) fail(`${product.name} does not match the purchase order line.`)
          if (Math.abs(num(poLine!.rate) - line.rate) > 0.0005 && !isAdmin(account)) fail(`${product.name}: the rate differs from the purchase order (₹${num(poLine!.rate)}). Only an admin can change it.`, 403)
        } else if (input.poId && !isAdmin(account)) fail(`${product.name} is not on the purchase order. Only an admin can receive extra products.`, 403)
        if (qty.received <= 0 && line.freeQty <= 0) fail(`${product.name}: enter a received or free quantity.`)
        const value = lineValues({ qty: qty.accepted, rate: line.rate, discountPercent: line.discountPercent, discountAmount: line.discountAmount, taxPercent: product.taxPercent })
        return { line, product, qty, value, index }
      })
      const totals = documentTotals(rows.map(row => ({ ...row.value, qty: row.qty.accepted, freeQty: row.line.freeQty })), taxType)
      const header = {
        grn_date: input.date, po_id: input.poId, supplier_id: input.supplierId, invoice_available: input.invoiceAvailable ? 1 : 0,
        supplier_invoice_no: input.supplierInvoiceNo, supplier_invoice_date: input.supplierInvoiceDate, vehicle_no: input.vehicleNo, remarks: input.remarks,
        credit_note_expected: input.creditNoteExpected ? 1 : 0, excess_reason: input.excessReason, tax_type: taxType, total_qty: totals.totalQty, free_qty: totals.freeQty,
        taxable_amount: totals.taxable, tax_amount: totals.tax, total_amount: round2(totals.taxable + totals.tax), updated_by: account.user.id, updated_at: now,
      }
      if (grn) {
        await t.grns.update({ where: { id: grn.id }, data: header })
        await t.grnLines.deleteMany({ where: { grn_id: grn.id } })
      } else {
        grn = await t.grns.create({ data: { ...header, client_id: clientId, grn_number: await nextNumber(t, clientId, 'GRN'), received_by: account.user.id, status: 'draft', created_by: account.user.id, created_at: now } })
      }
      await t.grnLines.createMany({ data: rows.map(({ line, product, qty, value, index }) => ({
        grn_id: grn!.id, client_id: clientId, line_num: index + 1, po_line_id: line.poLineId, product_id: product.productId, variant_id: line.variantId,
        received_qty: qty.received, accepted_qty: qty.accepted, rejected_qty: qty.rejected, rejection_reason: qty.rejected > 0 ? line.rejectionReason : null,
        free_qty: line.freeQty, rate: line.rate, mrp: line.mrp, discount_percent: line.discountPercent, discount_amount: value.discount, tax_percent: product.taxPercent,
        taxable_amount: value.taxable, tax_amount: value.tax, line_amount: value.total, batch_no: line.batchNo, expiry_date: line.expiryDate, created_at: now, updated_at: now,
      })) })
      await t.audits.create({ data: audit(account, id ? 'edit' : 'add', `${id ? 'Updated' : 'Created'} GRN ${docNumber('GRN', grn.grn_number)}`, now) })
      if (post) await this.postGrnIn(t, account, grn.id)
      return { id: grn.id, number: docNumber('GRN', grn.grn_number), status: post ? 'posted' : 'draft' }
    })
    return result
  }

  async postGrn(account: Account, id: bigint) {
    return this.prisma.$transaction(async t => {
      const grn = await this.postGrnIn(t, account, id)
      return { id, number: docNumber('GRN', grn.grn_number), status: 'posted' }
    })
  }

  // Stock goes up and the PO's received quantity moves, exactly once (status claim + row locks).
  private async postGrnIn(t: Tx, account: Account, id: bigint) {
    const clientId = account.client.id, now = new Date()
    const grn = await t.grns.findFirst({ where: { id, client_id: clientId } })
    if (!grn) fail('GRN was not found.', 404)
    if (!await claimStatus(args => t.grns.updateMany(args), id, clientId, ['draft'], { status: 'posted', posted_by: account.user.id, posted_at: now, updated_at: now })) fail('This GRN is already posted or cancelled.', 409)
    const lines = await t.grnLines.findMany({ where: { grn_id: id }, orderBy: { line_num: 'asc' } })
    if (!lines.length) fail('Add at least one product first.')
    const info = await variantInfo(t, clientId, lines.map(line => line.variant_id), true)
    if (grn!.po_id) {
      const [order] = await t.$queryRaw<Array<{ status: string }>>(Prisma.sql`SELECT status FROM purchase_orders WHERE id = ${grn!.po_id} AND client_id = ${clientId} FOR UPDATE`)
      if (!order || !RECEIVABLE_PO_STATUSES.includes(order.status as PoStatus)) fail('The purchase order is no longer open for receiving.')
      const poLines = await t.$queryRaw<LockedPoLine[]>(Prisma.sql`SELECT id, variant_id, ordered_qty, received_qty, cancelled_qty FROM purchase_order_lines WHERE po_id = ${grn!.po_id} FOR UPDATE`)
      const map = new Map(poLines.map(line => [line.id, { ordered: num(line.ordered_qty), received: num(line.received_qty), cancelled: num(line.cancelled_qty) }]))
      let excess = false
      for (const line of lines) {
        if (!line.po_line_id) continue
        const current = map.get(line.po_line_id)
        if (!current) fail('A purchase order line of this GRN no longer exists.')
        // Rejected goods do not reduce what is still due on the PO (the supplier may replace them).
        const pending = pendingQty(current!), receiving = num(line.accepted_qty)
        const name = info.get(line.variant_id)?.name ?? 'Product'
        if (receiving > pending + 1e-9) excess = true
        checkReceipt(pending, receiving, isAdmin(account) && !!grn!.excess_reason, name)
        current!.received = round3(current!.received + num(line.accepted_qty))
        await t.purchaseOrderLines.update({ where: { id: line.po_line_id }, data: { received_qty: { increment: num(line.accepted_qty) }, received_free_qty: { increment: num(line.free_qty) }, updated_at: now } })
      }
      if (excess) await t.audits.create({ data: audit(account, 'edit', `GRN ${docNumber('GRN', grn!.grn_number)} received more than ordered: ${grn!.excess_reason}`, now) })
      await t.purchaseOrders.update({ where: { id: grn!.po_id }, data: { status: poStatusAfterReceipt([...map.values()]), updated_at: now } })
    }
    await moveStock(t, account, grn!.grn_date, lines.map(line => ({ productId: line.product_id, variantId: line.variant_id, purchase: num(line.accepted_qty), free: num(line.free_qty), name: info.get(line.variant_id)?.name ?? 'product' })))
    await t.audits.create({ data: audit(account, 'edit', `Posted GRN ${docNumber('GRN', grn!.grn_number)}`, now) })
    return grn!
  }

  async cancelGrn(account: Account, id: bigint, reason: string) {
    const clientId = account.client.id
    return this.prisma.$transaction(async t => {
      const now = new Date()
      const grn = await t.grns.findFirst({ where: { id, client_id: clientId } })
      if (!grn) fail('GRN was not found.', 404)
      if (grn!.status === 'draft') {
        if (!await claimStatus(args => t.grns.updateMany(args), id, clientId, ['draft'], { status: 'cancelled', status_reason: reason, updated_by: account.user.id, updated_at: now })) fail('This GRN changed. Reload and try again.', 409)
      } else {
        if (!isAdmin(account)) fail('Only an admin can cancel a posted GRN.', 403)
        if (!await claimStatus(args => t.grns.updateMany(args), id, clientId, ['posted'], { status: 'cancelled', status_reason: reason, updated_by: account.user.id, updated_at: now })) fail('Only a draft or posted GRN can be cancelled.', 409)
        const lines = await t.$queryRaw<LockedGrnLine[]>(Prisma.sql`SELECT id, accepted_qty, invoiced_qty, returned_qty, rejected_returned_qty FROM grn_lines WHERE grn_id = ${id} FOR UPDATE`)
        if (lines.some(line => num(line.invoiced_qty) > 0)) fail('This GRN is already invoiced. Cancel the purchase invoice first.')
        if (lines.some(line => num(line.returned_qty) > 0 || num(line.rejected_returned_qty) > 0)) fail('Goods of this GRN were already returned. Cancel the purchase return first.')
        const full = await t.grnLines.findMany({ where: { grn_id: id } })
        const info = await variantInfo(t, clientId, full.map(line => line.variant_id), true)
        await moveStock(t, account, grn!.grn_date, full.map(line => ({ productId: line.product_id, variantId: line.variant_id, purchase: -num(line.accepted_qty), free: -num(line.free_qty), name: info.get(line.variant_id)?.name ?? 'product' })))
        if (grn!.po_id) {
          const [order] = await t.$queryRaw<Array<{ status: string }>>(Prisma.sql`SELECT status FROM purchase_orders WHERE id = ${grn!.po_id} FOR UPDATE`)
          for (const line of full) if (line.po_line_id) await t.purchaseOrderLines.update({ where: { id: line.po_line_id }, data: { received_qty: { decrement: num(line.accepted_qty) }, received_free_qty: { decrement: num(line.free_qty) }, updated_at: now } })
          if (order && order.status !== 'closed') {
            const poLines = await t.$queryRaw<LockedPoLine[]>(Prisma.sql`SELECT id, variant_id, ordered_qty, received_qty, cancelled_qty FROM purchase_order_lines WHERE po_id = ${grn!.po_id} FOR UPDATE`)
            await t.purchaseOrders.update({ where: { id: grn!.po_id }, data: { status: poStatusAfterReceipt(poLines.map(line => ({ ordered: num(line.ordered_qty), received: num(line.received_qty), cancelled: num(line.cancelled_qty) }))), updated_at: now } })
          }
        }
      }
      await t.audits.create({ data: audit(account, 'delete', `Cancelled GRN ${docNumber('GRN', grn!.grn_number)}: ${reason}`, now) })
      return { id, number: docNumber('GRN', grn!.grn_number), status: 'cancelled' }
    })
  }

  async listGrns(clientId: bigint, filter: DocFilter & { pendingInvoice: boolean }) {
    const size = 50, number = searchNumber(filter.search, 'GRN')
    let pendingIds: bigint[] | null = null
    if (filter.pendingInvoice) {
      const rows = await this.prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT DISTINCT g.id FROM grns g JOIN grn_lines l ON l.grn_id = g.id WHERE g.client_id = ${clientId} AND g.status = 'posted' AND l.accepted_qty > l.invoiced_qty`)
      pendingIds = rows.map(row => row.id)
    }
    const where: Prisma.GrnsWhereInput = {
      client_id: clientId, ...(filter.status ? { status: { in: filter.status.split(',') } } : {}), ...(filter.supplierId ? { supplier_id: filter.supplierId } : {}),
      ...(pendingIds ? { id: { in: pendingIds } } : {}),
      ...(filter.from || filter.to ? { grn_date: { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) } } : {}),
      ...(filter.search ? number !== null ? { OR: [{ grn_number: number }, { supplier_invoice_no: { contains: filter.search } }] } : { supplier_invoice_no: { contains: filter.search } } : {}),
    }
    const [rows, total] = await Promise.all([this.prisma.grns.findMany({ where, orderBy: { id: 'desc' }, skip: (filter.page - 1) * size, take: size }), this.prisma.grns.count({ where })])
    const suppliers = await supplierNames(this.prisma, clientId, rows.map(row => row.supplier_id))
    const orders = await this.prisma.purchaseOrders.findMany({ where: { id: { in: rows.flatMap(row => row.po_id ? [row.po_id] : []) } }, select: { id: true, po_number: true } })
    const poMap = new Map(orders.map(row => [row.id, row.po_number]))
    const invoiceState = await this.invoiceStates(rows.map(row => row.id))
    return {
      rows: rows.map(row => ({
        id: row.id, number: docNumber('GRN', row.grn_number), date: dateText(row.grn_date), supplierId: row.supplier_id, supplierName: suppliers.get(row.supplier_id)?.supplier_name ?? '',
        poNumber: row.po_id && poMap.has(row.po_id) ? docNumber('PO', poMap.get(row.po_id)!) : null, supplierInvoiceNo: row.supplier_invoice_no, status: row.status,
        invoiceStatus: row.status === 'posted' ? invoiceState.get(row.id) ?? 'pending_invoice' : null, totalQty: num(row.total_qty), totalAmount: num(row.total_amount),
      })),
      total, page: filter.page, pageSize: size,
    }
  }

  private async invoiceStates(ids: bigint[]) {
    const lines = ids.length ? await this.prisma.grnLines.findMany({ where: { grn_id: { in: ids } }, select: { grn_id: true, accepted_qty: true, invoiced_qty: true } }) : []
    const map = new Map<bigint, { accepted: number; invoiced: number }>()
    for (const line of lines) { const row = map.get(line.grn_id) ?? { accepted: 0, invoiced: 0 }; row.accepted += num(line.accepted_qty); row.invoiced += num(line.invoiced_qty); map.set(line.grn_id, row) }
    return new Map([...map].map(([id, row]) => [id, row.invoiced <= 0 ? 'pending_invoice' : row.invoiced + 1e-9 < row.accepted ? 'partially_invoiced' : 'invoiced']))
  }

  async getGrn(clientId: bigint, id: bigint) {
    const grn = await this.prisma.grns.findFirst({ where: { id, client_id: clientId } })
    if (!grn) throw new PurchaseError(404, 'GRN was not found.')
    const lines = await this.prisma.grnLines.findMany({ where: { grn_id: id }, orderBy: { line_num: 'asc' } })
    const info = await variantInfo(this.prisma, clientId, lines.map(line => line.variant_id), true)
    const supplier = await this.prisma.suppliers.findFirst({ where: { id: grn.supplier_id, client_id: clientId } })
    const order = grn.po_id ? await this.prisma.purchaseOrders.findFirst({ where: { id: grn.po_id } }) : null
    const poLines = order ? new Map((await this.prisma.purchaseOrderLines.findMany({ where: { po_id: order.id } })).map(line => [line.id, line])) : new Map()
    const invoices = await this.prisma.purchaseInvoices.findMany({ where: { client_id: clientId, grn_id: id }, select: { id: true, invoice_number: true, status: true, supplier_invoice_no: true } })
    const returns = await this.prisma.purchaseReturns.findMany({ where: { client_id: clientId, grn_id: id }, select: { id: true, prn_number: true, status: true } })
    const users = await userNames(this.prisma, clientId, [grn.received_by, grn.posted_by])
    return {
      id: grn.id, number: docNumber('GRN', grn.grn_number), date: dateText(grn.grn_date), status: grn.status, statusReason: grn.status_reason, invoiceStatus: grn.status === 'posted' ? (await this.invoiceStates([id])).get(id) ?? 'pending_invoice' : null,
      supplier: supplier ? { id: supplier.id, code: supplier.supplier_code, name: supplier.supplier_name, gstin: supplier.gstin, creditDays: supplier.credit_days } : null,
      poId: grn.po_id, poNumber: order ? docNumber('PO', order.po_number) : null, invoiceAvailable: grn.invoice_available === 1, supplierInvoiceNo: grn.supplier_invoice_no,
      supplierInvoiceDate: dateText(grn.supplier_invoice_date), vehicleNo: grn.vehicle_no, remarks: grn.remarks, creditNoteExpected: grn.credit_note_expected === 1,
      excessReason: grn.excess_reason, taxType: grn.tax_type, receivedBy: users.get(grn.received_by) ?? '', postedBy: grn.posted_by ? users.get(grn.posted_by) ?? '' : null,
      totals: { totalQty: num(grn.total_qty), freeQty: num(grn.free_qty), taxable: num(grn.taxable_amount), tax: num(grn.tax_amount), total: num(grn.total_amount) },
      lines: lines.map(line => {
        const poLine = line.po_line_id ? poLines.get(line.po_line_id) : undefined
        const accepted = num(line.accepted_qty), free = num(line.free_qty), rejected = num(line.rejected_qty)
        return {
          id: line.id, lineNum: line.line_num, poLineId: line.po_line_id, ...variantView(info.get(line.variant_id)), variantId: line.variant_id,
          poQty: poLine ? num(poLine.ordered_qty) : null, poRate: poLine ? num(poLine.rate) : null,
          receivedQty: num(line.received_qty), acceptedQty: accepted, rejectedQty: rejected, rejectionReason: line.rejection_reason, freeQty: free, rate: num(line.rate), mrp: num(line.mrp),
          discountPercent: num(line.discount_percent), discountAmount: num(line.discount_amount), taxPercent: num(line.tax_percent), taxable: num(line.taxable_amount),
          tax: num(line.tax_amount), total: num(line.line_amount), batchNo: line.batch_no, expiryDate: dateText(line.expiry_date),
          invoicedQty: num(line.invoiced_qty), invoiceableQty: invoiceableQty({ accepted, invoiced: num(line.invoiced_qty) }),
          returnedQty: num(line.returned_qty), returnableQty: returnableQty({ accepted, returned: num(line.returned_qty) }),
          rejectedReturnableQty: rejectedReturnableQty({ rejected, rejectedReturned: num(line.rejected_returned_qty) }),
        }
      }),
      invoices: invoices.map(row => ({ id: row.id, number: docNumber('PI', row.invoice_number), status: row.status, supplierInvoiceNo: row.supplier_invoice_no })),
      returns: returns.map(row => ({ id: row.id, number: docNumber('PRN', row.prn_number), status: row.status })),
    }
  }

  // ------------------------------------------------------------------ Purchase invoice

  async saveInvoice(account: Account, id: bigint | null, input: InvoiceInput, post: boolean) {
    const clientId = account.client.id
    return this.prisma.$transaction(async t => {
      const now = new Date()
      const grn = await t.grns.findFirst({ where: { id: input.grnId, client_id: clientId } })
      if (!grn) fail('GRN was not found.', 404)
      if (grn!.status !== 'posted') fail('An invoice can only be made for a posted GRN.')
      const supplier = await activeSupplier(t, clientId, grn!.supplier_id)
      let invoice = id ? await t.purchaseInvoices.findFirst({ where: { id, client_id: clientId } }) : null
      if (id && !invoice) fail('Purchase invoice was not found.', 404)
      if (invoice && invoice.status !== 'draft') fail(`A ${invoice.status.replaceAll('_', ' ')} invoice cannot be edited.`)
      if (invoice && invoice.grn_id !== input.grnId) fail('The GRN of an invoice cannot change.')
      // The same supplier bill cannot be entered twice.
      const duplicate = await t.purchaseInvoices.findFirst({ where: { client_id: clientId, supplier_id: grn!.supplier_id, supplier_invoice_no: input.supplierInvoiceNo, status: { not: 'cancelled' }, ...(invoice ? { NOT: { id: invoice.id } } : {}) } })
      if (duplicate) fail(`Supplier invoice ${input.supplierInvoiceNo} is already entered as ${docNumber('PI', duplicate.invoice_number)}.`)
      const grnLines = new Map((await t.grnLines.findMany({ where: { grn_id: grn!.id } })).map(line => [line.id, line]))
      const info = await variantInfo(t, clientId, [...grnLines.values()].map(line => line.variant_id), true)
      const seen = new Set<bigint>()
      let variance = false
      const rows = input.lines.map(line => {
        const grnLine = grnLines.get(line.grnLineId)
        if (!grnLine) fail('An invoice line is not on this GRN.')
        if (seen.has(line.grnLineId)) fail('A GRN line appears twice on the invoice.')
        seen.add(line.grnLineId)
        const name = info.get(grnLine!.variant_id)?.name ?? 'Product'
        const open = invoiceableQty({ accepted: num(grnLine!.accepted_qty), invoiced: num(grnLine!.invoiced_qty) })
        if (line.qty > open + 1e-9) fail(`${name}: only ${open} is left to invoice on this GRN.`)
        if (Math.abs(num(grnLine!.rate) - line.rate) > 0.0005) variance = true
        return { line, grnLine: grnLine!, name, free: num(grnLine!.invoiced_qty) === 0 ? num(grnLine!.free_qty) : 0 }
      })
      if (variance && !isAdmin(account)) fail('The invoice rate differs from the GRN. Only an admin can accept a rate difference.', 403)
      if (variance && !input.varianceReason) fail('Give a reason for the rate difference.')
      if (input.roundOff !== null && !isAdmin(account)) fail('Only an admin can change the rounding.', 403)
      const taxType = grn!.tax_type === 'inter' ? 'inter' : 'intra'
      const values = invoiceValues(rows.map(row => ({ qty: row.line.qty, rate: row.line.rate, discountPercent: row.line.discountPercent, discountAmount: row.line.discountAmount, taxPercent: num(row.grnLine.tax_percent), freeQty: row.free })), input.overall, input.scheme, taxType, input.roundOff ?? undefined)
      if (input.roundOff !== null && Math.abs(input.roundOff) > 1) fail('Rounding can be at most ₹1.')
      const creditDays = input.creditDays ?? supplier.credit_days
      const header = {
        invoice_date: input.date, supplier_id: grn!.supplier_id, grn_id: grn!.id, po_id: grn!.po_id, supplier_invoice_no: input.supplierInvoiceNo,
        supplier_invoice_date: input.supplierInvoiceDate, credit_days: creditDays, due_date: dueDate(input.supplierInvoiceDate, creditDays), tax_type: taxType,
        overall_discount_type: input.overall.type, overall_discount_value: input.overall.value, scheme_discount_type: input.scheme.type, scheme_discount_value: input.scheme.value,
        gross_amount: values.gross, line_discount_amount: values.lineDiscount, overall_discount_amount: values.overallDiscount, scheme_discount_amount: values.schemeDiscount,
        taxable_amount: values.taxable, cgst_amount: values.cgst, sgst_amount: values.sgst, igst_amount: values.igst, round_off: values.roundOff, net_amount: values.net,
        variance_reason: variance ? input.varianceReason : null, remarks: input.remarks, updated_by: account.user.id, updated_at: now,
      }
      if (invoice) {
        await t.purchaseInvoices.update({ where: { id: invoice.id }, data: header })
        await t.purchaseInvoiceLines.deleteMany({ where: { invoice_id: invoice.id } })
      } else {
        invoice = await t.purchaseInvoices.create({ data: { ...header, client_id: clientId, invoice_number: await nextNumber(t, clientId, 'PI'), status: 'draft', created_by: account.user.id, created_at: now } })
      }
      await t.purchaseInvoiceLines.createMany({ data: rows.map((row, index) => {
        const value = values.lines[index]!
        return {
          invoice_id: invoice!.id, client_id: clientId, line_num: index + 1, grn_line_id: row.grnLine.id, product_id: row.grnLine.product_id, variant_id: row.grnLine.variant_id,
          grn_qty: num(row.grnLine.accepted_qty), qty: row.line.qty, free_qty: row.free, grn_rate: num(row.grnLine.rate), rate: row.line.rate, discount_percent: row.line.discountPercent,
          discount_amount: value.discount, header_discount_amount: value.headerDiscount, taxable_amount: value.taxable, tax_percent: num(row.grnLine.tax_percent),
          cgst_amount: value.cgst, sgst_amount: value.sgst, igst_amount: value.igst, line_amount: value.total, created_at: now, updated_at: now,
        }
      }) })
      const number = docNumber('PI', invoice.invoice_number)
      await t.audits.create({ data: audit(account, id ? 'edit' : 'add', `${id ? 'Updated' : 'Created'} purchase invoice ${number}${variance ? ` (rate difference: ${input.varianceReason})` : ''}`, now) })
      if (post) await this.postInvoiceIn(t, account, invoice.id)
      return { id: invoice.id, number, status: post ? 'unpaid' : 'draft' }
    })
  }

  async postInvoice(account: Account, id: bigint) {
    return this.prisma.$transaction(async t => {
      const invoice = await this.postInvoiceIn(t, account, id)
      return { id, number: docNumber('PI', invoice.invoice_number), status: 'unpaid' }
    })
  }

  // Payable once: status claim + ledger row unique per invoice. Never touches stock.
  private async postInvoiceIn(t: Tx, account: Account, id: bigint) {
    const clientId = account.client.id, now = new Date()
    const invoice = await t.purchaseInvoices.findFirst({ where: { id, client_id: clientId } })
    if (!invoice) fail('Purchase invoice was not found.', 404)
    const [grn] = await t.$queryRaw<Array<{ status: string }>>(Prisma.sql`SELECT status FROM grns WHERE id = ${invoice!.grn_id} AND client_id = ${clientId} FOR UPDATE`)
    if (!grn || grn.status !== 'posted') fail('The GRN of this invoice is not posted.')
    if (!await claimStatus(args => t.purchaseInvoices.updateMany(args), id, clientId, ['draft'], { status: 'unpaid', posted_by: account.user.id, posted_at: now, updated_at: now })) fail('This invoice is already posted or cancelled.', 409)
    const lines = await t.purchaseInvoiceLines.findMany({ where: { invoice_id: id } })
    if (!lines.length) fail('Add at least one product first.')
    const locked = new Map((await t.$queryRaw<LockedGrnLine[]>(Prisma.sql`SELECT id, accepted_qty, invoiced_qty, returned_qty, rejected_returned_qty FROM grn_lines WHERE grn_id = ${invoice!.grn_id} FOR UPDATE`)).map(line => [line.id, line]))
    const info = await variantInfo(t, clientId, lines.map(line => line.variant_id), true)
    for (const line of lines) {
      const grnLine = locked.get(line.grn_line_id)
      const open = grnLine ? invoiceableQty({ accepted: num(grnLine.accepted_qty), invoiced: num(grnLine.invoiced_qty) }) : 0
      if (num(line.qty) > open + 1e-9) fail(`${info.get(line.variant_id)?.name ?? 'Product'}: only ${open} is left to invoice on the GRN.`)
      await t.grnLines.update({ where: { id: line.grn_line_id }, data: { invoiced_qty: { increment: num(line.qty) }, updated_at: now } })
    }
    const number = docNumber('PI', invoice!.invoice_number)
    await ledgerEntry(t, account, { supplierId: invoice!.supplier_id, date: invoice!.invoice_date, docType: 'invoice', docId: id, docNumber: number, particulars: `Purchase invoice ${invoice!.supplier_invoice_no}`, credit: num(invoice!.net_amount) })
    await this.updatePurchaseRates(t, account, invoice!.supplier_id, invoice!.invoice_date, lines)
    await t.audits.create({ data: audit(account, 'edit', `Posted purchase invoice ${number}`, now) })
    return invoice!
  }

  // Last purchase date / rate / supplier, and the average cost of the last 5 purchases
  // (free goods spread into the cost). The product's selling cost price is not changed.
  private async updatePurchaseRates(t: Tx, account: Account, supplierId: bigint, date: Date, lines: Prisma.PurchaseInvoiceLinesGetPayload<object>[]) {
    const clientId = account.client.id, now = new Date()
    for (const line of lines) {
      const recent = await t.$queryRaw<Array<{ taxable: Prisma.Decimal; qty: Prisma.Decimal }>>(Prisma.sql`
        SELECT l.taxable_amount taxable, l.qty + l.free_qty qty FROM purchase_invoice_lines l JOIN purchase_invoices i ON i.id = l.invoice_id
        WHERE l.client_id = ${clientId} AND l.variant_id = ${line.variant_id} AND i.status NOT IN ('draft', 'cancelled') ORDER BY l.id DESC LIMIT 5`)
      const qty = recent.reduce((sum, row) => sum + num(row.qty), 0), value = recent.reduce((sum, row) => sum + num(row.taxable), 0)
      const data = { last_purchase_date: date, last_purchase_rate: num(line.rate), last_supplier_id: supplierId, avg_purchase_rate: qty > 0 ? Math.round(value / qty * 1000) / 1000 : num(line.rate), avg_rate_qty: qty, updated_by: account.user.id, updated_at: now }
      await t.productPurchaseSettings.upsert({
        where: { client_id_variant_id: { client_id: clientId, variant_id: line.variant_id } },
        create: { ...data, client_id: clientId, product_id: line.product_id, variant_id: line.variant_id, created_by: account.user.id, created_at: now },
        update: data,
      })
    }
  }

  async cancelInvoice(account: Account, id: bigint, reason: string) {
    const clientId = account.client.id
    return this.prisma.$transaction(async t => {
      const now = new Date()
      const invoice = await t.purchaseInvoices.findFirst({ where: { id, client_id: clientId } })
      if (!invoice) fail('Purchase invoice was not found.', 404)
      const number = docNumber('PI', invoice!.invoice_number)
      if (invoice!.status === 'draft') {
        if (!await claimStatus(args => t.purchaseInvoices.updateMany(args), id, clientId, ['draft'], { status: 'cancelled', status_reason: reason, updated_by: account.user.id, updated_at: now })) fail('This invoice changed. Reload and try again.', 409)
      } else {
        if (!isAdmin(account)) fail('Only an admin can cancel a posted invoice.', 403)
        const linked = await t.purchaseReturns.count({ where: { client_id: clientId, invoice_id: id, status: { notIn: ['draft', 'cancelled'] } } })
          + await t.purchaseDebitNotes.count({ where: { client_id: clientId, invoice_id: id, status: { notIn: ['draft', 'cancelled'] } } })
          + await t.supplierCreditNotes.count({ where: { client_id: clientId, invoice_id: id, status: 'posted' } })
        if (linked) fail('Returns or notes are posted against this invoice. Cancel them first.')
        if (num(invoice!.paid_amount) > 0) fail('Payments are allocated to this invoice. Cancel those payments first.')
        if (!await claimStatus(args => t.purchaseInvoices.updateMany(args), id, clientId, ['unpaid'], { status: 'cancelled', status_reason: reason, updated_by: account.user.id, updated_at: now })) fail('Only an unpaid invoice can be cancelled.', 409)
        await t.$queryRaw(Prisma.sql`SELECT id FROM grn_lines WHERE grn_id = ${invoice!.grn_id} FOR UPDATE`)
        const lines = await t.purchaseInvoiceLines.findMany({ where: { invoice_id: id } })
        for (const line of lines) await t.grnLines.update({ where: { id: line.grn_line_id }, data: { invoiced_qty: { decrement: num(line.qty) }, updated_at: now } })
        await ledgerEntry(t, account, { supplierId: invoice!.supplier_id, date: invoice!.invoice_date, docType: 'invoice_cancel', docId: id, docNumber: number, particulars: `Cancelled: ${reason}`, debit: num(invoice!.net_amount) })
      }
      await t.audits.create({ data: audit(account, 'delete', `Cancelled purchase invoice ${number}: ${reason}`, now) })
      return { id, number, status: 'cancelled' }
    })
  }

  async listInvoices(clientId: bigint, filter: DocFilter) {
    const size = 50, number = searchNumber(filter.search, 'PI')
    const where: Prisma.PurchaseInvoicesWhereInput = {
      client_id: clientId, ...(filter.status ? { status: { in: filter.status.split(',') } } : {}), ...(filter.supplierId ? { supplier_id: filter.supplierId } : {}),
      ...(filter.from || filter.to ? { invoice_date: { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) } } : {}),
      ...(filter.search ? number !== null ? { OR: [{ invoice_number: number }, { supplier_invoice_no: { contains: filter.search } }] } : { supplier_invoice_no: { contains: filter.search } } : {}),
    }
    const [rows, total] = await Promise.all([this.prisma.purchaseInvoices.findMany({ where, orderBy: { id: 'desc' }, skip: (filter.page - 1) * size, take: size }), this.prisma.purchaseInvoices.count({ where })])
    const suppliers = await supplierNames(this.prisma, clientId, rows.map(row => row.supplier_id))
    const grns = await this.prisma.grns.findMany({ where: { id: { in: rows.map(row => row.grn_id) } }, select: { id: true, grn_number: true } })
    const grnMap = new Map(grns.map(row => [row.id, row.grn_number]))
    return {
      rows: rows.map(row => ({
        id: row.id, number: docNumber('PI', row.invoice_number), date: dateText(row.invoice_date), supplierId: row.supplier_id, supplierName: suppliers.get(row.supplier_id)?.supplier_name ?? '',
        supplierInvoiceNo: row.supplier_invoice_no, supplierInvoiceDate: dateText(row.supplier_invoice_date), dueDate: dateText(row.due_date),
        grnNumber: grnMap.has(row.grn_id) ? docNumber('GRN', grnMap.get(row.grn_id)!) : null, status: row.status, taxable: num(row.taxable_amount), netAmount: num(row.net_amount),
      })),
      total, page: filter.page, pageSize: size,
    }
  }

  async getInvoice(clientId: bigint, id: bigint) {
    const invoice = await this.prisma.purchaseInvoices.findFirst({ where: { id, client_id: clientId } })
    if (!invoice) throw new PurchaseError(404, 'Purchase invoice was not found.')
    const lines = await this.prisma.purchaseInvoiceLines.findMany({ where: { invoice_id: id }, orderBy: { line_num: 'asc' } })
    const info = await variantInfo(this.prisma, clientId, lines.map(line => line.variant_id), true)
    const supplier = await this.prisma.suppliers.findFirst({ where: { id: invoice.supplier_id, client_id: clientId } })
    const grn = await this.prisma.grns.findFirst({ where: { id: invoice.grn_id } })
    const users = await userNames(this.prisma, clientId, [invoice.created_by, invoice.posted_by])
    return {
      id: invoice.id, number: docNumber('PI', invoice.invoice_number), date: dateText(invoice.invoice_date), status: invoice.status, statusReason: invoice.status_reason,
      supplier: supplier ? { id: supplier.id, code: supplier.supplier_code, name: supplier.supplier_name, gstin: supplier.gstin } : null,
      grnId: invoice.grn_id, grnNumber: grn ? docNumber('GRN', grn.grn_number) : null, poId: invoice.po_id, supplierInvoiceNo: invoice.supplier_invoice_no,
      supplierInvoiceDate: dateText(invoice.supplier_invoice_date), creditDays: invoice.credit_days, dueDate: dateText(invoice.due_date), taxType: invoice.tax_type,
      overall: { type: invoice.overall_discount_type, value: num(invoice.overall_discount_value) }, scheme: { type: invoice.scheme_discount_type, value: num(invoice.scheme_discount_value) },
      totals: {
        gross: num(invoice.gross_amount), lineDiscount: num(invoice.line_discount_amount), overallDiscount: num(invoice.overall_discount_amount), schemeDiscount: num(invoice.scheme_discount_amount),
        taxable: num(invoice.taxable_amount), cgst: num(invoice.cgst_amount), sgst: num(invoice.sgst_amount), igst: num(invoice.igst_amount), roundOff: num(invoice.round_off), net: num(invoice.net_amount),
      },
      varianceReason: invoice.variance_reason, remarks: invoice.remarks, createdBy: users.get(invoice.created_by) ?? '', postedBy: invoice.posted_by ? users.get(invoice.posted_by) ?? '' : null,
      lines: lines.map(line => ({
        id: line.id, lineNum: line.line_num, grnLineId: line.grn_line_id, ...variantView(info.get(line.variant_id)), variantId: line.variant_id,
        grnQty: num(line.grn_qty), qty: num(line.qty), freeQty: num(line.free_qty), grnRate: num(line.grn_rate), rate: num(line.rate), discountPercent: num(line.discount_percent),
        discountAmount: num(line.discount_amount), headerDiscount: num(line.header_discount_amount), taxable: num(line.taxable_amount), taxPercent: num(line.tax_percent),
        cgst: num(line.cgst_amount), sgst: num(line.sgst_amount), igst: num(line.igst_amount), total: num(line.line_amount),
      })),
    }
  }
}
