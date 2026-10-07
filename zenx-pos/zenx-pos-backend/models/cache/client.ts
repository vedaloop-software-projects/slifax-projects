import { createClient } from 'redis'
import type { RedisConfig } from './config.ts'

function configuredClient(config: RedisConfig) {
  return createClient({ url: config.url, socket: { connectTimeout: 5_000, reconnectStrategy: (retries) => Math.min(retries * 100, 3_000) } })
}
export type RedisClient = ReturnType<typeof configuredClient>

export async function createRedis(config: RedisConfig) {
  const client = configuredClient(config)
  client.on('error', () => {})
  await client.connect()
  return {
    client,
    async check() { await client.ping() },
    async close() { if (client.isOpen) await client.quit() },
  }
}
