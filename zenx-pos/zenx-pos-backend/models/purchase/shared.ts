import { Prisma, type PrismaClient } from '@prisma/client'
import type { Account } from '../auth/contracts.ts'
import { zonedTime } from '../system/business-time.ts'
import { allowsNegativeInventory, decrementVariantStock, incrementVariantStock, syncProductQoh } from '../inventory/stock-policy.ts'
import { round3, taxTypeFor, type TaxType } from './calc.ts'
import { fail, invoicePaymentStatus, PurchaseError, type DocType } from './rules.ts'

export type Tx = Prisma.TransactionClient
export type Db = PrismaClient | Tx

export const num = (value: Prisma.Decimal | number | bigint | null | undefined) => value === null || value === undefined ? 0 : Number(value)
export const isAdmin = (account: Account) => account.user.isAdmin === 1
export const userId = (account: Account) => account.user.id

// @db.Date values are UTC midnight; shown as DD-MM-YYYY.
export const dateText = (value: Date | null | undefined) => value ? `${String(value.getUTCDate()).padStart(2, '0')}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${value.getUTCFullYear()}` : null

export const audit = (account: Account, type: string, description: string, now: Date) =>
  ({ client_id: account.client.id, user_id: account.user.id, type, description, created_at: now, updated_at: now })

