import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { loadConfig } from './models/system/config.ts'
import { createApp } from './routes/system/app.ts'
import { loadDatabaseConfig } from './models/database/config.ts'
import { createDatabase } from './models/database/client.ts'
import { loadAuthConfig } from './models/auth/config.ts'
import { PrismaAuthStore } from './models/auth/prisma-store.ts'
import { AuthService } from './routes/auth/service.ts'
import { createAuthRouter } from './routes/auth/router.ts'
import { PrismaAccountStore } from './models/account/prisma-store.ts'
import { AccountService } from './routes/account/service.ts'
import { createAccountRouter } from './routes/account/router.ts'
import { DiskLogoStorage } from './models/account/logo-storage.ts'
import { loadResetConfig } from './models/reset/config.ts'
import { PrismaResetStore } from './models/reset/prisma-store.ts'
import { UnavailableOtpDelivery, WebhookOtpDelivery } from './models/reset/delivery.ts'
import { ResetService } from './routes/reset/service.ts'
import { createResetRouter } from './routes/reset/router.ts'
import { loadRedisConfig } from './models/cache/config.ts'
import { createRedis } from './models/cache/client.ts'
import { RedisJsonCache } from './models/cache/cache-aside.ts'
import { RedisResetStore } from './models/reset/redis-store.ts'

const config = loadConfig()
const databaseConfig = loadDatabaseConfig()
const database = databaseConfig ? createDatabase(databaseConfig) : undefined
const redisConfig = loadRedisConfig()
const redis = redisConfig ? await createRedis(redisConfig) : undefined
const cache = redis && redisConfig ? new RedisJsonCache(redis.client, redisConfig.keyPrefix) : undefined
const publicDirectory = resolve(process.env.UPLOAD_ROOT ?? 'public')
const apiRouters = database ? (() => {
  const authConfig = loadAuthConfig()
  const resetConfig = loadResetConfig(authConfig.jwtSecret)
  const store = new PrismaAuthStore(database.prisma, authConfig.publicBaseUrl, cache, redisConfig?.profileTtlSeconds)
  const auth = new AuthService(store, authConfig)
  const account = new AccountService(new PrismaAccountStore(database.prisma, cache), Number(process.env.AUDIT_PAGE_SIZE ?? 25), new DiskLogoStorage(publicDirectory))
  const delivery = resetConfig.deliveryUrl ? new WebhookOtpDelivery(resetConfig.deliveryUrl, resetConfig.deliveryToken) : new UnavailableOtpDelivery()
  const resetStore = redis && redisConfig
    ? new RedisResetStore(database.prisma, redis.client, redisConfig.keyPrefix)
    : new PrismaResetStore(database.prisma)
  const reset = new ResetService(resetStore, delivery, resetConfig)
  return [createAuthRouter(auth), createAccountRouter(auth, account), createResetRouter(reset)]
})() : undefined
const readiness = database ? { async check() { await database.check(); await redis?.check() } } : undefined
const server = createServer(createApp(readiness, apiRouters, publicDirectory))

server.on('error', (error) => {
  console.error('ZenxPOS startup failed:', error.message)
  process.exitCode = 1
  void Promise.allSettled([database?.close(), redis?.close()]).then((results) => {
    if (results.some((result) => result.status === 'rejected')) process.exitCode = 1
  })
})

server.listen(config.port, config.host, () => {
  console.log(`ZenxPOS API listening on http://${config.host}:${config.port}`)
})

let stopping = false
function shutdown() {
  if (stopping) return
  stopping = true
  const timeout = setTimeout(() => process.exit(1), 10_000).unref()
  server.close(async (error) => {
    try { await Promise.all([database?.close(), redis?.close()]) } catch { process.exitCode = 1 }
    finally {
      clearTimeout(timeout)
      if (error) process.exitCode = 1
    }
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
