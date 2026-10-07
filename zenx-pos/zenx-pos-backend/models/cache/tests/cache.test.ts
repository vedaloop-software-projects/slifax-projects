import assert from 'node:assert/strict'
import { test } from 'node:test'
import { RedisJsonCache, productCacheKey, productListCacheKey, productVersionKey } from '../cache-aside.ts'
import { loadRedisConfig } from '../config.ts'
import type { RedisClient } from '../client.ts'

class FakeRedis {
  values = new Map<string, string>()
  ttls = new Map<string, number>()
  async get(key: string) { return this.values.get(key) ?? null }
  async set(key: string, value: string, options: { EX: number }) { this.values.set(key, value); this.ttls.set(key, options.EX); return 'OK' }
  async del(key: string) { return this.values.delete(key) ? 1 : 0 }
  async incr(key: string) { const value = Number(this.values.get(key) ?? 0) + 1; this.values.set(key, String(value)); return value }
}

test('Redis configuration is optional and requires TLS for remote hosts', () => {
  assert.equal(loadRedisConfig({}), undefined)
  assert.throws(() => loadRedisConfig({ REDIS_URL: 'redis://cache.example.com:6379' }), /must use TLS/)
  assert.deepEqual(loadRedisConfig({ REDIS_URL: 'redis://localhost:6379', PROFILE_CACHE_TTL_SECONDS: '60' }), {
    url: 'redis://localhost:6379', keyPrefix: 'zenxpos:v1:', profileTtlSeconds: 60, productTtlSeconds: 120,
  })
})

test('cache-aside coalesces concurrent misses, uses TTL and supports invalidation', async () => {
  const redis = new FakeRedis()
  const cache = new RedisJsonCache(redis as unknown as RedisClient, 'test:')
  let loads = 0
  const loader = async () => { loads++; await new Promise((resolve) => setTimeout(resolve, 5)); return { id: 7, name: 'Tea' } }
  const [first, second] = await Promise.all([cache.getOrLoad('profile:7', 30, loader), cache.getOrLoad('profile:7', 30, loader)])
  assert.deepEqual(first, second)
  assert.equal(loads, 1)
  assert.equal(redis.ttls.get('test:profile:7'), 30)
  assert.deepEqual(await cache.get('profile:7'), { id: 7, name: 'Tea' })
  await cache.delete('profile:7')
  assert.equal(await cache.get('profile:7'), undefined)
})

test('product cache keys are tenant and generation scoped', async () => {
  const redis = new FakeRedis()
  const cache = new RedisJsonCache(redis as unknown as RedisClient, 'test:')
  assert.equal(productVersionKey(7n), 'products-version:7')
  assert.equal(productCacheKey(7n, 9n, 3), 'product:7:v3:9')
  assert.equal(productListCacheKey(7n, 'abc123', 3), 'products:7:v3:abc123')
  assert.equal(await cache.increment(productVersionKey(7n)), 1)
  assert.equal(await cache.increment(productVersionKey(7n)), 2)
})
