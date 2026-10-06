import { readFileSync } from 'node:fs'

function positiveInteger(value: string | undefined | null, fallback: number, key: string, maximum: number) {
  const raw = value ?? String(fallback)
  if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > maximum) throw new Error(`${key} must be an integer from 1 to ${maximum}`)
  return Number(raw)
}

export function loadDatabaseConfig(env: NodeJS.ProcessEnv = process.env) {
  if (!env.DATABASE_URL?.trim()) return null
  let url: URL
  try { url = new URL(env.DATABASE_URL) } catch { throw new Error('DATABASE_URL must be a valid mysql:// connection URL') }
  if (url.protocol !== 'mysql:' || !url.hostname || !url.username || !/^\/[^/]+$/.test(url.pathname)) throw new Error('DATABASE_URL needs a MySQL host, user and database name')
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (!local && !url.password) throw new Error('A remote DATABASE_URL requires a password')
  for (const key of url.searchParams.keys()) {
    if (!['sslaccept', 'sslcert', 'connection_limit', 'connect_timeout', 'pool_timeout', 'socket_timeout'].includes(key)) throw new Error(`Unsupported DATABASE_URL option: ${key}`)
  }
  if (url.searchParams.has('sslaccept') && url.searchParams.get('sslaccept') !== 'strict') throw new Error('Only strict TLS certificate validation is supported')
  const tls = env.DB_SSL ?? 'true'
  if (!['true', 'false'].includes(tls)) throw new Error('DB_SSL must be true or false')
  if (!local && tls !== 'true') throw new Error('TLS is required for a remote database')
  if (tls === 'false' && (url.searchParams.has('sslaccept') || url.searchParams.has('sslcert'))) throw new Error('DATABASE_URL requests TLS but DB_SSL is false')
  if (tls === 'true') url.searchParams.set('sslaccept', 'strict')
  const timezone = env.DB_TIMEZONE ?? '+05:30'
  if (!/^[+-](?:0\d|1[0-3]):[0-5]\d$/.test(timezone)) throw new Error('DB_TIMEZONE must be a numeric offset, such as +05:30')
  const caPath = env.DB_SSL_CA?.trim() || url.searchParams.get('sslcert')
  if (caPath && tls === 'false') throw new Error('DB_SSL_CA requires TLS')
  if (caPath) url.searchParams.set('sslcert', caPath)
  let user: string, password: string, database: string
  try {
    user = decodeURIComponent(url.username)
    password = decodeURIComponent(url.password)
    database = decodeURIComponent(url.pathname.slice(1))
  } catch { throw new Error('DATABASE_URL contains invalid percent encoding') }
  return {
    url: url.toString(),
    adapter: {
      host: url.hostname.replace(/^\[|\]$/g, ''), user, password, database,
      port: positiveInteger(url.port || undefined, 3306, 'database port', 65535),
      connectionLimit: positiveInteger(env.DB_POOL_SIZE ?? url.searchParams.get('connection_limit'), 5, 'DB_POOL_SIZE', 100),
      connectTimeout: positiveInteger(url.searchParams.get('connect_timeout'), 10, 'connect_timeout', 120) * 1000,
      acquireTimeout: positiveInteger(url.searchParams.get('pool_timeout'), 10, 'pool_timeout', 120) * 1000,
      socketTimeout: positiveInteger(url.searchParams.get('socket_timeout'), 30, 'socket_timeout', 120) * 1000,
      timezone,
      ...(tls === 'true' ? { ssl: { rejectUnauthorized: true, minVersion: 'TLSv1.2' as const, ...(caPath ? { ca: readFileSync(caPath, 'utf8') } : {}) } } : {}),
    },
    transaction: {
      maxWait: positiveInteger(env.DB_TRANSACTION_WAIT_MS, 5000, 'DB_TRANSACTION_WAIT_MS', 120_000),
      timeout: positiveInteger(env.DB_TRANSACTION_TIMEOUT_MS, 10_000, 'DB_TRANSACTION_TIMEOUT_MS', 120_000),
    },
  }
}

export type DatabaseConfig = NonNullable<ReturnType<typeof loadDatabaseConfig>>
