import { createClient } from 'redis'
import type { RedisConfig } from './config.ts'
import { createUpstashRedisClient } from './upstash.ts'

function configuredClient(config: Extract<RedisConfig, { transport: 'tcp' }>) {
  return createClient({ url: config.url, socket: { connectTimeout: 5_000, reconnectStrategy: (retries) => Math.min(retries * 100, 3_000) } })
}
export interface RedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, options: { EX?: number; EXAT?: number }): Promise<unknown>
  del(key: string): Promise<number>
  incr(key: string): Promise<number>
  eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown>
}

export async function createRedis(config: RedisConfig) {
  if (config.transport === 'rest') {
    const client = createUpstashRedisClient(config.url, config.token)
    await client.ping()
    return {
      client,
      async check() { await client.ping() },
      async close() {},
    }
  }
  const client = configuredClient(config)
  client.on('error', () => {})
  await client.connect()
  return {
    client,
    async check() { await client.ping() },
    async close() { if (client.isOpen) await client.quit() },
  }
}
