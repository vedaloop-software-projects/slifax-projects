import type { Prisma, PrismaClient } from '@prisma/client'
import type { Account } from '../auth/contracts.ts'
import { documentTotals, lineValues, round3 } from './calc.ts'
import { docNumber, fail, pendingQty, poActionTarget, poStatusAfterReceipt, PurchaseError, type PoAction, type PoStatus } from './rules.ts'
import { activeSupplier, audit, dateText, isAdmin, nextNumber, num, requireVariants, supplierNames, taxTypeForSupplier, userNames, variantInfo, variantView, type Tx } from './shared.ts'

export type PoLineInput = { id: bigint | null; variantId: bigint; qty: number; freeQty: number; rate: number; discountPercent: number; discountAmount: number; suggestedQty: number | null; reason: string | null }
export type PoInput = {
  date: Date; supplierId: bigint; expectedDate: Date | null; creditDays: number; paymentTerms: string | null; referenceNo: string | null
  remarks: string | null; poType: 'manual' | 'avg_sales' | 'mbq' | 'forecast'; sourceRef: string | null; lines: PoLineInput[]
}
export type PoSaveAction = 'save' | 'submit' | 'approve'
export type PoFilter = { status: string | null; supplierId: bigint | null; from: Date | null; to: Date | null; search: string; page: number }

const EDITABLE: PoStatus[] = ['draft', 'pending_approval']
const AMENDABLE: PoStatus[] = ['approved', 'partially_received']

