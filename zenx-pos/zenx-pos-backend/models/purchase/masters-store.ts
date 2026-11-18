import { Prisma, type PrismaClient } from '@prisma/client'
import type { Account } from '../auth/contracts.ts'
import { businessCalendarDay, zonedParts } from '../system/business-time.ts'
import { averageSalesSuggestion, calendarDays, minMaxSuggestion, round3 } from './calc.ts'
import { fail, OPEN_PO_STATUSES } from './rules.ts'
import { audit, dateText, monthName, netSalesByVariant, num, supplierNames, variantInfo, type Db } from './shared.ts'

export type SupplierInput = {
  code: string; name: string; contactPerson: string | null; mobile: string; alternateMobile: string | null; email: string | null
  stateId: number | null; address: string | null; city: string | null; pincode: string | null
  gstRegistration: 'registered' | 'composition' | 'unregistered'; gstin: string | null; pan: string | null
  creditDays: number; paymentTerms: string | null; openingBalance: number; visitDay: string | null; status: number
}

export type ProductSettingInput = {
  variantId: bigint; preferredSupplierId: bigint | null; purchaseUnit: string | null; packSize: number; minStock: number; maxStock: number
  supplierMoq: number; purchaseMultiple: number; leadTimeDays: number; safetyStock: number; autoPoEnabled: number; purchaseRate: number
}

export type AutoPoInput = {
  method: 'avg_sales' | 'mbq'; supplierId: bigint | null; fromDate: Date | null; toDate: Date | null; coverageDays: number
  leadTimeDays: number | null; includePendingPo: boolean; includePendingGrn: boolean
  categoryId: bigint | null; subCategoryId: bigint | null; brandId: bigint | null; productId: bigint | null
}

const supplierRow = (row: Prisma.SuppliersGetPayload<object>, outstanding: number, stateName: string | null) => ({
  id: row.id, code: row.supplier_code, name: row.supplier_name, contactPerson: row.contact_person, mobile: row.mobile,
  alternateMobile: row.alternate_mobile, email: row.email, stateId: row.state_id, stateName, address: row.address, city: row.city,
  pincode: row.pincode, gstRegistration: row.gst_registration, gstin: row.gstin, pan: row.pan, creditDays: row.credit_days,
  paymentTerms: row.payment_terms, openingBalance: num(row.opening_balance), visitDay: row.visit_day, status: row.status, outstanding,
})

