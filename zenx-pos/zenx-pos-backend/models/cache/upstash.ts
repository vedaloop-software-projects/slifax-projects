import type { RedisClient } from './client.ts'

type Fetch = typeof fetch

export function createUpstashRedisClient(url: string, token: string, request: Fetch = fetch): RedisClient & { ping(): Promise<string> } {
  async function command<T>(parts: Array<string | number>) {
    const response = await request(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(parts),
      signal: AbortSignal.timeout(5_000),
    })
    if (!response.ok) throw new Error(`Upstash Redis request failed with HTTP ${response.status}.`)
    const body = await response.json() as { result?: T; error?: string }
    if (body.error) throw new Error('Upstash Redis rejected the command.')
    return body.result as T
  }

  return {
    get: (key) => command<string | null>(['GET', key]),
    set(key, value, options) {
      if (options.EX !== undefined) return command(['SET', key, value, 'EX', options.EX])
      if (options.EXAT !== undefined) return command(['SET', key, value, 'EXAT', options.EXAT])
      return command(['SET', key, value])
    },
    del: (key) => command<number>(['DEL', key]),
    incr: (key) => command<number>(['INCR', key]),
    eval: (script, options) => command(['EVAL', script, options.keys.length, ...options.keys, ...options.arguments]),
    ping: () => command<string>(['PING']),
  }
}
