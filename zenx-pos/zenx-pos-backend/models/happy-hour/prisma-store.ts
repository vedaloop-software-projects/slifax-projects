import type { Prisma, PrismaClient } from '@prisma/client'
import type { Account } from '../auth/contracts.ts'
import type { GroupChild, GroupHappyHourInput, GroupHappyHourRow, HappyHourResult, HappyHourStore, ListFilter, ProductChild, ProductHappyHourInput, ProductHappyHourRow, WindowInput } from './contracts.ts'

const audit = (account: Account, type: string, description: string, now: Date) => ({ client_id: account.client.id, user_id: account.user.id, type, description, created_at: now, updated_at: now })
const overlap = (clientId: bigint, value: WindowInput, exclude?: bigint) => ({ client_id: clientId, ...(exclude ? { id: { not: exclude } } : {}), from_date: { lte: value.toDate }, to_date: { gte: value.fromDate }, from_time: { lte: value.toTime }, to_time: { gte: value.fromTime } })

export class PrismaHappyHourStore implements HappyHourStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  private async products(tx: Prisma.TransactionClient, clientId: bigint, rows: ProductChild[]) {
    const products = await tx.products.findMany({ where: { client_id: clientId, id: { in: rows.map(row => row.productId) }, status: 1, trash: 0 } })
    if (new Set(products.map(row => row.id)).size !== new Set(rows.map(row => row.productId)).size) return 'product_missing' as const
    const variants = await tx.productVariants.findMany({ where: { client_id: clientId, id: { in: rows.map(row => row.variantId) }, status: 1, trash: 0 } })
    const map = new Map(variants.map(row => [row.id, row.product_id]))
    if (rows.some(row => map.get(row.variantId) !== row.productId)) return 'variant_missing' as const
    return null
  }

  private async groupExists(tx: Prisma.TransactionClient, clientId: bigint, row: GroupChild) {
    const where = { id: row.groupId, client_id: clientId, status: 1, trash: 0 }
    if (row.groupType === 1) return Boolean(await tx.categories.findFirst({ where }))
    if (row.groupType === 2) return Boolean(await tx.subCategories.findFirst({ where }))
    if (row.groupType === 3) return Boolean(await tx.brands.findFirst({ where }))
    if (row.groupType === 4) return Boolean(await tx.colours.findFirst({ where }))
    return Boolean(await tx.sizes.findFirst({ where }))
  }

  async createProduct(account: Account, value: ProductHappyHourInput): Promise<HappyHourResult> {
    return this.prisma.$transaction(async tx => {
      if (await tx.happyHours.findFirst({ where: overlap(account.client.id, value) })) return 'overlap'
      const invalid = await this.products(tx, account.client.id, value.products); if (invalid) return invalid
      const now = new Date()
      const parent = await tx.happyHours.create({ data: { client_id: account.client.id, happy_hour_name: value.name, discount_percentage: value.discountPercentage, from_time: value.fromTime, to_time: value.toTime, from_date: value.fromDate, to_date: value.toDate, status: value.status, created_by: Number(account.user.id), updated_by: Number(account.user.id), created_at: now, updated_at: now } })
      if (value.products.length) await tx.childHappyHours.createMany({ data: value.products.map(row => ({ client_id: account.client.id, happy_hour_id: parent.id, product_id: row.productId, variant_id: row.variantId, created_by: Number(account.user.id), updated_by: Number(account.user.id), created_at: now, updated_at: now })) })
      await tx.audits.create({ data: audit(account, 'add', `${value.name} Happy Hour added.`, now) })
      return 'created'
    })
  }

  async updateProduct(account: Account, id: bigint, value: ProductHappyHourInput): Promise<HappyHourResult> {
    return this.prisma.$transaction(async tx => {
      if (!await tx.happyHours.findFirst({ where: { id, client_id: account.client.id } })) return 'missing'
      if (await tx.happyHours.findFirst({ where: overlap(account.client.id, value, id) })) return 'overlap'
      const invalid = await this.products(tx, account.client.id, value.products); if (invalid) return invalid
      const existing = await tx.childHappyHours.findMany({ where: { happy_hour_id: id, client_id: account.client.id } })
      for (const row of value.products) if (row.id && !existing.some(current => current.id === row.id)) return 'child_missing'
      const now = new Date()
      await tx.happyHours.update({ where: { id }, data: { happy_hour_name: value.name, discount_percentage: value.discountPercentage, from_time: value.fromTime, to_time: value.toTime, from_date: value.fromDate, to_date: value.toDate, status: value.status, updated_by: Number(account.user.id), updated_at: now } })
      for (const row of value.products) if (row.id) await tx.childHappyHours.update({ where: { id: row.id }, data: { product_id: row.productId, variant_id: row.variantId, updated_by: Number(account.user.id), updated_at: now } }); else await tx.childHappyHours.create({ data: { client_id: account.client.id, happy_hour_id: id, product_id: row.productId, variant_id: row.variantId, created_by: Number(account.user.id), updated_by: Number(account.user.id), created_at: now, updated_at: now } })
      await tx.audits.create({ data: audit(account, 'edit', `${value.name} Happy Hour updated.`, now) }); return 'updated'
    })
  }

  private async productRows(clientId: bigint, ids: bigint[]) {
    const children = await this.prisma.childHappyHours.findMany({ where: { client_id: clientId, happy_hour_id: { in: ids } } })
    const products = await this.prisma.products.findMany({ where: { client_id: clientId, id: { in: children.map(row => row.product_id) } } })
    const variants = await this.prisma.productVariants.findMany({ where: { client_id: clientId, id: { in: children.map(row => row.variant_id) } } })
    const pm = new Map(products.map(row => [row.id, row])), vm = new Map(variants.map(row => [row.id, row]))
    return new Map(ids.map(id => [id, children.flatMap(row => { const product = pm.get(row.product_id), variant = vm.get(row.variant_id); return row.happy_hour_id === id && product && variant?.product_id === product.id ? [{ id: row.id, productId: row.product_id, variantId: row.variant_id, productCode: product.product_code, productShortName: product.product_short_name, productFullName: product.product_full_name, packSize: variant.pack_size }] : [] })]))
  }

  private productRow(row: any, products: ProductHappyHourRow['products']): ProductHappyHourRow { return { id: row.id, name: row.happy_hour_name, discountPercentage: Number(row.discount_percentage), fromTime: row.from_time, toTime: row.to_time, fromDate: row.from_date, toDate: row.to_date, status: row.status, products } }
  async getProduct(clientId: bigint, id: bigint) { const row = await this.prisma.happyHours.findFirst({ where: { id, client_id: clientId } }); if (!row) return null; const children = await this.productRows(clientId, [id]); return this.productRow(row, children.get(id) ?? []) }
  async listProducts(clientId: bigint, filter: ListFilter) { const where = { client_id: clientId, ...(filter.status === undefined ? {} : { status: filter.status }), ...(filter.search ? { happy_hour_name: { contains: filter.search } } : {}) }; const [rows, total] = await this.prisma.$transaction([this.prisma.happyHours.findMany({ where, orderBy: { id: 'desc' }, skip: (filter.page - 1) * filter.pageSize, take: filter.pageSize }), this.prisma.happyHours.count({ where })]); const children = await this.productRows(clientId, rows.map(row => row.id)); return { rows: rows.map(row => this.productRow(row, children.get(row.id) ?? [])), total } }
  async deleteProductChild(account: Account, id: bigint): Promise<HappyHourResult> { return this.prisma.$transaction(async tx => { const child = await tx.childHappyHours.findFirst({ where: { id, client_id: account.client.id } }); if (!child) return 'child_missing'; await tx.childHappyHours.delete({ where: { id } }); await tx.audits.create({ data: audit(account, 'delete', 'Happy Hour product deleted.', new Date()) }); return 'updated' }) }

  async createGroup(account: Account, value: GroupHappyHourInput): Promise<HappyHourResult> { return this.prisma.$transaction(async tx => { if (await tx.groupWiseHappyHours.findFirst({ where: overlap(account.client.id, value) })) return 'overlap'; for (const row of value.groups) if (!await this.groupExists(tx, account.client.id, row)) return 'group_missing'; const now = new Date(), parent = await tx.groupWiseHappyHours.create({ data: { client_id: account.client.id, happy_hour_name: value.name, from_time: value.fromTime, to_time: value.toTime, from_date: value.fromDate, to_date: value.toDate, status: value.status, created_by: Number(account.user.id), updated_by: Number(account.user.id), created_at: now, updated_at: now } }); await tx.childGroupWiseHappyHours.createMany({ data: value.groups.map(row => ({ client_id: account.client.id, group_wise_happy_hour_id: parent.id, group_type: row.groupType, group_id: row.groupId, discount_percentage: row.discountPercentage, created_by: Number(account.user.id), updated_by: Number(account.user.id), created_at: now, updated_at: now })) }); await tx.audits.create({ data: audit(account, 'add', `${value.name} Group Wise Happy Hour added.`, now) }); return 'created' }) }
  async updateGroup(account: Account, id: bigint, value: GroupHappyHourInput): Promise<HappyHourResult> { return this.prisma.$transaction(async tx => { if (!await tx.groupWiseHappyHours.findFirst({ where: { id, client_id: account.client.id } })) return 'missing'; if (await tx.groupWiseHappyHours.findFirst({ where: overlap(account.client.id, value, id) })) return 'overlap'; for (const row of value.groups) if (!await this.groupExists(tx, account.client.id, row)) return 'group_missing'; const existing = await tx.childGroupWiseHappyHours.findMany({ where: { group_wise_happy_hour_id: id, client_id: account.client.id } }); for (const row of value.groups) if (row.id && !existing.some(current => current.id === row.id)) return 'child_missing'; const now = new Date(); await tx.groupWiseHappyHours.update({ where: { id }, data: { happy_hour_name: value.name, from_time: value.fromTime, to_time: value.toTime, from_date: value.fromDate, to_date: value.toDate, status: value.status, updated_by: Number(account.user.id), updated_at: now } }); for (const row of value.groups) if (row.id) await tx.childGroupWiseHappyHours.update({ where: { id: row.id }, data: { group_type: row.groupType, group_id: row.groupId, discount_percentage: row.discountPercentage, updated_by: Number(account.user.id), updated_at: now } }); else await tx.childGroupWiseHappyHours.create({ data: { client_id: account.client.id, group_wise_happy_hour_id: id, group_type: row.groupType, group_id: row.groupId, discount_percentage: row.discountPercentage, created_by: Number(account.user.id), updated_by: Number(account.user.id), created_at: now, updated_at: now } }); await tx.audits.create({ data: audit(account, 'edit', `${value.name} Group Wise Happy Hour updated.`, now) }); return 'updated' }) }

  private async groupRows(clientId: bigint, ids: bigint[]) { const children = await this.prisma.childGroupWiseHappyHours.findMany({ where: { client_id: clientId, group_wise_happy_hour_id: { in: ids } } }); const byType = async (type: number, model: any, name: string, code: string) => new Map((await model.findMany({ where: { client_id: clientId, id: { in: children.filter(row => row.group_type === type).map(row => row.group_id) } } })).map((row: any) => [row.id, { name: row[name], code: row[code] }])); const maps = [new Map(), await byType(1, this.prisma.categories, 'category_name', 'category_code'), await byType(2, this.prisma.subCategories, 'sub_category_name', 'sub_category_code'), await byType(3, this.prisma.brands, 'brand_name', 'brand_code'), await byType(4, this.prisma.colours, 'colour_name', 'colour_code'), await byType(5, this.prisma.sizes, 'size_name', 'size_code')]; const names = ['', 'Category', 'Sub Category', 'Brand', 'Colour', 'Size']; return new Map(ids.map(id => [id, children.flatMap(row => { const group = maps[row.group_type]?.get(row.group_id) as { name: string; code: string } | undefined; return row.group_wise_happy_hour_id === id && group ? [{ id: row.id, groupType: row.group_type, groupId: row.group_id, discountPercentage: Number(row.discount_percentage), groupTypeName: names[row.group_type]!, groupName: group.name, groupCode: group.code }] : [] })])) }
  private groupRow(row: any, groups: GroupHappyHourRow['groups']): GroupHappyHourRow { return { id: row.id, name: row.happy_hour_name, fromTime: row.from_time, toTime: row.to_time, fromDate: row.from_date, toDate: row.to_date, status: row.status, groups } }
  async getGroup(clientId: bigint, id: bigint) { const row = await this.prisma.groupWiseHappyHours.findFirst({ where: { id, client_id: clientId } }); if (!row) return null; const children = await this.groupRows(clientId, [id]); return this.groupRow(row, children.get(id) ?? []) }
  async listGroups(clientId: bigint, filter: ListFilter) { const where = { client_id: clientId, ...(filter.status === undefined ? {} : { status: filter.status }), ...(filter.search ? { happy_hour_name: { contains: filter.search } } : {}) }; const [rows, total] = await this.prisma.$transaction([this.prisma.groupWiseHappyHours.findMany({ where, orderBy: { id: 'desc' }, skip: (filter.page - 1) * filter.pageSize, take: filter.pageSize }), this.prisma.groupWiseHappyHours.count({ where })]); const children = await this.groupRows(clientId, rows.map(row => row.id)); return { rows: rows.map(row => this.groupRow(row, children.get(row.id) ?? [])), total } }
  async deleteGroupChild(account: Account, id: bigint): Promise<HappyHourResult> { return this.prisma.$transaction(async tx => { const child = await tx.childGroupWiseHappyHours.findFirst({ where: { id, client_id: account.client.id } }); if (!child) return 'child_missing'; await tx.childGroupWiseHappyHours.delete({ where: { id } }); await tx.audits.create({ data: audit(account, 'delete', 'Group Wise Happy Hour child deleted.', new Date()) }); return 'updated' }) }
}