export class PurchaseMastersStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  async states() {
    const rows = await this.prisma.states.findMany({ where: { status: 1, trash: 0 }, orderBy: { state_name: 'asc' }, select: { id: true, state_name: true } })
    return rows.map(row => ({ id: Number(row.id), name: row.state_name }))
  }

  // Outstanding = opening balance + invoices − debit/credit notes (and later payments), from the ledger.
  async outstanding(db: Db, clientId: bigint, supplierIds: bigint[]) {
    if (!supplierIds.length) return new Map<bigint, number>()
    const sums = await db.supplierLedger.groupBy({ by: ['supplier_id'], where: { client_id: clientId, supplier_id: { in: supplierIds } }, _sum: { credit: true, debit: true } })
    return new Map(sums.map(row => [row.supplier_id, num(row._sum.credit) - num(row._sum.debit)]))
  }

  async listSuppliers(clientId: bigint, filter: { search: string; status: number | null; page: number }) {
    const size = 50
    const where: Prisma.SuppliersWhereInput = {
      client_id: clientId, trash: 0, ...(filter.status === null ? {} : { status: filter.status }),
      ...(filter.search ? { OR: [{ supplier_name: { contains: filter.search } }, { supplier_code: { contains: filter.search } }, { mobile: { contains: filter.search } }, { gstin: { contains: filter.search } }] } : {}),
    }
    const [rows, total] = await Promise.all([
      this.prisma.suppliers.findMany({ where, orderBy: { supplier_name: 'asc' }, skip: (filter.page - 1) * size, take: size }),
      this.prisma.suppliers.count({ where }),
    ])
    const balances = await this.outstanding(this.prisma, clientId, rows.map(row => row.id))
    const states = await this.stateNames(rows.map(row => row.state_id))
    return { rows: rows.map(row => supplierRow(row, Math.round((num(row.opening_balance) + (balances.get(row.id) ?? 0)) * 100) / 100, states.get(row.state_id ?? 0) ?? null)), total, page: filter.page, pageSize: size }
  }

  private async stateNames(ids: (number | null)[]) {
    const list = [...new Set(ids.filter((id): id is number => !!id))].map(BigInt)
    const rows = list.length ? await this.prisma.states.findMany({ where: { id: { in: list } }, select: { id: true, state_name: true } }) : []
    return new Map(rows.map(row => [Number(row.id), row.state_name]))
  }

  async getSupplier(clientId: bigint, id: bigint) {
    const row = await this.prisma.suppliers.findFirst({ where: { id, client_id: clientId, trash: 0 } })
    if (!row) fail('Supplier was not found.', 404)
    const balance = (await this.outstanding(this.prisma, clientId, [id])).get(id) ?? 0
    const states = await this.stateNames([row!.state_id])
    return supplierRow(row!, Math.round((num(row!.opening_balance) + balance) * 100) / 100, states.get(row!.state_id ?? 0) ?? null)
  }

  async saveSupplier(account: Account, id: bigint | null, input: SupplierInput) {
    const clientId = account.client.id, now = new Date()
    if (input.stateId && !await this.prisma.states.findFirst({ where: { id: BigInt(input.stateId), trash: 0 } })) fail('Select a valid state.')
    return this.prisma.$transaction(async t => {
      const clash = await t.suppliers.findFirst({ where: { client_id: clientId, supplier_code: input.code, trash: 0, ...(id ? { NOT: { id } } : {}) } })
      if (clash) fail(`Supplier code ${input.code} is already used by ${clash.supplier_name}.`)
      if (input.gstin) {
        const sameGstin = await t.suppliers.findFirst({ where: { client_id: clientId, gstin: input.gstin, trash: 0, ...(id ? { NOT: { id } } : {}) } })
        if (sameGstin) fail(`GST No ${input.gstin} is already used by ${sameGstin.supplier_name}.`)
      }
      const data = {
        supplier_code: input.code, supplier_name: input.name, contact_person: input.contactPerson, mobile: input.mobile, alternate_mobile: input.alternateMobile,
        email: input.email, state_id: input.stateId, address: input.address, city: input.city, pincode: input.pincode, gst_registration: input.gstRegistration,
        gstin: input.gstin, pan: input.pan, credit_days: input.creditDays, payment_terms: input.paymentTerms, opening_balance: input.openingBalance,
        visit_day: input.visitDay, status: input.status, updated_by: account.user.id, updated_at: now,
      }
      if (id) {
        const existing = await t.suppliers.findFirst({ where: { id, client_id: clientId, trash: 0 } })
        if (!existing) fail('Supplier was not found.', 404)
        // The opening balance is the start of the ledger; once documents are posted it stays.
        if (num(existing!.opening_balance) !== input.openingBalance && await t.supplierLedger.count({ where: { client_id: clientId, supplier_id: id } })) fail('The opening balance cannot change after invoices or notes are posted for this supplier.')
        await t.suppliers.update({ where: { id }, data })
        await t.audits.create({ data: audit(account, 'edit', `Updated supplier ${input.code}`, now) })
        return id
      }
      const created = await t.suppliers.create({ data: { ...data, client_id: clientId, created_by: account.user.id, created_at: now } })
      await t.audits.create({ data: audit(account, 'add', `Created supplier ${input.code}`, now) })
      return created.id
    })
  }

  // Codes and GST numbers already used by this client's suppliers (case-insensitive).
  async takenSupplierKeys(clientId: bigint, codes: string[], gstins: string[]) {
    const rows = await this.prisma.suppliers.findMany({
      where: { client_id: clientId, trash: 0, OR: [{ supplier_code: { in: codes.length ? codes : ['\u0000'] } }, { gstin: { in: gstins.length ? gstins : ['\u0000'] } }] },
      select: { supplier_code: true, gstin: true, supplier_name: true },
    })
    return {
      codes: new Map(rows.map(row => [row.supplier_code.toLowerCase(), row.supplier_name])),
      gstins: new Map(rows.flatMap(row => (row.gstin ? [[row.gstin.toUpperCase(), row.supplier_name] as const] : []))),
    }
  }

  // Creates many suppliers at once (already validated); all or nothing.
  async importSuppliers(account: Account, inputs: SupplierInput[]) {
    const clientId = account.client.id, now = new Date()
    return this.prisma.$transaction(async t => {
      const taken = await t.suppliers.findFirst({ where: { client_id: clientId, trash: 0, OR: [{ supplier_code: { in: inputs.map(input => input.code) } }, { gstin: { in: inputs.flatMap(input => (input.gstin ? [input.gstin] : [])) } }] } })
      if (taken) fail(`Supplier ${taken.supplier_code} (${taken.supplier_name}) already exists. Check the file again.`)
      await t.suppliers.createMany({ data: inputs.map(input => ({
        client_id: clientId, supplier_code: input.code, supplier_name: input.name, contact_person: input.contactPerson, mobile: input.mobile, alternate_mobile: input.alternateMobile,
        email: input.email, state_id: input.stateId, address: input.address, city: input.city, pincode: input.pincode, gst_registration: input.gstRegistration,
        gstin: input.gstin, pan: input.pan, credit_days: input.creditDays, payment_terms: input.paymentTerms, opening_balance: input.openingBalance, visit_day: input.visitDay,
        status: input.status, created_by: account.user.id, updated_by: account.user.id, created_at: now, updated_at: now,
      })) })
      await t.audits.create({ data: audit(account, 'add', `Imported ${inputs.length} supplier(s) from a spreadsheet`, now) })
      return inputs.length
    })
  }

  // Suppliers for pickers: active only, small payload.
  async supplierOptions(clientId: bigint) {
    const rows = await this.prisma.suppliers.findMany({ where: { client_id: clientId, trash: 0, status: 1 }, orderBy: { supplier_name: 'asc' }, select: { id: true, supplier_code: true, supplier_name: true, credit_days: true, payment_terms: true, state_id: true, gstin: true } })
    return rows.map(row => ({ id: row.id, code: row.supplier_code, name: row.supplier_name, creditDays: row.credit_days, paymentTerms: row.payment_terms, stateId: row.state_id, gstin: row.gstin }))
  }

  // Default purchase rate: the last rate from this supplier, else the negotiated rate, else the product cost.
  async defaultRates(db: Db, clientId: bigint, variantIds: bigint[], supplierId: bigint | null) {
    const settings = variantIds.length ? await db.productPurchaseSettings.findMany({ where: { client_id: clientId, variant_id: { in: variantIds } } }) : []
    const map = new Map(settings.map(row => [row.variant_id, row]))
    return (variantId: bigint, costPrice: number) => {
      const setting = map.get(variantId)
      if (setting && supplierId && setting.last_supplier_id === supplierId && num(setting.last_purchase_rate) > 0) return num(setting.last_purchase_rate)
      if (setting && num(setting.purchase_rate) > 0) return num(setting.purchase_rate)
      return costPrice
    }
  }

  async lookupProducts(clientId: bigint, filter: { search: string; supplierId: bigint | null; variantIds: bigint[] }) {
    let ids = filter.variantIds
    if (!ids.length) {
      if (!filter.search) return []
      const search = filter.search
      const byVariant = await this.prisma.productVariants.findMany({ where: { client_id: clientId, status: 1, trash: 0, OR: [{ ean_code: search }, { variant_code: { contains: search } }] }, select: { id: true }, take: 30 })
      const products = await this.prisma.products.findMany({ where: { client_id: clientId, status: 1, trash: 0, OR: [{ product_full_name: { contains: search } }, { product_short_name: { contains: search } }, { product_code: { contains: search } }] }, select: { id: true }, take: 30 })
      const byProduct = products.length ? await this.prisma.productVariants.findMany({ where: { client_id: clientId, status: 1, trash: 0, product_id: { in: products.map(row => row.id) } }, select: { id: true }, take: 60 }) : []
      ids = [...new Set([...byVariant, ...byProduct].map(row => row.id))].slice(0, 60)
    }
    const info = await variantInfo(this.prisma, clientId, ids)
    const rate = await this.defaultRates(this.prisma, clientId, ids, filter.supplierId)
    const settings = await this.prisma.productPurchaseSettings.findMany({ where: { client_id: clientId, variant_id: { in: ids } } })
    const settingMap = new Map(settings.map(row => [row.variant_id, row]))
    return [...info.values()].map(row => {
      const setting = settingMap.get(row.variantId)
      return {
        productId: row.productId, variantId: row.variantId, productName: row.name, productCode: row.productCode, variantCode: row.variantCode,
        eanCode: row.eanCode, packSize: row.packSize, mrp: row.mrp, costPrice: row.costPrice, taxPercent: row.taxPercent, stock: row.stock,
        rate: rate(row.variantId, row.costPrice), purchaseUnit: setting?.purchase_unit ?? null, minStock: num(setting?.min_stock), maxStock: num(setting?.max_stock),
        preferredSupplierId: setting?.preferred_supplier_id ?? null,
      }
    })
  }

  async listProductSettings(clientId: bigint, filter: { search: string; supplierId: bigint | null; page: number }) {
    const size = 50
    const productWhere: Prisma.ProductsWhereInput = { client_id: clientId, trash: 0, ...(filter.search ? { OR: [{ product_full_name: { contains: filter.search } }, { product_code: { contains: filter.search } }] } : {}) }
    let variantFilter: Prisma.ProductVariantsWhereInput = {}
    if (filter.supplierId) {
      const linked = await this.prisma.productPurchaseSettings.findMany({ where: { client_id: clientId, preferred_supplier_id: filter.supplierId }, select: { variant_id: true } })
      variantFilter = { id: { in: linked.map(row => row.variant_id) } }
    }
    const products = await this.prisma.products.findMany({ where: productWhere, select: { id: true }, orderBy: { product_full_name: 'asc' }, take: 2000 })
    const where: Prisma.ProductVariantsWhereInput = { client_id: clientId, trash: 0, product_id: { in: products.map(row => row.id) }, ...variantFilter }
    const [variants, total] = await Promise.all([
      this.prisma.productVariants.findMany({ where, select: { id: true }, orderBy: [{ product_id: 'asc' }, { id: 'asc' }], skip: (filter.page - 1) * size, take: size }),
      this.prisma.productVariants.count({ where }),
    ])
    const ids = variants.map(row => row.id)
    const info = await variantInfo(this.prisma, clientId, ids, true)
    const settings = await this.prisma.productPurchaseSettings.findMany({ where: { client_id: clientId, variant_id: { in: ids } } })
    const map = new Map(settings.map(row => [row.variant_id, row]))
    const suppliers = await supplierNames(this.prisma, clientId, settings.flatMap(row => [row.preferred_supplier_id, row.last_supplier_id].filter((id): id is bigint => id !== null)))
    const rows = ids.flatMap(id => {
      const product = info.get(id)
      if (!product) return []
      const s = map.get(id)
      return [{
        productId: product.productId, variantId: id, productName: product.name, productCode: product.productCode, variantCode: product.variantCode, packSizeLabel: product.packSize,
        stock: product.stock, preferredSupplierId: s?.preferred_supplier_id ?? null, preferredSupplierName: s?.preferred_supplier_id ? suppliers.get(s.preferred_supplier_id)?.supplier_name ?? null : null,
        purchaseUnit: s?.purchase_unit ?? null, packSize: s ? num(s.pack_size) : 1, minStock: num(s?.min_stock), maxStock: num(s?.max_stock), supplierMoq: num(s?.supplier_moq),
        purchaseMultiple: num(s?.purchase_multiple), leadTimeDays: s?.lead_time_days ?? 0, safetyStock: num(s?.safety_stock), autoPoEnabled: s ? s.auto_po_enabled : 1,
        purchaseRate: num(s?.purchase_rate), lastPurchaseDate: dateText(s?.last_purchase_date), lastPurchaseRate: s?.last_purchase_rate === null || s?.last_purchase_rate === undefined ? null : num(s.last_purchase_rate),
        lastSupplierName: s?.last_supplier_id ? suppliers.get(s.last_supplier_id)?.supplier_name ?? null : null, avgPurchaseRate: num(s?.avg_purchase_rate),
      }]
    })
    return { rows, total, page: filter.page, pageSize: size }
  }

  async saveProductSettings(account: Account, inputs: ProductSettingInput[]) {
    const clientId = account.client.id, now = new Date()
    const info = await variantInfo(this.prisma, clientId, inputs.map(row => row.variantId), true)
    if (inputs.some(row => !info.has(row.variantId))) fail('A product was not found.')
    const supplierIds = [...new Set(inputs.flatMap(row => row.preferredSupplierId ? [row.preferredSupplierId] : []))]
    if (supplierIds.length && await this.prisma.suppliers.count({ where: { client_id: clientId, trash: 0, id: { in: supplierIds } } }) !== supplierIds.length) fail('Preferred supplier was not found.')
    await this.prisma.$transaction(async t => {
      for (const row of inputs) {
        const data = {
          preferred_supplier_id: row.preferredSupplierId, purchase_unit: row.purchaseUnit, pack_size: row.packSize, min_stock: row.minStock, max_stock: row.maxStock,
          supplier_moq: row.supplierMoq, purchase_multiple: row.purchaseMultiple, lead_time_days: row.leadTimeDays, safety_stock: row.safetyStock,
          auto_po_enabled: row.autoPoEnabled, purchase_rate: row.purchaseRate, updated_by: account.user.id, updated_at: now,
        }
        await t.productPurchaseSettings.upsert({
          where: { client_id_variant_id: { client_id: clientId, variant_id: row.variantId } },
          create: { ...data, client_id: clientId, product_id: info.get(row.variantId)!.productId, variant_id: row.variantId, created_by: account.user.id, created_at: now },
          update: data,
        })
      }
      await t.audits.create({ data: audit(account, 'edit', `Updated purchase settings for ${inputs.length} product(s)`, now) })
    })
    return inputs.length
  }

  // Quantity still to arrive per variant on open POs (drafts included).
  async pendingPo(db: Db, clientId: bigint, variantIds?: bigint[]) {
    const orders = await db.purchaseOrders.findMany({ where: { client_id: clientId, status: { in: OPEN_PO_STATUSES } }, select: { id: true } })
    if (!orders.length) return new Map<bigint, number>()
    const lines = await db.purchaseOrderLines.findMany({ where: { client_id: clientId, po_id: { in: orders.map(row => row.id) }, ...(variantIds ? { variant_id: { in: variantIds } } : {}) }, select: { variant_id: true, ordered_qty: true, received_qty: true, cancelled_qty: true } })
    const map = new Map<bigint, number>()
    for (const line of lines) map.set(line.variant_id, round3((map.get(line.variant_id) ?? 0) + Math.max(num(line.ordered_qty) - num(line.received_qty) - num(line.cancelled_qty), 0)))
    return map
  }

  // Goods on GRNs not yet posted and not against a PO (PO receipts are already in Pending PO).
  async pendingGrn(db: Db, clientId: bigint, variantIds?: bigint[]) {
    const drafts = await db.grns.findMany({ where: { client_id: clientId, status: 'draft' }, select: { id: true } })
    if (!drafts.length) return new Map<bigint, number>()
    const lines = await db.grnLines.findMany({ where: { client_id: clientId, grn_id: { in: drafts.map(row => row.id) }, po_line_id: null, ...(variantIds ? { variant_id: { in: variantIds } } : {}) }, select: { variant_id: true, accepted_qty: true, free_qty: true } })
    const map = new Map<bigint, number>()
    for (const line of lines) map.set(line.variant_id, round3((map.get(line.variant_id) ?? 0) + num(line.accepted_qty) + num(line.free_qty)))
    return map
  }

  async dashboard(clientId: bigint) {
    const now = new Date(), { year, month } = zonedParts(now)
    const monthStart = new Date(Date.UTC(Number(year), Number(month) - 1, 1)), today = businessCalendarDay(now)
    const count = (model: { count: (args: { where: object }) => Promise<number> }, where: object) => model.count({ where: { client_id: clientId, ...where } })
    const [poPending, poOpen, grnDraft, invoiceDraft, prnPending, dnOpen, monthInvoices] = await Promise.all([
      // Waiting for an admin to approve (drafts and anything still marked pending).
      count(this.prisma.purchaseOrders, { status: { in: ['draft', 'pending_approval'] } }),
      count(this.prisma.purchaseOrders, { status: { in: ['approved', 'partially_received'] } }),
      count(this.prisma.grns, { status: 'draft' }),
      count(this.prisma.purchaseInvoices, { status: 'draft' }),
      count(this.prisma.purchaseReturns, { status: 'pending_debit_note' }),
      count(this.prisma.purchaseDebitNotes, { status: { in: ['draft', 'posted', 'sent'] } }),
      this.prisma.purchaseInvoices.aggregate({ where: { client_id: clientId, status: { notIn: ['draft', 'cancelled'] }, invoice_date: { gte: monthStart, lte: today } }, _sum: { net_amount: true }, _count: true }),
    ])
    // Posted GRNs with goods not yet invoiced.
    const pendingInvoice = await this.prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(DISTINCT g.id) count FROM grns g JOIN grn_lines l ON l.grn_id = g.id
      WHERE g.client_id = ${clientId} AND g.status = 'posted' AND l.accepted_qty > l.invoiced_qty`)
    // Reorder watch: Net Stock shown here = Available Stock (what is on the shelf now).
    const settings = await this.prisma.productPurchaseSettings.findMany({ where: { client_id: clientId, min_stock: { gt: 0 }, auto_po_enabled: 1 } })
    const info = await variantInfo(this.prisma, clientId, settings.map(row => row.variant_id))
    const pending = await this.pendingPo(this.prisma, clientId, settings.map(row => row.variant_id))
    const suppliers = await supplierNames(this.prisma, clientId, settings.flatMap(row => row.preferred_supplier_id ? [row.preferred_supplier_id] : []))
    const lowStock = settings.flatMap(row => {
      const product = info.get(row.variant_id)
      if (!product || product.stock >= num(row.min_stock)) return []
      return [{ variantId: row.variant_id, productName: product.name, productCode: product.productCode, packSize: product.packSize, netStock: round3(product.stock), minStock: num(row.min_stock), maxStock: num(row.max_stock), pendingPo: pending.get(row.variant_id) ?? 0, supplierName: row.preferred_supplier_id ? suppliers.get(row.preferred_supplier_id)?.supplier_name ?? null : null }]
    }).sort((a, b) => (a.netStock - a.minStock) - (b.netStock - b.minStock)).slice(0, 50)
    return {
      charts: await this.dashboardCharts(clientId, today),
      cards: { poPendingApproval: poPending, poOpen, grnDraft, grnPendingInvoice: Number(pendingInvoice[0]?.count ?? 0), invoiceDraft, prnPendingDebitNote: prnPending, debitNotesOpen: dnOpen, monthPurchaseAmount: num(monthInvoices._sum.net_amount), monthInvoiceCount: monthInvoices._count },
      lowStock, lowStockTotal: settings.filter(row => (info.get(row.variant_id)?.stock ?? Infinity) < num(row.min_stock)).length,
    }
  }

  // Chart data for the purchase dashboard. Months are calendar months of the store (po_date and
  // invoice_date are store calendar days).
  private async dashboardCharts(clientId: bigint, today: Date) {
    const LIVE_PO = { notIn: ['draft', 'cancelled'] }
    const months = Array.from({ length: 6 }, (_v, i) => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5 + i, 1)))
    const monthKey = (date: Date) => `${date.getUTCFullYear()}-${date.getUTCMonth()}`
    const since90 = new Date(today.getTime() - 89 * 86_400_000)
    const [byStatus, orders, invoices, topSuppliers, settings] = await Promise.all([
      this.prisma.purchaseOrders.groupBy({ by: ['status'], where: { client_id: clientId }, _count: true, _sum: { net_amount: true } }),
      this.prisma.purchaseOrders.findMany({ where: { client_id: clientId, status: LIVE_PO, po_date: { gte: months[0]!, lte: today } }, select: { po_date: true, net_amount: true } }),
      this.prisma.purchaseInvoices.findMany({ where: { client_id: clientId, status: LIVE_PO, invoice_date: { gte: months[0]!, lte: today } }, select: { invoice_date: true, net_amount: true } }),
      this.prisma.purchaseOrders.groupBy({ by: ['supplier_id'], where: { client_id: clientId, status: LIVE_PO, po_date: { gte: since90, lte: today } }, _sum: { net_amount: true }, _count: true, orderBy: { _sum: { net_amount: 'desc' } }, take: 5 }),
      this.prisma.productPurchaseSettings.findMany({ where: { client_id: clientId, auto_po_enabled: 1, OR: [{ min_stock: { gt: 0 } }, { max_stock: { gt: 0 } }] }, select: { variant_id: true, min_stock: true, max_stock: true } }),
    ])
    const ordered = new Map<string, number>(), invoiced = new Map<string, number>()
    for (const row of orders) ordered.set(monthKey(row.po_date), (ordered.get(monthKey(row.po_date)) ?? 0) + num(row.net_amount))
    for (const row of invoices) invoiced.set(monthKey(row.invoice_date), (invoiced.get(monthKey(row.invoice_date)) ?? 0) + num(row.net_amount))
    const names = await supplierNames(this.prisma, clientId, topSuppliers.map(row => row.supplier_id))
    const info = await variantInfo(this.prisma, clientId, settings.map(row => row.variant_id))
    const health = { below: 0, healthy: 0, over: 0 }
    for (const row of settings) {
      const stock = info.get(row.variant_id)?.stock
      if (stock === undefined) continue
      if (num(row.min_stock) > 0 && stock < num(row.min_stock)) health.below++
      else if (num(row.max_stock) > 0 && stock > num(row.max_stock)) health.over++
      else health.healthy++
    }
    const round = (value: number) => Math.round(value * 100) / 100
    return {
      poStatus: byStatus.map(row => ({ status: row.status, count: row._count, amount: num(row._sum.net_amount) })).sort((a, b) => b.count - a.count),
      monthly: months.map(date => ({ month: monthName(date), year: date.getUTCFullYear(), ordered: round(ordered.get(monthKey(date)) ?? 0), invoiced: round(invoiced.get(monthKey(date)) ?? 0) })),
      topSuppliers: topSuppliers.map(row => ({ supplierId: row.supplier_id, name: names.get(row.supplier_id)?.supplier_name ?? '', amount: num(row._sum.net_amount), orders: row._count })),
      stockHealth: health,
    }
  }

  // Auto PO grid. Stock is today's available stock (server clock, store zone).
  async autoPoSuggestions(clientId: bigint, input: AutoPoInput) {
    const productWhere: Prisma.ProductsWhereInput = {
      client_id: clientId, status: 1, trash: 0, ...(input.categoryId ? { category_id: input.categoryId } : {}), ...(input.subCategoryId ? { sub_category_id: input.subCategoryId } : {}),
      ...(input.brandId ? { brand_id: input.brandId } : {}), ...(input.productId ? { id: input.productId } : {}),
    }
    const products = await this.prisma.products.findMany({ where: productWhere, select: { id: true }, take: 5000 })
    const variants = products.length ? await this.prisma.productVariants.findMany({ where: { client_id: clientId, status: 1, trash: 0, product_id: { in: products.map(row => row.id) } }, select: { id: true }, take: 5000 }) : []
    const settings = await this.prisma.productPurchaseSettings.findMany({ where: { client_id: clientId, variant_id: { in: variants.map(row => row.id) } } })
    const settingMap = new Map(settings.map(row => [row.variant_id, row]))
    // Products switched off for Auto PO, or tied to another supplier, are left out.
    let candidates = variants.map(row => row.id).filter(id => {
      const s = settingMap.get(id)
      if (s && s.auto_po_enabled !== 1) return false
      if (input.supplierId && s?.preferred_supplier_id && s.preferred_supplier_id !== input.supplierId) return false
      if (input.method === 'mbq') return !!s && num(s.min_stock) > 0
      return true
    })
    const days = input.method === 'avg_sales' ? calendarDays(input.fromDate!, input.toDate!) : 0
    const sales = input.method === 'avg_sales' ? await netSalesByVariant(this.prisma, clientId, input.fromDate!, input.toDate!, candidates) : new Map<bigint, number>()
    // With no settings, average-sales only looks at products that actually sold.
    if (input.method === 'avg_sales') candidates = candidates.filter(id => settingMap.has(id) || (sales.get(id) ?? 0) > 0)
    const info = await variantInfo(this.prisma, clientId, candidates)
    const pendingPo = input.includePendingPo ? await this.pendingPo(this.prisma, clientId, candidates) : new Map<bigint, number>()
    const pendingGrn = input.includePendingGrn ? await this.pendingGrn(this.prisma, clientId, candidates) : new Map<bigint, number>()
    const suppliers = await supplierNames(this.prisma, clientId, [...settings.flatMap(row => row.preferred_supplier_id ? [row.preferred_supplier_id] : []), ...(input.supplierId ? [input.supplierId] : [])])
    const rateFor = async (supplierId: bigint | null) => this.defaultRates(this.prisma, clientId, candidates, supplierId)
    const rateCache = new Map<string, Awaited<ReturnType<typeof rateFor>>>()
    const rows = []
    for (const id of candidates) {
      const product = info.get(id)
      if (!product) continue
      const s = settingMap.get(id)
      const supplierId = s?.preferred_supplier_id ?? input.supplierId ?? null
      const rules = { purchaseMultiple: num(s?.purchase_multiple), supplierMoq: num(s?.supplier_moq) }
      const common = { available: round3(product.stock), pendingPo: pendingPo.get(id) ?? 0, pendingGrn: pendingGrn.get(id) ?? 0 }
      const result = input.method === 'avg_sales'
        ? averageSalesSuggestion({ ...rules, ...common, netSalesQty: sales.get(id) ?? 0, days, coverageDays: input.coverageDays, leadTimeDays: input.leadTimeDays ?? s?.lead_time_days ?? 0, safetyStock: num(s?.safety_stock) })
        : minMaxSuggestion({ ...rules, ...common, minStock: num(s?.min_stock), maxStock: num(s?.max_stock) })
      const key = String(supplierId ?? '')
      if (!rateCache.has(key)) rateCache.set(key, await rateFor(supplierId))
      const rate = rateCache.get(key)!(id, product.costPrice)
      rows.push({
        variantId: id, productId: product.productId, productName: product.name, productCode: product.productCode, variantCode: product.variantCode, packSize: product.packSize,
        supplierId, supplierName: supplierId ? suppliers.get(supplierId)?.supplier_name ?? null : null, purchaseUnit: s?.purchase_unit ?? null, unitPackSize: s ? num(s.pack_size) : 1,
        salesQty: round3(sales.get(id) ?? 0), avgDailySales: 'avgDaily' in result ? result.avgDaily : null, ...common, minStock: num(s?.min_stock), maxStock: num(s?.max_stock),
        supplierMoq: rules.supplierMoq, purchaseMultiple: rules.purchaseMultiple, coverageDays: input.method === 'avg_sales' ? input.coverageDays : null,
        netStock: result.netStock, suggestedQty: result.suggestedQty, purchaseQty: result.suggestedQty, rate, amount: Math.round(result.suggestedQty * rate * 100) / 100,
        taxPercent: product.taxPercent, reason: result.reason, selected: result.suggestedQty > 0 && !!supplierId,
      })
    }
    rows.sort((a, b) => b.suggestedQty - a.suggestedQty || a.productName.localeCompare(b.productName))
    return { method: input.method, days, stockAsOn: dateText(businessCalendarDay()), rows: rows.slice(0, 1000), truncated: rows.length > 1000 }
  }
}
