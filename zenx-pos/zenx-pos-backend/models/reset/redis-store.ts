import type { PrismaClient } from '@prisma/client'
import type { RedisClient } from '../cache/client.ts'
import type { ResetChallenge, ResetStore, ResetUser } from './contracts.ts'

function serialize(challenge: ResetChallenge) { return JSON.stringify(challenge) }
function expiration(challenge: ResetChallenge) { return Math.ceil(Math.max(challenge.expiresAt, challenge.resetExpiresAt ?? 0) / 1000) }

const compareSet = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  redis.call('SET', KEYS[1], ARGV[2], 'EXAT', ARGV[3])
  return 1
end
return 0`
const compareDelete = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0`

export class RedisResetStore implements ResetStore {
  private readonly prisma: PrismaClient
  private readonly redis: RedisClient
  private readonly prefix: string
  constructor(prisma: PrismaClient, redis: RedisClient, prefix: string) {
    this.prisma = prisma; this.redis = redis; this.prefix = prefix
  }
  private key(key: string) { return this.prefix + key }

  async findActiveUser(mobile: string, today: string) {
    const user = await this.prisma.clientUsers.findFirst({ where: { mobile, status: 1, trash: 0 } })
    if (!user) return null
    const date = new Date(`${today}T00:00:00Z`)
    const client = await this.prisma.users.findFirst({
      where: { id: user.client_id, status: 1, trash: 0, start_date: { lte: date }, end_date: { gte: date } }, select: { id: true },
    })
    return client ? { id: user.id, clientId: user.client_id, name: user.name, mobile } : null
  }

  async putChallenge(key: string, challenge: ResetChallenge) {
    await this.redis.set(this.key(key), serialize(challenge), { EXAT: expiration(challenge) })
  }
  async getChallenge(key: string) {
    const value = await this.redis.get(this.key(key))
    if (!value) return null
    try {
      const challenge = JSON.parse(value) as ResetChallenge
      return challenge.version === 1 ? { value, challenge } : null
    } catch { return null }
  }
  async compareAndSetChallenge(key: string, expectedValue: string, challenge: ResetChallenge) {
    const result = await this.redis.eval(compareSet, {
      keys: [this.key(key)], arguments: [expectedValue, serialize(challenge), String(expiration(challenge))],
    })
    return result === 1
  }
  async deleteChallenge(key: string) { await this.redis.del(this.key(key)) }

  async consumeReset(key: string, expectedValue: string, user: ResetUser, passwordHash: string) {
    const claimed = await this.redis.eval(compareDelete, { keys: [this.key(key)], arguments: [expectedValue] })
    if (claimed !== 1) return false
    const now = new Date()
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.clientUsers.updateMany({
        where: { id: user.id, client_id: user.clientId, mobile: user.mobile, status: 1, trash: 0 },
        data: { password: passwordHash, otp: 0, otp_status: 0, updated_by: Number(user.id), updated_at: now },
      })
      if (updated.count !== 1) return false
      await transaction.audits.create({ data: {
        client_id: user.clientId, user_id: user.id, type: 'password_reset',
        description: `${user.name ?? 'User'} password reset`, created_at: now, updated_at: now,
      } })
      return true
    })
  }
}