// Next document number for this client. The counter row stays locked until the
// transaction ends, so two saves never get the same number.
export async function nextNumber(t: Tx, clientId: bigint, docType: DocType) {
  const now = new Date()
  for (let attempt = 0; ; attempt++) {
    try {
      const row = await t.purchaseSequences.upsert({
        where: { client_id_doc_type: { client_id: clientId, doc_type: docType } },
        create: { client_id: clientId, doc_type: docType, last_number: 1n, updated_at: now },
        update: { last_number: { increment: 1n }, updated_at: now },
      })
      return row.last_number
    } catch (error) {
      // Two first-ever saves raced to create the counter: the loser retries the increment.
      if (attempt === 0 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') continue
      throw error
    }
  }
}

export async function storeStateId(db: Db, clientId: bigint) {
  const client = await db.users.findFirst({ where: { id: clientId }, select: { state_id: true } })
  return client?.state_id ?? null
}

export async function activeSupplier(db: Db, clientId: bigint, supplierId: bigint) {
  const supplier = await db.suppliers.findFirst({ where: { id: supplierId, client_id: clientId, trash: 0 } })
  if (!supplier) fail('Supplier was not found.', 404)
  if (supplier!.status !== 1) fail(`${supplier!.supplier_name} is inactive.`)
  return supplier!
}

export async function taxTypeForSupplier(db: Db, clientId: bigint, supplierStateId: number | null): Promise<TaxType> {
  return taxTypeFor(await storeStateId(db, clientId), supplierStateId)
}

export type VariantInfo = {
  productId: bigint; variantId: bigint; name: string; shortName: string; productCode: string; variantCode: string
  eanCode: string | null; packSize: string; mrp: number; costPrice: number; salePrice: number; taxPercent: number; stock: number
  categoryId: bigint; subCategoryId: bigint | null; brandId: bigint | null
}

// Active variants of this client with the product's GST rate (never trusted from the app).
export async function variantInfo(db: Db, clientId: bigint, variantIds: bigint[], includeInactive = false): Promise<Map<bigint, VariantInfo>> {
  const ids = [...new Set(variantIds)]
  if (!ids.length) return new Map()
  const active = includeInactive ? {} : { status: 1, trash: 0 }
  const variants = await db.productVariants.findMany({ where: { client_id: clientId, id: { in: ids }, ...active } })
  const products = await db.products.findMany({ where: { client_id: clientId, id: { in: [...new Set(variants.map(row => row.product_id))] }, ...active } })
  const taxes = await db.taxes.findMany({ where: { client_id: clientId, id: { in: [...new Set(products.map(row => row.tax_id))] } } })
  const productMap = new Map(products.map(row => [row.id, row])), taxMap = new Map(taxes.map(row => [row.id, row.tax_percent]))
  const result = new Map<bigint, VariantInfo>()
  for (const variant of variants) {
    const product = productMap.get(variant.product_id)
    if (!product) continue
    result.set(variant.id, {
      productId: product.id, variantId: variant.id, name: product.product_full_name, shortName: product.product_short_name,
      productCode: product.product_code, variantCode: variant.variant_code, eanCode: variant.ean_code, packSize: variant.pack_size,
      mrp: variant.mrp, costPrice: variant.cost_price, salePrice: variant.sale_price, taxPercent: taxMap.get(product.tax_id) ?? 0,
      stock: variant.variant_qty, categoryId: product.category_id, subCategoryId: product.sub_category_id, brandId: product.brand_id,
    })
  }
  return result
}

export function requireVariants(map: Map<bigint, VariantInfo>, ids: bigint[]) {
  if (ids.some(id => !map.has(id))) fail('A product on this document was not found or is inactive.')
}

export type StockMove = { productId: bigint; variantId: bigint; purchase?: number; free?: number; purchaseReturn?: number; name: string }

// Posts stock for purchase documents: product_variants.variant_qty (the live stock) and
// the day's stock row (purchase / free_qty / purchase_return), as the stock reports read them.
export async function moveStock(t: Tx, account: Account, date: Date, moves: StockMove[]) {
  const clientId = account.client.id, now = new Date()
  let allowNegative: boolean | null = null
  for (const move of moves) {
    const purchase = round3(move.purchase ?? 0), free = round3(move.free ?? 0), purchaseReturn = round3(move.purchaseReturn ?? 0)
    const delta = round3(purchase + free - purchaseReturn)
    if (delta === 0 && purchase === 0 && free === 0 && purchaseReturn === 0) continue
    if (delta > 0) {
      if (!await incrementVariantStock(t, { clientId, productId: move.productId, variantId: move.variantId, quantity: delta, userId: account.user.id })) fail(`${move.name} is no longer active.`)
    } else if (delta < 0) {
      allowNegative ??= await allowsNegativeInventory(t, clientId)
      if (!await decrementVariantStock(t, { clientId, productId: move.productId, variantId: move.variantId, quantity: -delta, allowNegative, userId: account.user.id })) fail(`Not enough stock of ${move.name} for this.`)
    }
    const row = await t.stock.findFirst({ where: { client_id: clientId, stock_date: date, product_id: move.productId, variant_id: move.variantId } })
    if (row) {
      await t.stock.update({ where: { id: row.id }, data: { purchase: { increment: purchase }, free_qty: { increment: free }, purchase_return: { increment: purchaseReturn }, closeing_balance: { increment: delta }, updated_by: account.user.id, updated_at: now } })
    } else {
      const previous = await t.stock.findFirst({ where: { client_id: clientId, product_id: move.productId, variant_id: move.variantId, stock_date: { lt: date } }, orderBy: { stock_date: 'desc' } })
      const opening = num(previous?.closeing_balance)
      await t.stock.create({ data: { client_id: clientId, stock_date: date, product_id: move.productId, variant_id: move.variantId, opening_balance: opening, purchase, free_qty: free, purchase_return: purchaseReturn, closeing_balance: round3(opening + delta), created_by: account.user.id, updated_by: account.user.id, created_at: now, updated_at: now } })
    }
  }
  await syncProductQoh(t, clientId, moves.map(move => move.productId))
}

// One ledger row per document (unique), so a document can never post its money twice.
// credit = the store owes the supplier more; debit = it owes less.
export async function ledgerEntry(t: Tx, account: Account, entry: { supplierId: bigint; date: Date; docType: string; docId: bigint; docNumber: string; particulars: string; debit?: number; credit?: number }) {
  try {
    await t.supplierLedger.create({ data: {
      client_id: account.client.id, supplier_id: entry.supplierId, entry_date: entry.date, doc_type: entry.docType, doc_id: entry.docId,
      doc_number: entry.docNumber, particulars: entry.particulars.slice(0, 255), debit: entry.debit ?? 0, credit: entry.credit ?? 0,
      created_by: account.user.id, created_at: new Date(),
    } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new PurchaseError(409, `${entry.docNumber} is already posted.`)
    throw error
  }
}

// Moves a document from one status to another only if it is still in `from`; returns false
// when another request changed it first. This is what makes posting happen exactly once.
export async function claimStatus(update: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<{ count: number }>, id: bigint, clientId: bigint, from: string[], data: Record<string, unknown>) {
  const result = await update({ where: { id, client_id: clientId, status: { in: from } }, data })
  return result.count === 1
}

export async function supplierNames(db: Db, clientId: bigint, ids: bigint[]) {
  const rows = ids.length ? await db.suppliers.findMany({ where: { client_id: clientId, id: { in: [...new Set(ids)] } }, select: { id: true, supplier_name: true, supplier_code: true } }) : []
  return new Map(rows.map(row => [row.id, row]))
}

export async function userNames(db: Db, clientId: bigint, ids: (bigint | null)[]) {
  const list = [...new Set(ids.filter((id): id is bigint => id !== null))]
  const rows = list.length ? await db.clientUsers.findMany({ where: { client_id: clientId, id: { in: list } }, select: { id: true, name: true } }) : []
  return new Map(rows.map(row => [row.id, row.name ?? '']))
}

export const variantView = (info: VariantInfo | undefined) => info
  ? { productId: info.productId, variantId: info.variantId, productName: info.name, productCode: info.productCode, variantCode: info.variantCode, eanCode: info.eanCode, packSize: info.packSize }
  : { productName: 'Unknown product' }

// unpaid / partially_paid / paid from what was paid and adjusted (posted invoices only).
export async function refreshInvoiceStatus(t: Tx, invoiceId: bigint) {
  const invoice = await t.purchaseInvoices.findFirst({ where: { id: invoiceId }, select: { status: true, net_amount: true, paid_amount: true, adjusted_amount: true } })
  if (!invoice || ['draft', 'cancelled'].includes(invoice.status)) return
  const status = invoicePaymentStatus({ net: num(invoice.net_amount), paid: num(invoice.paid_amount), adjusted: num(invoice.adjusted_amount) })
  if (status !== invoice.status) await t.purchaseInvoices.update({ where: { id: invoiceId }, data: { status, updated_at: new Date() } })
}

// A debit or credit note against an invoice lowers what is owed on that invoice.
export async function adjustInvoice(t: Tx, invoiceId: bigint | null, amount: number) {
  if (!invoiceId || !amount) return
  await t.purchaseInvoices.update({ where: { id: invoiceId }, data: { adjusted_amount: { increment: amount }, updated_at: new Date() } })
  await refreshInvoiceStatus(t, invoiceId)
}

// Net sales quantity per variant in the period: sales minus refunds, voids and cancelled bills excluded.
export async function netSalesByVariant(db: Db, clientId: bigint, from: Date, to: Date, variantIds: bigint[]) {
  if (!variantIds.length) return new Map<bigint, number>()
  const start = zonedTime(from.getUTCFullYear(), from.getUTCMonth() + 1, from.getUTCDate()), end = zonedTime(to.getUTCFullYear(), to.getUTCMonth() + 1, to.getUTCDate() + 1)
  const rows = await db.$queryRaw<Array<{ variant_id: bigint; qty: Prisma.Decimal | number }>>(Prisma.sql`
    SELECT variant_id, SUM(qty) qty FROM (
      SELECT t.variant_id, SUM(CASE WHEN t.bill_mode = 3 OR COALESCE(m.refund_against_bill_num, '') <> '' OR t.qty < 0 THEN -ABS(t.qty) ELSE t.qty END) qty
        FROM bill_tran t JOIN bill_master m ON m.client_id=t.client_id AND m.bill_num=t.bill_num AND m.bill_date=t.bill_date
        WHERE t.client_id=${clientId} AND t.bill_date >= ${start} AND t.bill_date < ${end} AND t.void_flag=0 AND m.bill_mode<>5 GROUP BY t.variant_id
      UNION ALL
      SELECT t.variant_id, SUM(CASE WHEN t.bill_mode = 3 OR COALESCE(m.refund_against_bill_num, '') <> '' OR t.qty < 0 THEN -ABS(t.qty) ELSE t.qty END)
        FROM prev_bill_tran t JOIN prev_bill_master m ON m.client_id=t.client_id AND m.bill_num=t.bill_num AND m.bill_date=t.bill_date
        WHERE t.client_id=${clientId} AND t.bill_date >= ${start} AND t.bill_date < ${end} AND t.void_flag=0 AND m.bill_mode<>5 GROUP BY t.variant_id
    ) sales WHERE variant_id IN (${Prisma.join(variantIds)}) GROUP BY variant_id`)
  return new Map(rows.map(row => [row.variant_id, num(row.qty)]))
}

