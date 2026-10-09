import { test } from 'node:test'
import assert from 'node:assert/strict'

const { isIdle, IDLE_LIMIT_MS } = await import('../src/lib/idle.ts')

test('signs out only after 5 minutes without activity', () => {
  assert.equal(IDLE_LIMIT_MS, 5 * 60 * 1000)
  const now = 1_000_000_000
  assert.equal(isIdle(now - 4 * 60 * 1000, now), false)
  assert.equal(isIdle(now - 5 * 60 * 1000, now), true)
  assert.equal(isIdle(null, now), false) // never recorded: not idle (a fresh sign-in records it)
})
