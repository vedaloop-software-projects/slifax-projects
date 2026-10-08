import { test } from 'node:test'
import assert from 'node:assert/strict'

const { unreachableMessage, queryNetworkPermission, BLOCKED_STEPS } = await import('../src/print/localAgent.ts')

test('connection errors say whether the browser blocks the agent or the agent is not running', () => {
  assert.equal(unreachableMessage('denied'), BLOCKED_STEPS)
  assert.match(BLOCKED_STEPS, /Site settings → Local network access → Allow/)
  assert.match(unreachableMessage('prompt'), /choose "Allow"/)
  assert.match(unreachableMessage('granted'), /installed and running/)
  assert.match(unreachableMessage('unknown'), /installed and running/)
})

test('permission state falls back through the names Chrome has used', async () => {
  const tried = []
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { permissions: { query: async ({ name }) => { tried.push(name); if (name !== 'local-network-access') throw new TypeError('unknown permission'); return { state: 'denied' } } } },
  })
  const { state } = await queryNetworkPermission()
  assert.equal(state, 'denied')
  assert.deepEqual(tried, ['loopback-network', 'local-network-access'])
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
  assert.equal((await queryNetworkPermission()).state, 'unknown', 'browsers without the API')
})

test('auto-connect: the key is fetched from the agent and saved, so nobody pastes it', async () => {
  const memory = new Map()
  globalThis.localStorage = { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v), removeItem: (k) => memory.delete(k) }
  const { autoPair, agentSettings } = await import('../src/print/localAgent.ts')
  const realFetch = globalThis.fetch
  try {
    globalThis.fetch = async (url) => { assert.match(String(url), /127\.0\.0\.1:17846\/pair$/); return new Response(JSON.stringify({ token: 'k'.repeat(43) })) }
    assert.equal(await autoPair(), 'k'.repeat(43))
    assert.equal(agentSettings().token, 'k'.repeat(43), 'saved for every later login on this PC')
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Website is not paired with this agent' }), { status: 403 })
    assert.equal(await autoPair(), null, 'unpaired website: falls back to manual key')
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
    assert.equal(await autoPair(), null, 'agent missing or browser blocked')
  } finally {
    globalThis.fetch = realFetch
  }
})
