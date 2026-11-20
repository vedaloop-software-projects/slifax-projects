import type { Prisma, PrismaClient } from '@prisma/client'
import type { Account } from '../auth/contracts.ts'
import type { ManagedUserInput, UserStore } from './contracts.ts'

export class PrismaUserStore implements UserStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }
  private async role(clientId: bigint, roleId: bigint, prisma: PrismaClient | Prisma.TransactionClient) { return prisma.clientRoles.findFirst({ where: { id: roleId, client_id: clientId, status: 1, trash: 0 } }) }
  // Locks the client row so two admins adding users at once cannot both pass the check.
  private async limitReached(clientId: bigint, tx: Prisma.TransactionClient) {
    const [client] = await tx.$queryRaw<Array<{ max_users: number | null }>>`SELECT max_users FROM users WHERE id = ${clientId} FOR UPDATE`
    if (client?.max_users == null) return false
    return await tx.clientUsers.count({ where: { client_id: clientId, status: 1, trash: 0 } }) >= client.max_users
  }
  async userLimit(clientId: bigint) {
    const [client, used] = await Promise.all([this.prisma.users.findFirst({ where: { id: clientId }, select: { max_users: true } }), this.prisma.clientUsers.count({ where: { client_id: clientId, status: 1, trash: 0 } })])
    return { max: client?.max_users ?? null, used }
  }
  private async duplicate(clientId: bigint, email: string, mobile: string, prisma: PrismaClient | Prisma.TransactionClient, exclude?: bigint) { return prisma.clientUsers.findFirst({ where: { client_id: clientId, trash: 0, ...(exclude === undefined ? {} : { id: { not: exclude } }), OR: [{ mobile }, { email }] } }) }
  async createUser(account: Account, value: ManagedUserInput) {
    return this.prisma.$transaction(async (tx) => {
      const actor = await tx.clientUsers.findFirst({ where: { id: account.user.id, client_id: account.client.id, is_admin: 1, status: 1, trash: 0 }, select: { id: true } }); if (!actor) return 'primary_required' as const
      if (!await this.role(account.client.id, value.roleId, tx)) return 'role_missing' as const
      const duplicate = await this.duplicate(account.client.id, value.email, value.mobile, tx); if (duplicate?.mobile === value.mobile) return 'mobile_duplicate' as const; if (duplicate) return 'email_duplicate' as const
      if (value.status === 1 && await this.limitReached(account.client.id, tx)) return 'user_limit' as const
      const now = new Date(); await tx.clientUsers.create({ data: { client_id: account.client.id, role_id: Number(value.roleId), name: value.name, email: value.email, mobile: value.mobile, password: value.passwordHash!, max_discount_percentage: value.maxDiscountPercentage, is_admin: 0, status: value.status, trash: 0, created_by: Number(account.user.id), created_at: now } })
      await tx.audits.create({ data: { client_id: account.client.id, user_id: account.user.id, type: 'add', description: `${value.name} user added`, created_at: now, updated_at: now } }); return 'saved' as const
    })
  }
  async updateUser(account: Account, id: bigint, value: ManagedUserInput) {
    return this.prisma.$transaction(async (tx) => {
      const actor = await tx.clientUsers.findFirst({ where: { id: account.user.id, client_id: account.client.id, is_admin: 1, status: 1, trash: 0 }, select: { id: true } }); if (!actor) return 'primary_required' as const
      const current = await tx.clientUsers.findFirst({ where: { id, client_id: account.client.id, trash: 0 } }); if (!current) return 'missing' as const
      // Admins may edit their own name, contact details and discount limit, but not lock themselves
      // out: their own account stays active with the same role, and their password changes only
      // through Change Password (a new password here would end their current session).
      if (id === account.user.id && (value.status !== 1 || BigInt(value.roleId) !== BigInt(current.role_id) || value.passwordHash)) return 'self_protected' as const
      if (!await this.role(account.client.id, value.roleId, tx)) return 'role_missing' as const
      const duplicate = await this.duplicate(account.client.id, value.email, value.mobile, tx, id); if (duplicate?.mobile === value.mobile) return 'mobile_duplicate' as const; if (duplicate) return 'email_duplicate' as const
      if (value.status === 1 && current.status !== 1 && await this.limitReached(account.client.id, tx)) return 'user_limit' as const
      const now = new Date(); await tx.clientUsers.update({ where: { id }, data: { role_id: Number(value.roleId), name: value.name, email: value.email, mobile: value.mobile, max_discount_percentage: value.maxDiscountPercentage, status: value.status, ...(value.passwordHash ? { password: value.passwordHash } : {}), updated_by: Number(account.user.id), updated_at: now } })
      await tx.audits.create({ data: { client_id: account.client.id, user_id: account.user.id, type: 'edit', description: `${value.name} user updated`, created_at: now, updated_at: now } }); return 'saved' as const
    })
  }
  private async attachRoles(clientId: bigint, users: { id: bigint; role_id: number; name: string | null; email: string | null; mobile: string | null; max_discount_percentage: number; status: number; is_admin: number }[]) {
    const ids = [...new Set(users.map((user) => BigInt(user.role_id)))], roles = await this.prisma.clientRoles.findMany({ where: { client_id: clientId, id: { in: ids }, trash: 0 } }), names = new Map(roles.flatMap((role) => role.role_title ? [[role.id, role.role_title] as const] : []))
    return users.flatMap((user) => { const roleName = names.get(BigInt(user.role_id)); return roleName && user.name && user.email && user.mobile ? [{ id: user.id, roleId: BigInt(user.role_id), roleName, name: user.name, email: user.email, mobile: user.mobile, maxDiscountPercentage: user.max_discount_percentage, status: user.status, isPrimaryAdmin: user.is_admin === 1 }] : [] })
  }
  async getUser(clientId: bigint, id: bigint) { const user = await this.prisma.clientUsers.findFirst({ where: { id, client_id: clientId, trash: 0 } }); return user ? (await this.attachRoles(clientId, [user]))[0] ?? null : null }
  async listUsers(clientId: bigint, filters: { search?: string; status?: number; page: number; perPage: number }) { const where: Prisma.ClientUsersWhereInput = { client_id: clientId, trash: 0, ...(filters.status === undefined ? {} : { status: filters.status }), ...(filters.search ? { OR: [{ name: { contains: filters.search } }, { mobile: { contains: filters.search } }, { email: { contains: filters.search } }] } : {}) }; const [users, total] = await Promise.all([this.prisma.clientUsers.findMany({ where, orderBy: { id: 'desc' }, skip: (filters.page - 1) * filters.perPage, take: filters.perPage }), this.prisma.clientUsers.count({ where })]); return { rows: await this.attachRoles(clientId, users), total } }
}
