import { Prisma, type PrismaClient } from '@prisma/client'
import type { Account } from '../auth/contracts.ts'
import { documentTotals, lineValues, round2, splitTax } from './calc.ts'
import { debitNoteTarget, docNumber, fail, prnStatusAfterPost, PurchaseError, rejectedReturnableQty, returnableQty, type DebitNoteAction } from './rules.ts'
import { activeSupplier, adjustInvoice, audit, claimStatus, dateText, isAdmin, ledgerEntry, moveStock, nextNumber, num, requireVariants, supplierNames, taxTypeForSupplier, userNames, variantInfo, variantView, type Tx } from './shared.ts'
import type { DocFilter } from './receipts-store.ts'

export type ReturnLineInput = { grnLineId: bigint | null; variantId: bigint; returnQty: number; rejectedQty: number; rate: number | null; discountPercent: number | null; batchNo: string | null; expiryDate: Date | null }
export type ReturnInput = { date: Date; supplierId: bigint; grnId: bigint | null; returnReason: string; remarks: string | null; debitNoteRequired: boolean; lines: ReturnLineInput[] }
export type CreditNoteInput = {
  supplierId: bigint; creditNoteNo: string; date: Date; invoiceId: bigint | null; grnId: bigint | null; prnId: bigint | null
  reason: string; remarks: string | null; taxable: number; taxPercent: number
}

type LockedGrnLine = { id: bigint; accepted_qty: Prisma.Decimal; rejected_qty: Prisma.Decimal; returned_qty: Prisma.Decimal; rejected_returned_qty: Prisma.Decimal }
const POSTED_DN = ['posted', 'sent', 'acknowledged', 'settled']
const searchNumber = (search: string, prefix: string) => { const raw = search.replace(new RegExp(`^${prefix}-?`, 'i'), ''); return /^\d+$/.test(raw) ? BigInt(raw) : null }

