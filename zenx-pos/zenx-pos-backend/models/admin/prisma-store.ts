import type { PrismaClient } from '@prisma/client'
import type { AdminIdentity, AdminResource, AdminRow, AdminStore } from './contracts.ts'

type Delegate = {
  findFirst(args: Record<string, unknown>): Promise<AdminRow | null>
  findMany(args: Record<string, unknown>): Promise<AdminRow[]>
  count(args: Record<string, unknown>): Promise<number>
  create(args: Record<string, unknown>): Promise<AdminRow>
  updateMany(args: Record<string, unknown>): Promise<{ count: number }>
}

export class PrismaAdminStore implements AdminStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  private delegate(resource: AdminResource): Delegate {
    const delegates = {
      admins: this.prisma.admins,
      businessTypes: this.prisma.businessTypes,
      features: this.prisma.features,
      subFeatures: this.prisma.subFeatures,
      keyMappings: this.prisma.keyMappingMasters,
      billColumns: this.prisma.billColMasters,
      couponUsageTypes: this.prisma.couponUsageTypes,
      billFormats: this.prisma.billFormats,
    }
    return delegates[resource] as unknown as Delegate
  }

  async findAdminByMobile(mobile: string): Promise<AdminIdentity | null> {
    const row = await this.prisma.admins.findFirst({ where: { mobile, status: 1, trash: 0 } })
    return row && { id: row.id, name: row.name, mobile: row.mobile, passwordHash: row.password, status: row.status }
  }

  async findAdminById(id: bigint): Promise<AdminIdentity | null> {
    const row = await this.prisma.admins.findFirst({ where: { id, status: 1, trash: 0 } })
    return row && { id: row.id, name: row.name, mobile: row.mobile, passwordHash: row.password, status: row.status }
  }

  async updatePassword(id: bigint, expectedHash: string, passwordHash: string) {
    const result = await this.prisma.admins.updateMany({ where: { id, password: expectedHash, status: 1, trash: 0 }, data: { password: passwordHash, updated_by: Number(id), updated_at: new Date() } })
    return result.count === 1
  }

  async list(resource: AdminResource, searchFields: string[], search: string, status: number | undefined, filters: Record<string, bigint>, page: number, take: number) {
    const where: Record<string, unknown> = { trash: 0, ...filters }
    if (search) where.OR = searchFields.map((field) => ({ [field]: { startsWith: search } }))
    if (status !== undefined) where.status = status
    const delegate = this.delegate(resource)
    const [items, total] = await Promise.all([
      delegate.findMany({ where, orderBy: resource === 'features' || resource === 'subFeatures' ? { priority: 'asc' } : { id: 'desc' }, skip: (page - 1) * take, take }),
      delegate.count({ where }),
    ])
    return { items, total }
  }

  find(resource: AdminResource, id: bigint) {
    return this.delegate(resource).findFirst({ where: { id, trash: 0 } })
  }

  async findDuplicate(resource: AdminResource, values: Record<string, unknown>, excludeId?: bigint) {
    const where: Record<string, unknown> = { ...values, trash: 0 }
    if (excludeId !== undefined) where.id = { not: excludeId }
    return Boolean(await this.delegate(resource).findFirst({ where }))
  }

  create(resource: AdminResource, data: Record<string, unknown>, actorId: bigint) {
    const now = new Date()
    return this.delegate(resource).create({ data: { ...data, trash: 0, created_by: Number(actorId), updated_by: Number(actorId), created_at: now, updated_at: now } })
  }

  async update(resource: AdminResource, id: bigint, data: Record<string, unknown>, actorId: bigint) {
    const result = await this.delegate(resource).updateMany({ where: { id, trash: 0 }, data: { ...data, updated_by: Number(actorId), updated_at: new Date() } })
    return result.count === 1 ? this.find(resource, id) : null
  }

  async softDelete(resource: AdminResource, id: bigint, actorId: bigint) {
    const result = await this.delegate(resource).updateMany({ where: { id, trash: 0 }, data: { trash: 1, updated_by: Number(actorId), updated_at: new Date() } })
    return result.count === 1
  }

  async activeParent(resource: 'features' | 'businessTypes', id: bigint) {
    return Boolean(await this.delegate(resource).findFirst({ where: { id, status: 1, trash: 0 } }))
  }
}
