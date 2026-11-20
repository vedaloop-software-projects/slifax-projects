import type { PrismaClient } from '@prisma/client'
import type { DeviceInfo, LoginAlertResponse, SessionStore } from './contracts.ts'

const ALERT_WINDOW_MS = 24 * 60 * 60_000

// last_seen_at is refreshed at most this often to avoid a write per request.
const TOUCH_INTERVAL_MS = 5 * 60_000

export class PrismaSessionStore implements SessionStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  async open(clientId: bigint, userId: bigint, sessionId: string, device: DeviceInfo, expiresAt: Date, defaultLimit: number, takeOver = false) {
    return this.prisma.$transaction(async tx => {
      // Serializes concurrent logins of the same user.
      await tx.$queryRaw`SELECT id FROM client_users WHERE id = ${userId} FOR UPDATE`
      const now = new Date()
      const active = await tx.clientUserSessions.findMany({ where: { user_id: userId, revoked_at: null, expires_at: { gt: now } }, orderBy: { last_seen_at: 'desc' } })
      const client = await tx.users.findFirst({ where: { id: clientId }, select: { max_login_devices: true } })
      const limit = Math.max(1, client?.max_login_devices ?? defaultLimit)
      const others = active.filter(row => row.device_id !== device.deviceId)
      // Other devices, most recently active first. The newest (limit - 1) may stay; the rest
      // would have to be signed out for this device to fit.
      const otherDevices = [...new Set(others.map(row => row.device_id))]
      const excess = otherDevices.slice(limit - 1)
      const asActive = (row: typeof others[number]) => ({ sessionId: row.session_id, deviceId: row.device_id, deviceName: row.device_name, platform: row.platform, location: row.location, lastSeenAt: row.last_seen_at, createdAt: row.created_at })
      const signedOut = excess.map(id => asActive(others.find(row => row.device_id === id)!))
      if (signedOut.length && !takeOver) return { opened: false as const, limit, blockedBy: signedOut[0]! }
      if (signedOut.length) await tx.clientUserSessions.updateMany({ where: { id: { in: others.filter(row => excess.includes(row.device_id)).map(row => row.id) } }, data: { revoked_at: now, revoked_reason: 'signed_in_elsewhere', updated_at: now } })
      // Logging in again on the same device replaces its previous session.
      const sameDevice = active.filter(row => row.device_id === device.deviceId)
      if (sameDevice.length) await tx.clientUserSessions.updateMany({ where: { id: { in: sameDevice.map(row => row.id) } }, data: { revoked_at: now, revoked_reason: 'replaced', updated_at: now } })
      const seen = await tx.clientUserSessions.findFirst({ where: { client_id: clientId, device_id: device.deviceId }, select: { id: true } })
      await tx.clientUserSessions.create({ data: { client_id: clientId, user_id: userId, session_id: sessionId, device_id: device.deviceId, device_name: device.deviceName, platform: device.platform, ip_address: device.ipAddress, location: device.location, last_seen_at: now, expires_at: expiresAt, created_at: now, updated_at: now } })
      return { opened: true as const, newDevice: !seen, signedOut }
    }, { isolationLevel: 'Serializable' })
  }

  async isActive(sessionId: string, userId: bigint) {
    const now = new Date()
    const row = await this.prisma.clientUserSessions.findFirst({ where: { session_id: sessionId, user_id: userId, revoked_at: null, expires_at: { gt: now } }, select: { id: true, last_seen_at: true } })
    if (!row) return false
    if (now.getTime() - row.last_seen_at.getTime() > TOUCH_INTERVAL_MS) await this.prisma.clientUserSessions.update({ where: { id: row.id }, data: { last_seen_at: now } }).catch(() => undefined)
    return true
  }

  async endedReason(sessionId: string, userId: bigint) {
    const row = await this.prisma.clientUserSessions.findFirst({ where: { session_id: sessionId, user_id: userId }, select: { revoked_reason: true } })
    return row?.revoked_reason ?? null
  }

  async revoke(sessionId: string, reason: string) {
    const now = new Date()
    await this.prisma.clientUserSessions.updateMany({ where: { session_id: sessionId, revoked_at: null }, data: { revoked_at: now, revoked_reason: reason, updated_at: now } })
  }

  async revokeClient(clientId: bigint, reason: string, userId?: bigint) {
    const now = new Date()
    const result = await this.prisma.clientUserSessions.updateMany({ where: { client_id: clientId, ...(userId ? { user_id: userId } : {}), revoked_at: null }, data: { revoked_at: now, revoked_reason: reason, updated_at: now } })
    return result.count
  }

  async listActive(clientId: bigint) {
    const rows = await this.prisma.clientUserSessions.findMany({ where: { client_id: clientId, revoked_at: null, expires_at: { gt: new Date() } }, orderBy: { last_seen_at: 'desc' }, take: 500 })
    const users = await this.prisma.clientUsers.findMany({ where: { id: { in: [...new Set(rows.map(row => row.user_id))] } }, select: { id: true, name: true } })
    const names = new Map(users.map(user => [user.id, user.name]))
    return rows.map(row => ({ sessionId: row.session_id, userId: row.user_id, userName: names.get(row.user_id) ?? null, deviceId: row.device_id, deviceName: row.device_name, platform: row.platform, location: row.location, ipAddress: row.ip_address, lastSeenAt: row.last_seen_at, createdAt: row.created_at }))
  }

  async recordAlert(clientId: bigint, userId: bigint, device: DeviceInfo) {
    const now = new Date()
    await this.prisma.clientLoginAlerts.create({ data: { client_id: clientId, user_id: userId, device_name: device.deviceName, platform: device.platform, ip_address: device.ipAddress, location: device.location, created_at: now, updated_at: now } })
  }

  // Only the newest attempt is shown; answering it settles any earlier ones too,
  // so repeated attempts from the other device produce a single prompt.
  async pendingAlerts(userId: bigint) {
    const rows = await this.prisma.clientLoginAlerts.findMany({ where: { user_id: userId, seen_at: null, created_at: { gte: new Date(Date.now() - ALERT_WINDOW_MS) } }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take: 1 })
    return rows.map(row => ({ id: row.id, deviceName: row.device_name, platform: row.platform, location: row.location, attemptedAt: row.created_at }))
  }

  async respondAlert(userId: bigint, alertId: bigint, response: LoginAlertResponse) {
    const now = new Date()
    const alert = await this.prisma.clientLoginAlerts.findFirst({ where: { id: alertId, user_id: userId, seen_at: null }, select: { id: true } })
    if (!alert) return false
    await this.prisma.clientLoginAlerts.updateMany({ where: { user_id: userId, seen_at: null, id: { lte: alertId } }, data: { seen_at: now, response, updated_at: now } })
    return true
  }
}
