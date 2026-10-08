import type { Prisma, PrismaClient } from '@prisma/client'
import type { Account } from '../auth/contracts.ts'
import type { DiscountListFilter, DiscountResult, DiscountStore, GroupDiscountInput, GroupDiscountRow } from './contracts.ts'
import { PrismaItemDiscountStore } from './item-store.ts'
import { PrismaPurchaseDiscountStore } from './purchase-store.ts'
import { PrismaBillBusterStore } from './bill-buster-store.ts'
const names = ['', 'Category', 'Sub Category', 'Brand', 'Colour', 'Size']
export class PrismaDiscountStore extends PrismaItemDiscountStore implements DiscountStore {
  private readonly purchase: PrismaPurchaseDiscountStore
  private readonly billBuster: PrismaBillBusterStore
  constructor(prisma: PrismaClient) { super(prisma); this.purchase = new PrismaPurchaseDiscountStore(prisma); this.billBuster = new PrismaBillBusterStore(prisma) }
  createPurchase(...args: Parameters<PrismaPurchaseDiscountStore['createPurchase']>) { return this.purchase.createPurchase(...args) }
  updatePurchase(...args: Parameters<PrismaPurchaseDiscountStore['updatePurchase']>) { return this.purchase.updatePurchase(...args) }
  getPurchase(...args: Parameters<PrismaPurchaseDiscountStore['getPurchase']>) { return this.purchase.getPurchase(...args) }
  searchPurchases(...args: Parameters<PrismaPurchaseDiscountStore['searchPurchases']>) { return this.purchase.searchPurchases(...args) }
  listPurchases(...args: Parameters<PrismaPurchaseDiscountStore['listPurchases']>) { return this.purchase.listPurchases(...args) }
  deletePurchaseChild(...args: Parameters<PrismaPurchaseDiscountStore['deletePurchaseChild']>) { return this.purchase.deletePurchaseChild(...args) }
  createBillBuster(...args: Parameters<PrismaBillBusterStore['createBillBuster']>) { return this.billBuster.createBillBuster(...args) }
  updateBillBuster(...args: Parameters<PrismaBillBusterStore['updateBillBuster']>) { return this.billBuster.updateBillBuster(...args) }
  getBillBuster(...args: Parameters<PrismaBillBusterStore['getBillBuster']>) { return this.billBuster.getBillBuster(...args) }
  listBillBusters(...args: Parameters<PrismaBillBusterStore['listBillBusters']>) { return this.billBuster.listBillBusters(...args) }
  deleteBillBusterChild(...args: Parameters<PrismaBillBusterStore['deleteBillBusterChild']>) { return this.billBuster.deleteBillBusterChild(...args) }
  private async group(tx: Prisma.TransactionClient | PrismaClient, clientId: bigint, type: number, id: bigint) {
    const where = { id, client_id: clientId, status: 1, trash: 0 }
    if (type === 1) { const row = await tx.categories.findFirst({ where }); return row ? { name: row.category_name, code: row.category_code } : null }
    if (type === 2) { const row = await tx.subCategories.findFirst({ where }); return row ? { name: row.sub_category_name, code: row.sub_category_code } : null }
    if (type === 3) { const row = await tx.brands.findFirst({ where }); return row ? { name: row.brand_name, code: row.brand_code } : null }
    if (type === 4) { const row = await tx.colours.findFirst({ where }); return row ? { name: row.colour_name, code: row.colour_code } : null }
    const row = await tx.sizes.findFirst({ where }); return row ? { name: row.size_name, code: row.size_code } : null
  }
  async createGroup(account: Account, value: GroupDiscountInput): Promise<DiscountResult> { return this.prisma.$transaction(async tx => { const group = await this.group(tx, account.client.id, value.groupType, value.groupId); if (!group) return 'group_missing'; if (await tx.groupWiseDiscounts.findFirst({ where: { client_id: account.client.id, group_type: value.groupType, group_id: value.groupId, from_date: { lte: value.toDate }, to_date: { gte: value.fromDate } } })) return 'overlap'; const now = new Date(); await tx.groupWiseDiscounts.create({ data: { client_id: account.client.id, group_type: value.groupType, group_id: value.groupId, discount: value.discount, from_date: value.fromDate, to_date: value.toDate, status: value.status, created_by: Number(account.user.id), updated_by: Number(account.user.id), created_at: now, updated_at: now } }); await tx.audits.create({ data: { client_id: account.client.id, user_id: account.user.id, type: 'add', description: `${names[value.groupType]} Discount Added - ${group.name} (${value.discount}%)`, created_at: now, updated_at: now } }); return 'created' }) }
  async updateGroup(account: Account, id: bigint, value: GroupDiscountInput): Promise<DiscountResult> { return this.prisma.$transaction(async tx => { if (!await tx.groupWiseDiscounts.findFirst({ where: { id, client_id: account.client.id } })) return 'missing'; const group = await this.group(tx, account.client.id, value.groupType, value.groupId); if (!group) return 'group_missing'; if (await tx.groupWiseDiscounts.findFirst({ where: { client_id: account.client.id, group_type: value.groupType, group_id: value.groupId, id: { not: id }, from_date: { lte: value.toDate }, to_date: { gte: value.fromDate } } })) return 'overlap'; const now = new Date(); await tx.groupWiseDiscounts.update({ where: { id }, data: { group_type: value.groupType, group_id: value.groupId, discount: value.discount, from_date: value.fromDate, to_date: value.toDate, status: value.status, updated_by: Number(account.user.id), updated_at: now } }); await tx.audits.create({ data: { client_id: account.client.id, user_id: account.user.id, type: 'edit', description: `${names[value.groupType]} Discount Updated - ${group.name} (${value.discount}%)`, created_at: now, updated_at: now } }); return 'updated' }) }
  private async groupRows(clientId: bigint, records: Array<{ id: bigint; group_type: number; group_id: bigint; discount: Prisma.Decimal; from_date: Date | null; to_date: Date | null; status: number }>) { const out: GroupDiscountRow[] = []; for (const row of records) { const group = await this.group(this.prisma, clientId, row.group_type, row.group_id); if (group && row.from_date && row.to_date) out.push({ id: row.id, groupType: row.group_type, groupId: row.group_id, groupTypeName: names[row.group_type]!, groupName: group.name, groupCode: group.code, discount: Number(row.discount), fromDate: row.from_date, toDate: row.to_date, status: row.status }) } return out }
  async getGroup(clientId: bigint, id: bigint) { const row = await this.prisma.groupWiseDiscounts.findFirst({ where: { id, client_id: clientId } }); return row ? (await this.groupRows(clientId, [row]))[0] ?? null : null }
  async listGroups(clientId: bigint, filter: DiscountListFilter) { const where = { client_id: clientId, ...(filter.status === undefined ? {} : { status: filter.status }), ...(filter.groupType === undefined ? {} : { group_type: filter.groupType }), ...(filter.groupId === undefined ? {} : { group_id: filter.groupId }) }; const [rows, total] = await this.prisma.$transaction([this.prisma.groupWiseDiscounts.findMany({ where, orderBy: { id: 'desc' }, skip: (filter.page - 1) * filter.pageSize, take: filter.pageSize }), this.prisma.groupWiseDiscounts.count({ where })]); return { rows: await this.groupRows(clientId, rows), total } }
}