export class PurchaseOrderStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  async save(account: Account, id: bigint | null, input: PoInput, action: PoSaveAction, amendReason: string | null) {
    const clientId = account.client.id
    if (action === 'approve' && !isAdmin(account)) fail('Only an admin can approve purchase orders.', 403)
    return this.prisma.$transaction(async t => {
      const supplier = await activeSupplier(t, clientId, input.supplierId)
      const info = await variantInfo(t, clientId, input.lines.map(line => line.variantId))
      requireVariants(info, input.lines.map(line => line.variantId))
      const taxType = await taxTypeForSupplier(t, clientId, supplier.state_id)
      const now = new Date()
      let order = id ? await t.purchaseOrders.findFirst({ where: { id, client_id: clientId } }) : null
      if (id && !order) fail('Purchase order was not found.', 404)
      let status: PoStatus = (order?.status as PoStatus | undefined) ?? 'draft'
      if (order) {
        if (AMENDABLE.includes(status)) {
          if (!isAdmin(account)) fail('This purchase order is approved. Only an admin can amend it.', 403)
          if (!amendReason) fail('Give a reason for amending an approved purchase order.')
          if (order.supplier_id !== input.supplierId) fail('The supplier of an approved purchase order cannot change.')
        } else if (!EDITABLE.includes(status)) fail(`A ${status.replaceAll('_', ' ')} purchase order cannot be edited.`)
        // Taking the row lock first serialises this with GRNs posting against the same PO.
        await t.purchaseOrders.update({ where: { id: order.id }, data: { updated_at: now } })
      }
      const header = {
        po_date: input.date, supplier_id: input.supplierId, expected_date: input.expectedDate, credit_days: input.creditDays, payment_terms: input.paymentTerms,
        reference_no: input.referenceNo, remarks: input.remarks, tax_type: taxType, updated_by: account.user.id, updated_at: now,
      }
      if (!order) {
        const number = await nextNumber(t, clientId, 'PO')
        order = await t.purchaseOrders.create({ data: { ...header, client_id: clientId, po_number: number, po_type: input.poType, source_ref: input.sourceRef, status: 'draft', created_by: account.user.id, created_at: now } })
      } else if (AMENDABLE.includes(status)) {
        await this.snapshot(t, order, amendReason!, account)
      }
      const existing = await t.purchaseOrderLines.findMany({ where: { po_id: order.id, client_id: clientId } })
      const byId = new Map(existing.map(line => [line.id, line]))
      const kept = new Set<bigint>()
      const values = []
      for (const [index, line] of input.lines.entries()) {
        const product = info.get(line.variantId)!
        const value = lineValues({ qty: line.qty, rate: line.rate, discountPercent: line.discountPercent, discountAmount: line.discountAmount, taxPercent: product.taxPercent })
        values.push({ ...value, qty: line.qty, freeQty: line.freeQty })
        const data = {
          line_num: index + 1, product_id: product.productId, variant_id: line.variantId, ordered_qty: line.qty, free_qty: line.freeQty, rate: line.rate,
          discount_percent: line.discountPercent, discount_amount: value.discount, tax_percent: product.taxPercent, taxable_amount: value.taxable,
          tax_amount: value.tax, line_amount: value.total, suggested_qty: line.suggestedQty, suggestion_reason: line.reason, updated_at: now,
        }
        const current = line.id ? byId.get(line.id) : undefined
        if (line.id && !current) fail('A line of this purchase order no longer exists. Reload and try again.', 409)
        if (current) {
          if (current.variant_id !== line.variantId && num(current.received_qty) > 0) fail(`${product.name}: a line that already received goods cannot change product.`)
          if (line.qty < round3(num(current.received_qty) + num(current.cancelled_qty))) fail(`${product.name}: ordered quantity cannot be below the ${num(current.received_qty)} already received.`)
          await t.purchaseOrderLines.update({ where: { id: current.id }, data })
          kept.add(current.id)
        } else {
          await t.purchaseOrderLines.create({ data: { ...data, po_id: order.id, client_id: clientId, created_at: now } })
        }
      }
      for (const line of existing) {
        if (kept.has(line.id)) continue
        if (num(line.received_qty) > 0) fail('A line that already received goods cannot be removed.')
        await t.purchaseOrderLines.delete({ where: { id: line.id } })
      }
      const totals = documentTotals(values, taxType)
      if (AMENDABLE.includes(status)) {
        const lines = await t.purchaseOrderLines.findMany({ where: { po_id: order.id } })
        status = poStatusAfterReceipt(lines.map(line => ({ ordered: num(line.ordered_qty), received: num(line.received_qty), cancelled: num(line.cancelled_qty) })))
      } else if (action === 'submit') status = 'pending_approval'
      else if (action === 'approve') status = 'approved'
      await t.purchaseOrders.update({ where: { id: order.id }, data: {
        ...header, total_qty: totals.totalQty, free_qty: totals.freeQty, gross_amount: totals.gross, discount_amount: totals.discount, taxable_amount: totals.taxable,
        cgst_amount: totals.cgst, sgst_amount: totals.sgst, igst_amount: totals.igst, round_off: totals.roundOff, net_amount: totals.net, status,
        ...(status === 'approved' && order.status !== 'approved' && !AMENDABLE.includes(order.status as PoStatus) ? { approved_by: account.user.id, approved_at: now } : {}),
        ...(AMENDABLE.includes(order.status as PoStatus) ? { version: { increment: 1 } } : {}),
      } })
      const number = docNumber('PO', order.po_number)
      await t.audits.create({ data: audit(account, id ? 'edit' : 'add', `${id ? (amendReason ? 'Amended' : 'Updated') : 'Created'} purchase order ${number}${amendReason ? `: ${amendReason}` : ''}`, now) })
      return { id: order.id, number, status }
    })
  }

  private async snapshot(t: Tx, order: Prisma.PurchaseOrdersGetPayload<object>, reason: string, account: Account) {
    const lines = await t.purchaseOrderLines.findMany({ where: { po_id: order.id }, orderBy: { line_num: 'asc' } })
    const plain = (row: object) => JSON.parse(JSON.stringify(row, (_key, value) => typeof value === 'bigint' ? value.toString() : value))
    await t.purchaseOrderVersions.create({ data: { po_id: order.id, client_id: order.client_id, version: order.version, snapshot: { order: plain(order), lines: lines.map(plain) }, reason: reason.slice(0, 255), created_by: account.user.id, created_at: new Date() } })
  }

  async action(account: Account, id: bigint, action: PoAction, reason: string | null) {
    const clientId = account.client.id
    if (action !== 'submit' && !isAdmin(account)) fail(`Only an admin can ${action} purchase orders.`, 403)
    if ((action === 'reject' || action === 'cancel') && !reason) fail(`Give a reason to ${action} the purchase order.`)
    return this.prisma.$transaction(async t => {
      const now = new Date()
      // Lock first so a GRN posting at the same moment waits for this.
      const locked = await t.purchaseOrders.updateMany({ where: { id, client_id: clientId }, data: { updated_at: now } })
      if (!locked.count) fail('Purchase order was not found.', 404)
      const order = await t.purchaseOrders.findFirst({ where: { id, client_id: clientId } })
      const lines = await t.purchaseOrderLines.findMany({ where: { po_id: id } })
      if (action !== 'cancel' && !lines.length) fail('Add at least one product first.')
      const anythingReceived = lines.some(line => num(line.received_qty) > 0)
      const status = poActionTarget(action, order!.status, anythingReceived)
      if (action === 'cancel') {
        const drafts = await t.grns.count({ where: { client_id: clientId, po_id: id, status: 'draft' } })
        if (drafts) fail(`Cancel or post the ${drafts} draft GRN(s) of this purchase order first.`)
        for (const line of lines) {
          const rest = pendingQty({ ordered: num(line.ordered_qty), received: num(line.received_qty), cancelled: num(line.cancelled_qty) })
          if (rest > 0) await t.purchaseOrderLines.update({ where: { id: line.id }, data: { cancelled_qty: { increment: rest }, updated_at: now } })
        }
      }
      await t.purchaseOrders.update({ where: { id }, data: {
        status, updated_by: account.user.id, updated_at: now, ...(reason ? { status_reason: reason.slice(0, 255) } : {}),
        ...(action === 'approve' ? { approved_by: account.user.id, approved_at: now } : {}),
      } })
      const number = docNumber('PO', order!.po_number)
      await t.audits.create({ data: audit(account, 'edit', `Purchase order ${number}: ${action}${reason ? ` (${reason})` : ''}`, now) })
      return { id, number, status }
    })
  }

  async list(clientId: bigint, filter: PoFilter) {
    const size = 50
    const number = /^\d+$/.test(filter.search.replace(/^PO-?/i, '')) ? BigInt(filter.search.replace(/^PO-?/i, '')) : null
    const where: Prisma.PurchaseOrdersWhereInput = {
      client_id: clientId, ...(filter.status ? { status: { in: filter.status.split(',') } } : {}), ...(filter.supplierId ? { supplier_id: filter.supplierId } : {}),
      ...(filter.from || filter.to ? { po_date: { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) } } : {}),
      ...(filter.search ? number !== null ? { OR: [{ po_number: number }, { reference_no: { contains: filter.search } }] } : { reference_no: { contains: filter.search } } : {}),
    }
    const [rows, total] = await Promise.all([this.prisma.purchaseOrders.findMany({ where, orderBy: { id: 'desc' }, skip: (filter.page - 1) * size, take: size }), this.prisma.purchaseOrders.count({ where })])
    const suppliers = await supplierNames(this.prisma, clientId, rows.map(row => row.supplier_id))
    return {
      rows: rows.map(row => ({
        id: row.id, number: docNumber('PO', row.po_number), date: dateText(row.po_date), supplierId: row.supplier_id, supplierName: suppliers.get(row.supplier_id)?.supplier_name ?? '',
        expectedDate: dateText(row.expected_date), poType: row.po_type, status: row.status, totalQty: num(row.total_qty), netAmount: num(row.net_amount), referenceNo: row.reference_no,
      })),
      total, page: filter.page, pageSize: size,
    }
  }

  async get(clientId: bigint, id: bigint) {
    const order = await this.prisma.purchaseOrders.findFirst({ where: { id, client_id: clientId } })
    if (!order) throw new PurchaseError(404, 'Purchase order was not found.')
    const lines = await this.prisma.purchaseOrderLines.findMany({ where: { po_id: id }, orderBy: { line_num: 'asc' } })
    const info = await variantInfo(this.prisma, clientId, lines.map(line => line.variant_id), true)
    const supplier = await this.prisma.suppliers.findFirst({ where: { id: order.supplier_id, client_id: clientId } })
    const users = await userNames(this.prisma, clientId, [order.created_by, order.approved_by])
    const versions = await this.prisma.purchaseOrderVersions.findMany({ where: { po_id: id }, orderBy: { version: 'asc' }, select: { version: true, reason: true, created_by: true, created_at: true } })
    const grns = await this.prisma.grns.findMany({ where: { client_id: clientId, po_id: id }, orderBy: { id: 'asc' }, select: { id: true, grn_number: true, grn_date: true, status: true } })
    return {
      id: order.id, number: docNumber('PO', order.po_number), date: dateText(order.po_date), status: order.status, statusReason: order.status_reason, version: order.version,
      supplier: supplier ? { id: supplier.id, code: supplier.supplier_code, name: supplier.supplier_name, gstin: supplier.gstin, address: supplier.address, city: supplier.city, stateId: supplier.state_id, mobile: supplier.mobile } : null,
      expectedDate: dateText(order.expected_date), creditDays: order.credit_days, paymentTerms: order.payment_terms, referenceNo: order.reference_no, poType: order.po_type,
      sourceRef: order.source_ref, remarks: order.remarks, taxType: order.tax_type,
      totals: { totalQty: num(order.total_qty), freeQty: num(order.free_qty), gross: num(order.gross_amount), discount: num(order.discount_amount), taxable: num(order.taxable_amount), cgst: num(order.cgst_amount), sgst: num(order.sgst_amount), igst: num(order.igst_amount), roundOff: num(order.round_off), net: num(order.net_amount) },
      lines: lines.map(line => {
        const ordered = num(line.ordered_qty), received = num(line.received_qty), cancelled = num(line.cancelled_qty)
        return {
          id: line.id, lineNum: line.line_num, ...variantView(info.get(line.variant_id)), variantId: line.variant_id, mrp: info.get(line.variant_id)?.mrp ?? 0,
          qty: ordered, freeQty: num(line.free_qty), rate: num(line.rate), discountPercent: num(line.discount_percent), discountAmount: num(line.discount_amount),
          taxPercent: num(line.tax_percent), taxable: num(line.taxable_amount), tax: num(line.tax_amount), total: num(line.line_amount),
          receivedQty: received, receivedFreeQty: num(line.received_free_qty), cancelledQty: cancelled, pendingQty: pendingQty({ ordered, received, cancelled }),
          pendingFreeQty: round3(Math.max(num(line.free_qty) - num(line.received_free_qty), 0)), suggestedQty: line.suggested_qty === null ? null : num(line.suggested_qty), reason: line.suggestion_reason,
        }
      }),
      createdBy: users.get(order.created_by) ?? '', approvedBy: order.approved_by ? users.get(order.approved_by) ?? '' : null, approvedAt: order.approved_at,
      versions: versions.map(row => ({ version: row.version, reason: row.reason, at: row.created_at })),
      grns: grns.map(row => ({ id: row.id, number: docNumber('GRN', row.grn_number), date: dateText(row.grn_date), status: row.status })),
    }
  }
}
