import { pathToFileURL } from 'node:url'
import { loadRedisConfig } from '../../zenx-pos-backend/models/cache/config.ts'

export async function clearConfiguredCache() {
  const redis = loadRedisConfig()
  if (!redis) return 0
  if (redis.transport !== 'rest') throw new Error('This migration cache purge currently supports the configured Upstash REST transport only.')

  const command = async (parts) => {
    const response = await fetch(redis.url, {
      method: 'POST',
      headers: { authorization: `Bearer ${redis.token}`, 'content-type': 'application/json' },
      body: JSON.stringify(parts),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error(`Upstash Redis request failed with HTTP ${response.status}.`)
    const body = await response.json()
    if (body.error) throw new Error('Upstash Redis rejected the command.')
    return body.result
  }

  let cursor = '0'
  let cleared = 0
  do {
    const result = await command(['SCAN', cursor, 'MATCH', `${redis.keyPrefix}*`, 'COUNT', 1000])
    cursor = String(result[0])
    const keys = result[1]
    if (keys.length) cleared += Number(await command(['DEL', ...keys]))
  } while (cursor !== '0')
  return cleared
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`Cleared ${await clearConfiguredCache()} cached Redis keys in the configured namespace.`)
}
