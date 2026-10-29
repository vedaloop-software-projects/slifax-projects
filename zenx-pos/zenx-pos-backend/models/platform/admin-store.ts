import type { PrismaClient } from '@prisma/client'

// Cross-client reads and writes used only by the super-admin platform screens.
export class PrismaPlatformAdminStore {
  readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  // One row per client with live sessions: how many users and devices are signed in.
  async sessionSummary() {
    const now = new Date()
    const sessions = await this.prisma.clientUserSessions.findMany({ where: { revoked_at: null, expires_at: { gt: now } }, select: { client_id: true, user_id: true, device_id: true, last_seen_at: true }, take: 20_000 })
    const byClient = new Map<bigint, { sessions: number; users: Set<bigint>; devices: Set<string>; lastActiveAt: Date }>()
    for (const row of sessions) {
      const value = byClient.get(row.client_id) ?? { sessions: 0, users: new Set(), devices: new Set(), lastActiveAt: row.last_seen_at }
      value.sessions += 1; value.users.add(row.user_id); value.devices.add(`${row.user_id}:${row.device_id}`)
      if (row.last_seen_at > value.lastActiveAt) value.lastActiveAt = row.last_seen_at
      byClient.set(row.client_id, value)
    }
    const clients = await this.prisma.users.findMany({ where: { id: { in: [...byClient.keys()] } }, select: { id: true, business_name: true, max_login_devices: true } })
    const names = new Map(clients.map(client => [client.id, client]))
    return [...byClient].map(([clientId, value]) => ({
      clientId, businessName: names.get(clientId)?.business_name ?? 'Unknown', maxLoginDevices: names.get(clientId)?.max_login_devices ?? null,
      activeSessions: value.sessions, activeUsers: value.users.size, activeDevices: value.devices.size, lastActiveAt: value.lastActiveAt,
    })).sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime())
  }

  async client(clientId: bigint) {
    return this.prisma.users.findFirst({ where: { id: clientId, trash: 0 }, select: { id: true, business_name: true, max_login_devices: true, time_zone: true } })
  }

  async setDeviceLimit(clientId: bigint, limit: number | null, adminId: bigint) {
    const result = await this.prisma.users.updateMany({ where: { id: clientId, trash: 0 }, data: { max_login_devices: limit, updated_by: Number(adminId), updated_at: new Date() } })
    return result.count === 1
  }

  // Day-close rows need a tenant user; super-admin actions are attributed to the primary admin.
  async primaryUserId(clientId: bigint) {
    const user = await this.prisma.clientUsers.findFirst({ where: { client_id: clientId, is_admin: 1, trash: 0 }, orderBy: { id: 'asc' }, select: { id: true } })
    return user?.id ?? null
  }
}
