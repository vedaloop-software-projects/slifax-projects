import type { PrismaClient } from '@prisma/client'
import type { ResetChallenge, ResetStore, ResetUser } from './contracts.ts'

function serialize(challenge: ResetChallenge) { return JSON.stringify(challenge) }
function expiration(challenge: ResetChallenge) { return Math.ceil(Math.max(challenge.expiresAt, challenge.resetExpiresAt ?? 0) / 1000) }

export class PrismaResetStore implements ResetStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  async findActiveUser(mobile: string, today: string) {
    const user = await this.prisma.clientUsers.findFirst({ where: { mobile, status: 1, trash: 0 } })
    if (!user) return null
    const client = await this.prisma.users.findFirst({ where: {
      id: user.client_id, status: 1, trash: 0,
      start_date: { lte: new Date(`${today}T00:00:00Z`) }, end_date: { gte: new Date(`${today}T00:00:00Z`) },
    }, select: { id: true } })
    return client ? { id: user.id, clientId: user.client_id, name: user.name, mobile } : null
  }

  async putChallenge(key: string, challenge: ResetChallenge) {
    await this.prisma.cache.upsert({
      where: { key }, create: { key, value: serialize(challenge), expiration: expiration(challenge) },
      update: { value: serialize(challenge), expiration: expiration(challenge) },
    })
  }

  async getChallenge(key: string) {
    const row = await this.prisma.cache.findUnique({ where: { key } })
    if (!row) return null
    try {
      const challenge = JSON.parse(row.value) as ResetChallenge
      if (challenge.version !== 1) return null
      return { value: row.value, challenge }
    } catch { return null }
  }

  async compareAndSetChallenge(key: string, expectedValue: string, challenge: ResetChallenge) {
    const result = await this.prisma.cache.updateMany({
      where: { key, value: expectedValue }, data: { value: serialize(challenge), expiration: expiration(challenge) },
    })
    return result.count === 1
  }

  async deleteChallenge(key: string) { await this.prisma.cache.deleteMany({ where: { key } }) }

  async consumeReset(key: string, expectedValue: string, user: ResetUser, passwordHash: string) {
    return this.prisma.$transaction(async (transaction) => {
      const now = new Date()
      const updated = await transaction.clientUsers.updateMany({
        where: { id: user.id, client_id: user.clientId, mobile: user.mobile, status: 1, trash: 0 },
        data: { password: passwordHash, otp: 0, otp_status: 0, updated_by: Number(user.id), updated_at: now },
      })
      if (updated.count !== 1) return false
      const removed = await transaction.cache.deleteMany({ where: { key, value: expectedValue } })
      if (removed.count !== 1) throw new Error('RESET_CHALLENGE_CONFLICT')
      await transaction.audits.create({ data: {
        client_id: user.clientId, user_id: user.id, type: 'password_reset',
        description: `${user.name ?? 'User'} password reset`, created_at: now, updated_at: now,
      } })
      return true
    })
  }
}
