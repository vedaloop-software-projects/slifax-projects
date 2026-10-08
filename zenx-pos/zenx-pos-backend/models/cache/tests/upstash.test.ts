import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createUpstashRedisClient } from '../upstash.ts'

test('Upstash REST client encodes Redis commands and never places its token in the body', async () => {
  const calls: unknown[][] = []
  const request = async (_url: string | URL | Request, init?: RequestInit) => {
    calls.push(JSON.parse(String(init?.body)) as unknown[])
    assert.equal((init?.headers as Record<string, string>).authorization, 'Bearer secret')
    assert.doesNotMatch(String(init?.body), /secret/)
    return new Response(JSON.stringify({ result: calls.length === 1 ? 'OK' : 1 }), { status: 200 })
  }
  const client = createUpstashRedisClient('https://cache.example.com', 'secret', request as typeof fetch)
  await client.set('otp:1', 'value', { EXAT: 123 })
  await client.eval('return 1', { keys: ['otp:1'], arguments: ['value'] })
  assert.deepEqual(calls, [
    ['SET', 'otp:1', 'value', 'EXAT', 123],
    ['EVAL', 'return 1', 1, 'otp:1', 'value'],
  ])
})
