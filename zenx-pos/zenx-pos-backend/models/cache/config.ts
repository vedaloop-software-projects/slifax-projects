export type RedisConfig = {
  url: string
  keyPrefix: string
  profileTtlSeconds: number
  productTtlSeconds: number
}

function ttl(value: string | undefined, fallback: number, name: string) {
  const parsed = Number(value ?? fallback)
  if (!Number.isInteger(parsed) || parsed < 10 || parsed > 86_400) throw new Error(`${name} must be between 10 and 86400 seconds.`)
  return parsed
}

export function loadRedisConfig(env: NodeJS.ProcessEnv = process.env): RedisConfig | undefined {
  const raw = env.REDIS_URL?.trim()
  if (!raw) return undefined
  const url = new URL(raw)
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
  if (!['redis:', 'rediss:'].includes(url.protocol)) throw new Error('REDIS_URL must use redis:// or rediss://.')
  if (!local && url.protocol !== 'rediss:') throw new Error('Remote REDIS_URL must use TLS with rediss://.')
  const keyPrefix = env.REDIS_KEY_PREFIX?.trim() || 'zenxpos:v1:'
  if (!/^[A-Za-z0-9:_-]{1,64}$/.test(keyPrefix)) throw new Error('REDIS_KEY_PREFIX contains unsupported characters.')
  return {
    url: url.toString(), keyPrefix,
    profileTtlSeconds: ttl(env.PROFILE_CACHE_TTL_SECONDS, 300, 'PROFILE_CACHE_TTL_SECONDS'),
    productTtlSeconds: ttl(env.PRODUCT_CACHE_TTL_SECONDS, 120, 'PRODUCT_CACHE_TTL_SECONDS'),
  }
}
