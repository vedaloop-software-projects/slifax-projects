import type { RedisClient } from './client.ts'

export interface JsonCache {
  get<T>(key: string): Promise<T | undefined>
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>
  delete(key: string): Promise<void>
  increment(key: string): Promise<number | undefined>
  getOrLoad<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T>
}

export class RedisJsonCache implements JsonCache {
  private readonly pending = new Map<string, Promise<unknown>>()
  private readonly client: RedisClient
  private readonly prefix: string
  constructor(client: RedisClient, prefix: string) { this.client = client; this.prefix = prefix }
  private key(key: string) { return this.prefix + key }

  async get<T>(key: string) {
    try {
      const value = await this.client.get(this.key(key))
      if (value === null) return undefined
      return JSON.parse(value) as T
    } catch { return undefined }
  }
  async set(key: string, value: unknown, ttlSeconds: number) {
    try { await this.client.set(this.key(key), JSON.stringify(value), { EX: ttlSeconds }) } catch {}
  }
  async delete(key: string) { try { await this.client.del(this.key(key)) } catch {} }
  async increment(key: string) { try { return await this.client.incr(this.key(key)) } catch { return undefined } }

  async getOrLoad<T>(key: string, ttlSeconds: number, loader: () => Promise<T>) {
    const cached = await this.get<T>(key)
    if (cached !== undefined) return cached
    const running = this.pending.get(key) as Promise<T> | undefined
    if (running) return running
    const operation = loader().then(async (value) => { await this.set(key, value, ttlSeconds); return value })
      .finally(() => { this.pending.delete(key) })
    this.pending.set(key, operation)
    return operation
  }
}

export function profileCacheKey(clientId: bigint) { return `profile:${clientId}` }
export function productVersionKey(clientId: bigint) { return `products-version:${clientId}` }
export function productCacheKey(clientId: bigint, productId: bigint, version: number) { return `product:${clientId}:v${version}:${productId}` }
export function productListCacheKey(clientId: bigint, queryHash: string, version: number) { return `products:${clientId}:v${version}:${queryHash}` }
