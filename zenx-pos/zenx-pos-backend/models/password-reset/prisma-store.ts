import type { PrismaClient } from '@prisma/client'
import type { PasswordResetRequester, PasswordResetRequestRow, PasswordResetRequestStore } from './contracts.ts'

export class PrismaPasswordResetRequestStore implements PasswordResetRequestStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  async findRequester(mobile: string): Promise<PasswordResetRequester | null> {
    const user = await this.prisma.clientUsers.findFirst({ where: { mobile, status: 1, trash: 0 } })
    if (user) return { type: 'client_user', id: user.id, clientId: user.client_id, name: user.name ?? 'User', mobile, isAdmin: user.is_admin === 1 }
    const admin = await this.prisma.admins.findFirst({ where: { mobile, status: 1, trash: 0 } })
    return admin ? { type: 'admin', id: admin.id, clientId: null, name: admin.name, mobile, isAdmin: true } : null
  }

  async createOrRefresh(requester: PasswordResetRequester, assignedLevel: 'tenant_admin' | 'super_admin', now: Date) {
    const pending = await this.prisma.passwordResetRequests.findFirst({ where: { requester_type: requester.type, requester_id: requester.id, status: 'pending' } })
    if (pending) {
      await this.prisma.passwordResetRequests.update({ where: { id: pending.id }, data: { assigned_level: assignedLevel, requested_at: now, updated_at: now } })
      return
    }
    await this.prisma.passwordResetRequests.create({ data: { requester_type: requester.type, requester_id: requester.id, client_id: requester.clientId, assigned_level: assignedLevel, status: 'pending', requested_at: now, created_at: now, updated_at: now } })
  }

  private async rows(where: Record<string, unknown>): Promise<PasswordResetRequestRow[]> {
    const requests = await this.prisma.passwordResetRequests.findMany({ where, orderBy: { requested_at: 'desc' }, take: 200 })
    const clientIds = requests.filter((row) => row.requester_type === 'client_user').map((row) => row.requester_id)
    const adminIds = requests.filter((row) => row.requester_type === 'admin').map((row) => row.requester_id)
    const clientAccountIds = [...new Set(requests.flatMap((row) => row.client_id === null ? [] : [row.client_id]))]
    const [users, admins, clients] = await Promise.all([
      this.prisma.clientUsers.findMany({ where: { id: { in: clientIds } }, select: { id: true, client_id: true, name: true, mobile: true, is_admin: true } }),
      this.prisma.admins.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true, mobile: true } }),
      this.prisma.users.findMany({ where: { id: { in: clientAccountIds } }, select: { id: true, business_name: true } }),
    ])
    const userMap = new Map(users.map((user) => [user.id, user]))
    const adminMap = new Map(admins.map((admin) => [admin.id, admin]))
    const clientMap = new Map(clients.map((client) => [client.id, client.business_name]))
    return requests.flatMap((request): PasswordResetRequestRow[] => {
      if (request.requester_type === 'client_user') {
        const user = userMap.get(request.requester_id); if (!user?.mobile) return []
        return [{ requestId: request.id, type: 'client_user', id: user.id, clientId: user.client_id, clientName: clientMap.get(user.client_id) ?? null, name: user.name ?? 'User', mobile: user.mobile, isAdmin: user.is_admin === 1, assignedLevel: request.assigned_level as 'tenant_admin' | 'super_admin', requestedAt: request.requested_at }]
      }
      const admin = adminMap.get(request.requester_id); if (!admin) return []
      return [{ requestId: request.id, type: 'admin', id: admin.id, clientId: null, name: admin.name, mobile: admin.mobile, isAdmin: true, assignedLevel: request.assigned_level as 'tenant_admin' | 'super_admin', requestedAt: request.requested_at }]
    })
  }

  listTenant(clientId: bigint) { return this.rows({ client_id: clientId, assigned_level: 'tenant_admin', status: 'pending' }) }
  listSuperAdmin() { return this.rows({ assigned_level: 'super_admin', status: 'pending' }) }

  async resetTenantRequest(requestId: bigint, clientId: bigint, actorId: bigint, passwordHash: string, now: Date) {
    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.passwordResetRequests.findFirst({ where: { id: requestId, client_id: clientId, requester_type: 'client_user', assigned_level: 'tenant_admin', status: 'pending' } })
      if (!request) return false
      const user = await transaction.clientUsers.updateMany({ where: { id: request.requester_id, client_id: clientId, is_admin: 0, status: 1, trash: 0 }, data: { password: passwordHash, updated_by: Number(actorId), updated_at: now } })
      if (user.count !== 1) return false
      await transaction.passwordResetRequests.update({ where: { id: request.id }, data: { status: 'resolved', resolved_at: now, resolved_by_type: 'client_user', resolved_by_id: actorId, updated_at: now } })
      await transaction.audits.create({ data: { client_id: clientId, user_id: actorId, type: 'password_reset', description: `Password reset request ${request.id} resolved`, created_at: now, updated_at: now } })
      return true
    })
  }

  async resetSuperAdminRequest(requestId: bigint, actorId: bigint, passwordHash: string, now: Date) {
    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.passwordResetRequests.findFirst({ where: { id: requestId, assigned_level: 'super_admin', status: 'pending' } })
      if (!request) return false
      if (request.requester_type === 'admin' && request.requester_id === actorId) return false
      const updated = request.requester_type === 'client_user'
        ? await transaction.clientUsers.updateMany({ where: { id: request.requester_id, is_admin: 1, status: 1, trash: 0 }, data: { password: passwordHash, updated_by: Number(actorId), updated_at: now } })
        : await transaction.admins.updateMany({ where: { id: request.requester_id, status: 1, trash: 0 }, data: { password: passwordHash, updated_by: Number(actorId), updated_at: now } })
      if (updated.count !== 1) return false
      await transaction.passwordResetRequests.update({ where: { id: request.id }, data: { status: 'resolved', resolved_at: now, resolved_by_type: 'admin', resolved_by_id: actorId, updated_at: now } })
      return true
    })
  }
}
