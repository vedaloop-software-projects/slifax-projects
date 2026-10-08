type CommonRedisConfig = {
  keyPrefix: string
  profileTtlSeconds: number
  productTtlSeconds: number
}

export type RedisConfig = CommonRedisConfig & (
  | { transport: 'tcp'; url: string }
  | { transport: 'rest'; url: string; token: string }
)

function ttl(value: string | undefined, fallback: number, name: string) {
  const parsed = Number(value ?? fallback)
  if (!Number.isInteger(parsed) || parsed < 10 || parsed > 86_400) throw new Error(`${name} must be between 10 and 86400 seconds.`)
  return parsed
}

export function loadRedisConfig(env: NodeJS.ProcessEnv = process.env): RedisConfig | undefined {
  const raw = env.REDIS_URL?.trim()
  const keyPrefix = env.REDIS_KEY_PREFIX?.trim() || 'zenxpos:v1:'
  if (!/^[A-Za-z0-9:_-]{1,64}$/.test(keyPrefix)) throw new Error('REDIS_KEY_PREFIX contains unsupported characters.')
  const common = {
    keyPrefix,
    profileTtlSeconds: ttl(env.PROFILE_CACHE_TTL_SECONDS, 300, 'PROFILE_CACHE_TTL_SECONDS'),
    productTtlSeconds: ttl(env.PRODUCT_CACHE_TTL_SECONDS, 120, 'PRODUCT_CACHE_TTL_SECONDS'),
  }
  if (raw) {
    const url = new URL(raw)
    const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
    if (!['redis:', 'rediss:'].includes(url.protocol)) throw new Error('REDIS_URL must use redis:// or rediss://.')
    if (!local && url.protocol !== 'rediss:') throw new Error('Remote REDIS_URL must use TLS with rediss://.')
    return { transport: 'tcp', url: url.toString(), ...common }
  }
  const restUrl = env.UPSTASH_REDIS_REST_URL?.trim()
  const restToken = env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (!restUrl && !restToken) return undefined
  if (!restUrl || !restToken) throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must both be configured.')
  const url = new URL(restUrl)
  if (url.protocol !== 'https:') throw new Error('UPSTASH_REDIS_REST_URL must use HTTPS.')
  return { transport: 'rest', url: url.toString().replace(/\/$/, ''), token: restToken, ...common }
}