export class PurchaseReturnStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  // ------------------------------------------------------------------ PRN

  async saveReturn(account: Account, id: bigint | null, input: ReturnInput, post: boolean) {
    const clientId = account.client.id
    if (!input.grnId && !isAdmin(account)) fail('A return without its GRN needs an admin.', 403)
    return this.prisma.$transaction(async t => {
      const now = new Date()
      const supplier = await activeSupplier(t, clientId, input.supplierId)
      let prn = id ? await t.purchaseReturns.findFirst({ where: { id, client_id: clientId } }) : null
      if (id && !prn) fail('Purchase return was not found.', 404)
      if (prn && prn.status !== 'draft') fail(`A ${prn.status.replaceAll('_', ' ')} return cannot be edited.`)
      let taxType = await taxTypeForSupplier(t, clientId, supplier.state_id)
      let grnLines = new Map<bigint, Prisma.GrnLinesGetPayload<object>>()
      let invoiceId: bigint | null = null
      if (input.grnId) {
        const grn = await t.grns.findFirst({ where: { id: input.grnId, client_id: clientId } })
        if (!grn) fail('GRN was not found.', 404)
        if (grn!.status !== 'posted') fail('Goods can only be returned from a posted GRN.')
        if (grn!.supplier_id !== input.supplierId) fail('The return supplier must be the GRN supplier.')
        taxType = grn!.tax_type === 'inter' ? 'inter' : 'intra'
        grnLines = new Map((await t.grnLines.findMany({ where: { grn_id: grn!.id } })).map(line => [line.id, line]))
        invoiceId = (await t.purchaseInvoices.findFirst({ where: { client_id: clientId, grn_id: grn!.id, status: { notIn: ['draft', 'cancelled'] } }, orderBy: { id: 'desc' }, select: { id: true } }))?.id ?? null
      }
      const info = await variantInfo(t, clientId, input.lines.map(line => line.grnLineId ? grnLines.get(line.grnLineId)?.variant_id ?? line.variantId : line.variantId), true)
      const seen = new Set<bigint>()
      const rows = input.lines.map((line, index) => {
        let rate = line.rate ?? 0, discountPercent = line.discountPercent ?? 0, taxPercent: number, variantId = line.variantId, productId: bigint
        let batchNo = line.batchNo, expiryDate = line.expiryDate
        if (input.grnId) {
          const grnLine = line.grnLineId ? grnLines.get(line.grnLineId) : undefined
          if (!grnLine) fail('Each returned product must come from the GRN.')
          if (seen.has(grnLine!.id)) fail('A GRN line appears twice on the return.')
          seen.add(grnLine!.id)
          const name = info.get(grnLine!.variant_id)?.name ?? 'Product'
          const paid = returnableQty({ accepted: num(grnLine!.accepted_qty), returned: num(grnLine!.returned_qty) })
          const rejected = rejectedReturnableQty({ rejected: num(grnLine!.rejected_qty), rejectedReturned: num(grnLine!.rejected_returned_qty) })
          if (line.returnQty > paid + 1e-9) fail(`${name}: only ${paid} can be returned from stock.`)
          if (line.rejectedQty > rejected + 1e-9) fail(`${name}: only ${rejected} rejected can be returned.`)
          // Original rate and discount by default; a different value needs an admin.
          const grnRate = num(grnLine!.rate), grnDiscount = num(grnLine!.discount_percent)
          if ((line.rate !== null && Math.abs(line.rate - grnRate) > 0.0005) || (line.discountPercent !== null && Math.abs(line.discountPercent - grnDiscount) > 0.0005)) {
            if (!isAdmin(account)) fail(`${name}: the return rate must match the GRN. Only an admin can change it.`, 403)
          }
          rate = line.rate ?? grnRate; discountPercent = line.discountPercent ?? grnDiscount; taxPercent = num(grnLine!.tax_percent)
          variantId = grnLine!.variant_id; productId = grnLine!.product_id
          batchNo ??= grnLine!.batch_no; expiryDate ??= grnLine!.expiry_date
        } else {
          requireVariants(info, [line.variantId])
          if (line.rejectedQty > 0) fail('Rejected goods can only be returned against their GRN.')
          taxPercent = info.get(line.variantId)!.taxPercent; productId = info.get(line.variantId)!.productId
        }
        if (line.returnQty <= 0 && line.rejectedQty <= 0) fail(`${info.get(variantId)?.name ?? 'Product'}: enter a return quantity.`)
        const value = lineValues({ qty: line.returnQty, rate, discountPercent, taxPercent })
        return { index, grnLineId: line.grnLineId, variantId, productId, rate, discountPercent, taxPercent, value, returnQty: line.returnQty, rejectedQty: line.rejectedQty, batchNo, expiryDate }
      })
      const totals = documentTotals(rows.map(row => ({ ...row.value, qty: row.returnQty + row.rejectedQty })), taxType)
      const header = {
        prn_date: input.date, supplier_id: input.supplierId, grn_id: input.grnId, invoice_id: invoiceId, return_reason: input.returnReason, remarks: input.remarks,
        debit_note_required: input.debitNoteRequired ? 1 : 0, tax_type: taxType, total_qty: totals.totalQty, taxable_amount: totals.taxable, tax_amount: totals.tax,
        total_amount: round2(totals.taxable + totals.tax), updated_by: account.user.id, updated_at: now,
      }
      if (prn) {
        await t.purchaseReturns.update({ where: { id: prn.id }, data: header })
        await t.purchaseReturnLines.deleteMany({ where: { prn_id: prn.id } })
      } else {
        prn = await t.purchaseReturns.create({ data: { ...header, client_id: clientId, prn_number: await nextNumber(t, clientId, 'PRN'), status: 'draft', created_by: account.user.id, created_at: now } })
      }
      await t.purchaseReturnLines.createMany({ data: rows.map(row => ({
        prn_id: prn!.id, client_id: clientId, line_num: row.index + 1, grn_line_id: row.grnLineId, product_id: row.productId, variant_id: row.variantId,
        return_qty: row.returnQty, rejected_qty: row.rejectedQty, rate: row.rate, discount_percent: row.discountPercent, tax_percent: row.taxPercent,
        taxable_amount: row.value.taxable, tax_amount: row.value.tax, line_amount: row.value.total, batch_no: row.batchNo, expiry_date: row.expiryDate, created_at: now, updated_at: now,
      })) })
      const number = docNumber('PRN', prn.prn_number)
      await t.audits.create({ data: audit(account, id ? 'edit' : 'add', `${id ? 'Updated' : 'Created'} purchase return ${number}`, now) })
      let status = 'draft'
      if (post) status = await this.postReturnIn(t, account, prn.id)
      return { id: prn.id, number, status }
    })
  }

  async postReturn(account: Account, id: bigint) {
    return this.prisma.$transaction(async t => {
      const status = await this.postReturnIn(t, account, id)
      const prn = await t.purchaseReturns.findFirst({ where: { id }, select: { prn_number: true } })
      return { id, number: docNumber('PRN', prn!.prn_number), status }
    })
  }

  // Stock goes down once; the money moves only through the debit note (or a supplier credit note).
  private async postReturnIn(t: Tx, account: Account, id: bigint) {
    const clientId = account.client.id, now = new Date()
    const prn = await t.purchaseReturns.findFirst({ where: { id, client_id: clientId } })
    if (!prn) fail('Purchase return was not found.', 404)
    const status = prnStatusAfterPost(prn!.debit_note_required === 1)
    if (!await claimStatus(args => t.purchaseReturns.updateMany(args), id, clientId, ['draft'], { status, posted_by: account.user.id, posted_at: now, updated_at: now })) fail('This return is already posted or cancelled.', 409)
    const lines = await t.purchaseReturnLines.findMany({ where: { prn_id: id }, orderBy: { line_num: 'asc' } })
    if (!lines.length) fail('Add at least one product first.')
    const info = await variantInfo(t, clientId, lines.map(line => line.variant_id), true)
    if (prn!.grn_id) {
      const [grn] = await t.$queryRaw<Array<{ status: string }>>(Prisma.sql`SELECT status FROM grns WHERE id = ${prn!.grn_id} AND client_id = ${clientId} FOR UPDATE`)
      if (!grn || grn.status !== 'posted') fail('The GRN of this return is not posted.')
      const locked = new Map((await t.$queryRaw<LockedGrnLine[]>(Prisma.sql`SELECT id, accepted_qty, rejected_qty, returned_qty, rejected_returned_qty FROM grn_lines WHERE grn_id = ${prn!.grn_id} FOR UPDATE`)).map(line => [line.id, line]))
      for (const line of lines) {
        const grnLine = line.grn_line_id ? locked.get(line.grn_line_id) : undefined
        const name = info.get(line.variant_id)?.name ?? 'Product'
        if (!grnLine) fail(`${name} is no longer on the GRN.`)
        const paid = returnableQty({ accepted: num(grnLine!.accepted_qty), returned: num(grnLine!.returned_qty) })
        const rejected = rejectedReturnableQty({ rejected: num(grnLine!.rejected_qty), rejectedReturned: num(grnLine!.rejected_returned_qty) })
        if (num(line.return_qty) > paid + 1e-9) fail(`${name}: only ${paid} can be returned from stock.`)
        if (num(line.rejected_qty) > rejected + 1e-9) fail(`${name}: only ${rejected} rejected can be returned.`)
        await t.grnLines.update({ where: { id: grnLine!.id }, data: { returned_qty: { increment: num(line.return_qty) }, rejected_returned_qty: { increment: num(line.rejected_qty) }, updated_at: now } })
      }
    }
    // Rejected goods never entered saleable stock, so only return_qty leaves stock.
    await moveStock(t, account, prn!.prn_date, lines.filter(line => num(line.return_qty) > 0).map(line => ({ productId: line.product_id, variantId: line.variant_id, purchaseReturn: num(line.return_qty), name: info.get(line.variant_id)?.name ?? 'product' })))
    const number = docNumber('PRN', prn!.prn_number)
    if (prn!.debit_note_required === 1 && num(prn!.total_amount) > 0) {
      const tax = num(prn!.tax_amount), split = splitTax(tax, prn!.tax_type === 'inter' ? 'inter' : 'intra')
      const dnNumber = await nextNumber(t, clientId, 'DN')
      await t.purchaseDebitNotes.create({ data: {
        client_id: clientId, dn_number: dnNumber, dn_date: prn!.prn_date, supplier_id: prn!.supplier_id, prn_id: id, invoice_id: prn!.invoice_id,
        reason: `Goods returned on ${number} (${prn!.return_reason})`, tax_type: prn!.tax_type, taxable_amount: num(prn!.taxable_amount),
        cgst_amount: split.cgst, sgst_amount: split.sgst, igst_amount: split.igst, total_amount: num(prn!.total_amount), status: 'draft',
        created_by: account.user.id, updated_by: account.user.id, created_at: now, updated_at: now,
      } })
    } else if (prn!.debit_note_required === 1) {
      await t.purchaseReturns.update({ where: { id }, data: { status: 'completed' } })
      await t.audits.create({ data: audit(account, 'edit', `Posted purchase return ${number}`, now) })
      return 'completed'
    }
    await t.audits.create({ data: audit(account, 'edit', `Posted purchase return ${number}`, now) })
    return status
  }

  async cancelReturn(account: Account, id: bigint, reason: string) {
    const clientId = account.client.id
    return this.prisma.$transaction(async t => {
      const now = new Date()
      const prn = await t.purchaseReturns.findFirst({ where: { id, client_id: clientId } })
      if (!prn) fail('Purchase return was not found.', 404)
      const number = docNumber('PRN', prn!.prn_number)
      if (prn!.status === 'draft') {
        if (!await claimStatus(args => t.purchaseReturns.updateMany(args), id, clientId, ['draft'], { status: 'cancelled', status_reason: reason, updated_by: account.user.id, updated_at: now })) fail('This return changed. Reload and try again.', 409)
      } else {
        if (!isAdmin(account)) fail('Only an admin can cancel a posted return.', 403)
        if (await t.purchaseDebitNotes.count({ where: { client_id: clientId, prn_id: id, status: { in: POSTED_DN } } })) fail('The debit note of this return is posted. Cancel the debit note first.')
        if (await t.supplierCreditNotes.count({ where: { client_id: clientId, prn_id: id, status: 'posted' } })) fail('A supplier credit note is posted for this return. Cancel it first.')
        if (!await claimStatus(args => t.purchaseReturns.updateMany(args), id, clientId, ['pending_debit_note', 'completed'], { status: 'cancelled', status_reason: reason, updated_by: account.user.id, updated_at: now })) fail('This return changed. Reload and try again.', 409)
        await t.purchaseDebitNotes.updateMany({ where: { client_id: clientId, prn_id: id, status: 'draft' }, data: { status: 'cancelled', status_reason: 'Purchase return cancelled', updated_at: now } })
        const lines = await t.purchaseReturnLines.findMany({ where: { prn_id: id } })
        if (prn!.grn_id) {
          await t.$queryRaw(Prisma.sql`SELECT id FROM grn_lines WHERE grn_id = ${prn!.grn_id} FOR UPDATE`)
          for (const line of lines) if (line.grn_line_id) await t.grnLines.update({ where: { id: line.grn_line_id }, data: { returned_qty: { decrement: num(line.return_qty) }, rejected_returned_qty: { decrement: num(line.rejected_qty) }, updated_at: now } })
        }
        const info = await variantInfo(t, clientId, lines.map(line => line.variant_id), true)
        await moveStock(t, account, prn!.prn_date, lines.filter(line => num(line.return_qty) > 0).map(line => ({ productId: line.product_id, variantId: line.variant_id, purchaseReturn: -num(line.return_qty), name: info.get(line.variant_id)?.name ?? 'product' })))
      }
      await t.audits.create({ data: audit(account, 'delete', `Cancelled purchase return ${number}: ${reason}`, now) })
      return { id, number, status: 'cancelled' }
    })
  }

  async listReturns(clientId: bigint, filter: DocFilter) {
    const size = 50, number = searchNumber(filter.search, 'PRN')
    const where: Prisma.PurchaseReturnsWhereInput = {
      client_id: clientId, ...(filter.status ? { status: { in: filter.status.split(',') } } : {}), ...(filter.supplierId ? { supplier_id: filter.supplierId } : {}),
      ...(filter.from || filter.to ? { prn_date: { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) } } : {}),
      ...(number !== null ? { prn_number: number } : {}),
    }
    const [rows, total] = await Promise.all([this.prisma.purchaseReturns.findMany({ where, orderBy: { id: 'desc' }, skip: (filter.page - 1) * size, take: size }), this.prisma.purchaseReturns.count({ where })])
    const suppliers = await supplierNames(this.prisma, clientId, rows.map(row => row.supplier_id))
    const grns = await this.prisma.grns.findMany({ where: { id: { in: rows.flatMap(row => row.grn_id ? [row.grn_id] : []) } }, select: { id: true, grn_number: true } })
    const grnMap = new Map(grns.map(row => [row.id, row.grn_number]))
    return {
      rows: rows.map(row => ({
        id: row.id, number: docNumber('PRN', row.prn_number), date: dateText(row.prn_date), supplierId: row.supplier_id, supplierName: suppliers.get(row.supplier_id)?.supplier_name ?? '',
        grnNumber: row.grn_id && grnMap.has(row.grn_id) ? docNumber('GRN', grnMap.get(row.grn_id)!) : null, returnReason: row.return_reason, debitNoteRequired: row.debit_note_required === 1,
        status: row.status, totalQty: num(row.total_qty), totalAmount: num(row.total_amount),
      })),
      total, page: filter.page, pageSize: size,
    }
  }

  async getReturn(clientId: bigint, id: bigint) {
    const prn = await this.prisma.purchaseReturns.findFirst({ where: { id, client_id: clientId } })
    if (!prn) throw new PurchaseError(404, 'Purchase return was not found.')
    const lines = await this.prisma.purchaseReturnLines.findMany({ where: { prn_id: id }, orderBy: { line_num: 'asc' } })
    const info = await variantInfo(this.prisma, clientId, lines.map(line => line.variant_id), true)
    const supplier = await this.prisma.suppliers.findFirst({ where: { id: prn.supplier_id, client_id: clientId } })
    const grn = prn.grn_id ? await this.prisma.grns.findFirst({ where: { id: prn.grn_id } }) : null
    const invoice = prn.invoice_id ? await this.prisma.purchaseInvoices.findFirst({ where: { id: prn.invoice_id } }) : null
    const debitNotes = await this.prisma.purchaseDebitNotes.findMany({ where: { client_id: clientId, prn_id: id }, select: { id: true, dn_number: true, status: true, total_amount: true } })
    const users = await userNames(this.prisma, clientId, [prn.created_by, prn.posted_by])
    return {
      id: prn.id, number: docNumber('PRN', prn.prn_number), date: dateText(prn.prn_date), status: prn.status, statusReason: prn.status_reason,
      supplier: supplier ? { id: supplier.id, code: supplier.supplier_code, name: supplier.supplier_name, gstin: supplier.gstin } : null,
      grnId: prn.grn_id, grnNumber: grn ? docNumber('GRN', grn.grn_number) : null, invoiceId: prn.invoice_id, invoiceNumber: invoice ? docNumber('PI', invoice.invoice_number) : null,
      supplierInvoiceNo: invoice?.supplier_invoice_no ?? null, returnReason: prn.return_reason, remarks: prn.remarks, debitNoteRequired: prn.debit_note_required === 1, taxType: prn.tax_type,
      totals: { totalQty: num(prn.total_qty), taxable: num(prn.taxable_amount), tax: num(prn.tax_amount), total: num(prn.total_amount) },
      createdBy: users.get(prn.created_by) ?? '', postedBy: prn.posted_by ? users.get(prn.posted_by) ?? '' : null,
      lines: lines.map(line => ({
        id: line.id, lineNum: line.line_num, grnLineId: line.grn_line_id, ...variantView(info.get(line.variant_id)), variantId: line.variant_id,
        returnQty: num(line.return_qty), rejectedQty: num(line.rejected_qty), rate: num(line.rate), discountPercent: num(line.discount_percent), taxPercent: num(line.tax_percent),
        taxable: num(line.taxable_amount), tax: num(line.tax_amount), total: num(line.line_amount), batchNo: line.batch_no, expiryDate: dateText(line.expiry_date),
      })),
      debitNotes: debitNotes.map(row => ({ id: row.id, number: docNumber('DN', row.dn_number), status: row.status, total: num(row.total_amount) })),
    }
  }

  // ------------------------------------------------------------------ Debit notes (buyer-issued, from a PRN)

  async debitNoteAction(account: Account, id: bigint, action: DebitNoteAction, reason: string | null) {
    const clientId = account.client.id
    if ((action === 'post' || action === 'cancel') && !isAdmin(account)) fail(`Only an admin can ${action} a debit note.`, 403)
    if (action === 'cancel' && !reason) fail('Give a reason to cancel the debit note.')
    return this.prisma.$transaction(async t => {
      const now = new Date()
      const note = await t.purchaseDebitNotes.findFirst({ where: { id, client_id: clientId } })
      if (!note) fail('Debit note was not found.', 404)
      const target = debitNoteTarget(action, note!.status)
      if (!await claimStatus(args => t.purchaseDebitNotes.updateMany(args), id, clientId, [note!.status], { status: target, updated_by: account.user.id, updated_at: now, ...(action === 'post' ? { posted_by: account.user.id, posted_at: now } : {}), ...(reason ? { status_reason: reason.slice(0, 255) } : {}) })) fail('This debit note changed. Reload and try again.', 409)
      const number = docNumber('DN', note!.dn_number)
      if (action === 'post') {
        await ledgerEntry(t, account, { supplierId: note!.supplier_id, date: note!.dn_date, docType: 'debit_note', docId: id, docNumber: number, particulars: note!.reason, debit: num(note!.total_amount) })
        await adjustInvoice(t, note!.invoice_id, num(note!.total_amount))
        if (note!.prn_id) await t.purchaseReturns.updateMany({ where: { id: note!.prn_id, client_id: clientId, status: 'pending_debit_note' }, data: { status: 'completed', updated_at: now } })
      }
      if (action === 'cancel') {
        if (note!.status === 'posted') {
          await ledgerEntry(t, account, { supplierId: note!.supplier_id, date: note!.dn_date, docType: 'debit_note_cancel', docId: id, docNumber: number, particulars: `Cancelled: ${reason}`, credit: num(note!.total_amount) })
          await adjustInvoice(t, note!.invoice_id, -num(note!.total_amount))
        }
        // The return no longer waits for this note.
        if (note!.prn_id) await t.purchaseReturns.updateMany({ where: { id: note!.prn_id, client_id: clientId, status: 'pending_debit_note' }, data: { status: 'completed', status_reason: `Debit note ${number} cancelled`, updated_at: now } })
      }
      await t.audits.create({ data: audit(account, 'edit', `Debit note ${number}: ${target}${reason ? ` (${reason})` : ''}`, now) })
      return { id, number, status: target }
    })
  }

  // ------------------------------------------------------------------ Supplier credit notes (supplier-issued)

  async saveCreditNote(account: Account, id: bigint | null, input: CreditNoteInput, post: boolean) {
    const clientId = account.client.id
    return this.prisma.$transaction(async t => {
      const now = new Date()
      const supplier = await activeSupplier(t, clientId, input.supplierId)
      let note = id ? await t.supplierCreditNotes.findFirst({ where: { id, client_id: clientId } }) : null
      if (id && !note) fail('Credit note was not found.', 404)
      if (note && note.status !== 'draft') fail(`A ${note.status} credit note cannot be edited.`)
      const duplicate = await t.supplierCreditNotes.findFirst({ where: { client_id: clientId, supplier_id: input.supplierId, credit_note_no: input.creditNoteNo, status: { not: 'cancelled' }, ...(note ? { NOT: { id: note.id } } : {}) } })
      if (duplicate) fail(`Credit note ${input.creditNoteNo} of this supplier is already entered.`)
      const linked = async (found: { supplier_id: bigint } | null, what: string) => { if (!found) fail(`${what} was not found.`, 404); if (found!.supplier_id !== input.supplierId) fail(`${what} belongs to another supplier.`) }
      if (input.invoiceId) await linked(await t.purchaseInvoices.findFirst({ where: { id: input.invoiceId, client_id: clientId, status: { notIn: ['draft', 'cancelled'] } } }), 'Purchase invoice')
      if (input.grnId) await linked(await t.grns.findFirst({ where: { id: input.grnId, client_id: clientId, status: 'posted' } }), 'GRN')
      if (input.prnId) await linked(await t.purchaseReturns.findFirst({ where: { id: input.prnId, client_id: clientId, status: { notIn: ['draft', 'cancelled'] } } }), 'Purchase return')
      const taxType = await taxTypeForSupplier(t, clientId, supplier.state_id)
      const tax = round2(input.taxable * input.taxPercent / 100), split = splitTax(tax, taxType)
      const data = {
        supplier_id: input.supplierId, credit_note_no: input.creditNoteNo, credit_note_date: input.date, invoice_id: input.invoiceId, grn_id: input.grnId, prn_id: input.prnId,
        reason: input.reason, remarks: input.remarks, tax_type: taxType, taxable_amount: input.taxable, tax_percent: input.taxPercent, cgst_amount: split.cgst,
        sgst_amount: split.sgst, igst_amount: split.igst, total_amount: round2(input.taxable + tax), updated_by: account.user.id, updated_at: now,
      }
      if (note) await t.supplierCreditNotes.update({ where: { id: note.id }, data })
      else note = await t.supplierCreditNotes.create({ data: { ...data, client_id: clientId, entry_number: await nextNumber(t, clientId, 'SCN'), status: 'draft', created_by: account.user.id, created_at: now } })
      const number = docNumber('SCN', note.entry_number)
      await t.audits.create({ data: audit(account, id ? 'edit' : 'add', `${id ? 'Updated' : 'Entered'} supplier credit note ${number} (${input.creditNoteNo})`, now) })
      if (post) await this.postCreditNoteIn(t, account, note.id)
      return { id: note.id, number, status: post ? 'posted' : 'draft' }
    })
  }

  async postCreditNote(account: Account, id: bigint) {
    return this.prisma.$transaction(async t => {
      const note = await this.postCreditNoteIn(t, account, id)
      return { id, number: docNumber('SCN', note.entry_number), status: 'posted', adjustsPayable: note.adjusts_payable === 1 }
    })
  }

  // A credit note for a return whose debit note is already posted only confirms it
  // (the payable was already reduced). Otherwise it reduces the payable itself.
  private async postCreditNoteIn(t: Tx, account: Account, id: bigint) {
    const clientId = account.client.id, now = new Date()
    if (!isAdmin(account)) fail('Only an admin can post a supplier credit note.', 403)
    const note = await t.supplierCreditNotes.findFirst({ where: { id, client_id: clientId } })
    if (!note) fail('Credit note was not found.', 404)
    let adjusts = 1
    if (note!.prn_id) {
      const [prn] = await t.$queryRaw<Array<{ status: string }>>(Prisma.sql`SELECT status FROM purchase_returns WHERE id = ${note!.prn_id} FOR UPDATE`)
      if (!prn || prn.status === 'cancelled') fail('The purchase return of this credit note is cancelled.')
      const debitNote = await t.purchaseDebitNotes.findFirst({ where: { client_id: clientId, prn_id: note!.prn_id, status: { in: POSTED_DN } } })
      if (debitNote) {
        adjusts = 0
        if (debitNote.status === 'posted' || debitNote.status === 'sent') await t.purchaseDebitNotes.update({ where: { id: debitNote.id }, data: { status: 'acknowledged', supplier_credit_note_id: id, updated_at: now } })
        else await t.purchaseDebitNotes.update({ where: { id: debitNote.id }, data: { supplier_credit_note_id: id, updated_at: now } })
      } else {
        // The supplier's note settles the return instead of our debit note.
        await t.purchaseDebitNotes.updateMany({ where: { client_id: clientId, prn_id: note!.prn_id, status: 'draft' }, data: { status: 'cancelled', status_reason: 'Supplier credit note received instead', updated_at: now } })
        await t.purchaseReturns.updateMany({ where: { id: note!.prn_id, status: 'pending_debit_note' }, data: { status: 'completed', updated_at: now } })
      }
    }
    if (!await claimStatus(args => t.supplierCreditNotes.updateMany(args), id, clientId, ['draft'], { status: 'posted', adjusts_payable: adjusts, posted_by: account.user.id, posted_at: now, updated_at: now })) fail('This credit note is already posted or cancelled.', 409)
    const number = docNumber('SCN', note!.entry_number)
    if (adjusts) {
      await ledgerEntry(t, account, { supplierId: note!.supplier_id, date: note!.credit_note_date, docType: 'credit_note', docId: id, docNumber: number, particulars: `Supplier credit note ${note!.credit_note_no} (${note!.reason.replaceAll('_', ' ')})`, debit: num(note!.total_amount) })
      await adjustInvoice(t, note!.invoice_id, num(note!.total_amount))
    }
    await t.audits.create({ data: audit(account, 'edit', `Posted supplier credit note ${number}${adjusts ? '' : ' (confirms the debit note)'}`, now) })
    return { ...note!, adjusts_payable: adjusts }
  }

  async cancelCreditNote(account: Account, id: bigint, reason: string) {
    const clientId = account.client.id
    return this.prisma.$transaction(async t => {
      const now = new Date()
      const note = await t.supplierCreditNotes.findFirst({ where: { id, client_id: clientId } })
      if (!note) fail('Credit note was not found.', 404)
      if (note!.status === 'posted' && !isAdmin(account)) fail('Only an admin can cancel a posted credit note.', 403)
      if (!await claimStatus(args => t.supplierCreditNotes.updateMany(args), id, clientId, ['draft', 'posted'], { status: 'cancelled', status_reason: reason, updated_by: account.user.id, updated_at: now })) fail('This credit note is already cancelled.', 409)
      const number = docNumber('SCN', note!.entry_number)
      if (note!.status === 'posted') {
        if (note!.adjusts_payable === 1) {
          await ledgerEntry(t, account, { supplierId: note!.supplier_id, date: note!.credit_note_date, docType: 'credit_note_cancel', docId: id, docNumber: number, particulars: `Cancelled: ${reason}`, credit: num(note!.total_amount) })
          await adjustInvoice(t, note!.invoice_id, -num(note!.total_amount))
        }
        await t.purchaseDebitNotes.updateMany({ where: { client_id: clientId, supplier_credit_note_id: id }, data: { supplier_credit_note_id: null, updated_at: now } })
      }
      await t.audits.create({ data: audit(account, 'delete', `Cancelled supplier credit note ${number}: ${reason}`, now) })
      return { id, number, status: 'cancelled' }
    })
  }

  // One list for the Credit Note / Debit Note screen.
  async listNotes(clientId: bigint, filter: DocFilter & { type: 'debit' | 'credit' }) {
    const size = 50
    const dates = filter.from || filter.to ? { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) } : undefined
    if (filter.type === 'debit') {
      const number = searchNumber(filter.search, 'DN')
      const where: Prisma.PurchaseDebitNotesWhereInput = { client_id: clientId, ...(filter.status ? { status: { in: filter.status.split(',') } } : {}), ...(filter.supplierId ? { supplier_id: filter.supplierId } : {}), ...(dates ? { dn_date: dates } : {}), ...(number !== null ? { dn_number: number } : {}) }
      const [rows, total] = await Promise.all([this.prisma.purchaseDebitNotes.findMany({ where, orderBy: { id: 'desc' }, skip: (filter.page - 1) * size, take: size }), this.prisma.purchaseDebitNotes.count({ where })])
      const suppliers = await supplierNames(this.prisma, clientId, rows.map(row => row.supplier_id))
      const prns = await this.prisma.purchaseReturns.findMany({ where: { id: { in: rows.flatMap(row => row.prn_id ? [row.prn_id] : []) } }, select: { id: true, prn_number: true } })
      const prnMap = new Map(prns.map(row => [row.id, row.prn_number]))
      return { rows: rows.map(row => ({ id: row.id, type: 'debit', number: docNumber('DN', row.dn_number), date: dateText(row.dn_date), supplierId: row.supplier_id, supplierName: suppliers.get(row.supplier_id)?.supplier_name ?? '', reference: row.prn_id && prnMap.has(row.prn_id) ? docNumber('PRN', prnMap.get(row.prn_id)!) : null, reason: row.reason, status: row.status, total: num(row.total_amount) })), total, page: filter.page, pageSize: size }
    }
    const number = searchNumber(filter.search, 'SCN')
    const where: Prisma.SupplierCreditNotesWhereInput = {
      client_id: clientId, ...(filter.status ? { status: { in: filter.status.split(',') } } : {}), ...(filter.supplierId ? { supplier_id: filter.supplierId } : {}), ...(dates ? { credit_note_date: dates } : {}),
      ...(filter.search ? number !== null ? { OR: [{ entry_number: number }, { credit_note_no: { contains: filter.search } }] } : { credit_note_no: { contains: filter.search } } : {}),
    }
    const [rows, total] = await Promise.all([this.prisma.supplierCreditNotes.findMany({ where, orderBy: { id: 'desc' }, skip: (filter.page - 1) * size, take: size }), this.prisma.supplierCreditNotes.count({ where })])
    const suppliers = await supplierNames(this.prisma, clientId, rows.map(row => row.supplier_id))
    return { rows: rows.map(row => ({ id: row.id, type: 'credit', number: docNumber('SCN', row.entry_number), supplierNoteNo: row.credit_note_no, date: dateText(row.credit_note_date), supplierId: row.supplier_id, supplierName: suppliers.get(row.supplier_id)?.supplier_name ?? '', reference: null, reason: row.reason, status: row.status, adjustsPayable: row.adjusts_payable === 1, total: num(row.total_amount) })), total, page: filter.page, pageSize: size }
  }

  async getDebitNote(clientId: bigint, id: bigint) {
    const note = await this.prisma.purchaseDebitNotes.findFirst({ where: { id, client_id: clientId } })
    if (!note) throw new PurchaseError(404, 'Debit note was not found.')
    const supplier = await this.prisma.suppliers.findFirst({ where: { id: note.supplier_id, client_id: clientId } })
    const prn = note.prn_id ? await this.prisma.purchaseReturns.findFirst({ where: { id: note.prn_id } }) : null
    const invoice = note.invoice_id ? await this.prisma.purchaseInvoices.findFirst({ where: { id: note.invoice_id } }) : null
    const credit = note.supplier_credit_note_id ? await this.prisma.supplierCreditNotes.findFirst({ where: { id: note.supplier_credit_note_id } }) : null
    const lines = prn ? await this.prisma.purchaseReturnLines.findMany({ where: { prn_id: prn.id }, orderBy: { line_num: 'asc' } }) : []
    const info = await variantInfo(this.prisma, clientId, lines.map(line => line.variant_id), true)
    return {
      id: note.id, type: 'debit', number: docNumber('DN', note.dn_number), date: dateText(note.dn_date), status: note.status, statusReason: note.status_reason, reason: note.reason,
      supplier: supplier ? { id: supplier.id, code: supplier.supplier_code, name: supplier.supplier_name, gstin: supplier.gstin } : null,
      prnId: note.prn_id, prnNumber: prn ? docNumber('PRN', prn.prn_number) : null, invoiceId: note.invoice_id, invoiceNumber: invoice ? docNumber('PI', invoice.invoice_number) : null,
      supplierInvoiceNo: invoice?.supplier_invoice_no ?? null, supplierCreditNote: credit ? { id: credit.id, number: docNumber('SCN', credit.entry_number), supplierNoteNo: credit.credit_note_no } : null,
      taxType: note.tax_type, totals: { taxable: num(note.taxable_amount), cgst: num(note.cgst_amount), sgst: num(note.sgst_amount), igst: num(note.igst_amount), total: num(note.total_amount) },
      lines: lines.filter(line => num(line.return_qty) > 0).map(line => ({ ...variantView(info.get(line.variant_id)), qty: num(line.return_qty), rate: num(line.rate), taxPercent: num(line.tax_percent), taxable: num(line.taxable_amount), tax: num(line.tax_amount), total: num(line.line_amount) })),
    }
  }

  async getCreditNote(clientId: bigint, id: bigint) {
    const note = await this.prisma.supplierCreditNotes.findFirst({ where: { id, client_id: clientId } })
    if (!note) throw new PurchaseError(404, 'Credit note was not found.')
    const supplier = await this.prisma.suppliers.findFirst({ where: { id: note.supplier_id, client_id: clientId } })
    const [invoice, grn, prn] = await Promise.all([
      note.invoice_id ? this.prisma.purchaseInvoices.findFirst({ where: { id: note.invoice_id } }) : null,
      note.grn_id ? this.prisma.grns.findFirst({ where: { id: note.grn_id } }) : null,
      note.prn_id ? this.prisma.purchaseReturns.findFirst({ where: { id: note.prn_id } }) : null,
    ])
    return {
      id: note.id, type: 'credit', number: docNumber('SCN', note.entry_number), supplierNoteNo: note.credit_note_no, date: dateText(note.credit_note_date), status: note.status,
      statusReason: note.status_reason, reason: note.reason, remarks: note.remarks, adjustsPayable: note.adjusts_payable === 1,
      supplier: supplier ? { id: supplier.id, code: supplier.supplier_code, name: supplier.supplier_name, gstin: supplier.gstin } : null,
      invoiceId: note.invoice_id, invoiceNumber: invoice ? docNumber('PI', invoice.invoice_number) : null, supplierInvoiceNo: invoice?.supplier_invoice_no ?? null,
      grnId: note.grn_id, grnNumber: grn ? docNumber('GRN', grn.grn_number) : null, prnId: note.prn_id, prnNumber: prn ? docNumber('PRN', prn.prn_number) : null,
      taxType: note.tax_type, taxPercent: num(note.tax_percent),
      totals: { taxable: num(note.taxable_amount), cgst: num(note.cgst_amount), sgst: num(note.sgst_amount), igst: num(note.igst_amount), total: num(note.total_amount) },
    }
  }

  // Documents of a supplier a credit note can point at.
  async creditNoteReferences(clientId: bigint, supplierId: bigint) {
    const [invoices, grns, prns] = await Promise.all([
      this.prisma.purchaseInvoices.findMany({ where: { client_id: clientId, supplier_id: supplierId, status: { notIn: ['draft', 'cancelled'] } }, orderBy: { id: 'desc' }, take: 100, select: { id: true, invoice_number: true, supplier_invoice_no: true, net_amount: true } }),
      this.prisma.grns.findMany({ where: { client_id: clientId, supplier_id: supplierId, status: 'posted' }, orderBy: { id: 'desc' }, take: 100, select: { id: true, grn_number: true, credit_note_expected: true } }),
      this.prisma.purchaseReturns.findMany({ where: { client_id: clientId, supplier_id: supplierId, status: { notIn: ['draft', 'cancelled'] } }, orderBy: { id: 'desc' }, take: 100, select: { id: true, prn_number: true, status: true, total_amount: true } }),
    ])
    return {
      invoices: invoices.map(row => ({ id: row.id, number: docNumber('PI', row.invoice_number), supplierInvoiceNo: row.supplier_invoice_no, amount: num(row.net_amount) })),
      grns: grns.map(row => ({ id: row.id, number: docNumber('GRN', row.grn_number), creditNoteExpected: row.credit_note_expected === 1 })),
      returns: prns.map(row => ({ id: row.id, number: docNumber('PRN', row.prn_number), status: row.status, amount: num(row.total_amount) })),
    }
  }
}
