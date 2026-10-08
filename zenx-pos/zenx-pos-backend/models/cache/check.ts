import { randomUUID } from 'node:crypto'
import { createRedis } from './client.ts'
import { loadRedisConfig } from './config.ts'

const config = loadRedisConfig()
if (!config) throw new Error('Configure REDIS_URL or the Upstash Redis REST variables before running this check.')

const redis = await createRedis(config)
const key = `${config.keyPrefix}verification:${randomUUID()}`
const compareSet = "if redis.call('GET', KEYS[1]) == ARGV[1] then redis.call('SET', KEYS[1], ARGV[2], 'EX', 30) return 1 end return 0"

try {
  await redis.client.set(key, 'one', { EX: 30 })
  if (await redis.client.get(key) !== 'one') throw new Error('Redis read-after-write check failed.')
  const changed = await redis.client.eval(compareSet, { keys: [key], arguments: ['one', 'two'] })
  if (changed !== 1 || await redis.client.get(key) !== 'two') throw new Error('Redis atomic compare-and-set check failed.')
  console.log(`Redis ${config.transport} write, read, expiry, atomic update, and cleanup checks passed.`)
} finally {
  await redis.client.del(key)
  await redis.close()
}
