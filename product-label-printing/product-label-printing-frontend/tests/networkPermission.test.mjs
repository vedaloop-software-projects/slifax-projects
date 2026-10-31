import { test } from 'node:test'
import assert from 'node:assert/strict'

const { unreachableMessage, queryNetworkPermission, BLOCKED_STEPS } = await import('../src/print/localAgent.ts')

test('connection errors say whether the browser blocks the agent or the agent is not running', () => {
  assert.equal(unreachableMessage('denied'), BLOCKED_STEPS)
  assert.match(BLOCKED_STEPS, /Site settings → set Local network access .* to Allow/)
  assert.match(unreachableMessage('prompt'), /choose "Allow"/)
  assert.match(unreachableMessage('granted'), /installed and running/)
  assert.match(unreachableMessage('unknown'), /installed and running/)
})

test('permission state combines every name Chrome knows, so loopback is not missed', async () => {
  const tried = []
  const browser = (states) => Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { permissions: { query: async ({ name }) => { tried.push(name); if (!(name in states)) throw new TypeError('unknown permission'); return { state: states[name], addEventListener() {} } } } },
  })
  browser({ 'local-network-access': 'denied' })
  assert.equal((await queryNetworkPermission()).state, 'denied')
  assert.deepEqual(tried, ['loopback-network', 'local-network-access', 'local-network'])
  // "Local network" allowed, but the agent's loopback address still needs its own Allow.
  browser({ 'local-network': 'granted', 'loopback-network': 'prompt' })
  assert.equal((await queryNetworkPermission()).state, 'prompt')
  browser({ 'local-network': 'granted', 'loopback-network': 'granted' })
  const both = await queryNetworkPermission()
  assert.equal(both.state, 'granted')
  assert.equal(both.statuses.length, 2, 'every status is returned so the page can watch each one')
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
  assert.equal((await queryNetworkPermission()).state, 'unknown', 'browsers without the API')
})

test('a request that waited on the Allow prompt is retried once access is granted', async () => {
  const memory = new Map([['label-print-agent-v1', JSON.stringify({ token: 't'.repeat(43), printers: {} })]])
  globalThis.localStorage = { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v), removeItem: (k) => memory.delete(k) }
  let state = 'prompt'
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { permissions: { query: async ({ name }) => { if (name !== 'local-network-access') throw new TypeError('unknown'); return { state } } } } })
  const { localPrinters } = await import('../src/print/localAgent.ts')
  const realFetch = globalThis.fetch
  let calls = 0
  try {
    globalThis.fetch = async () => { calls++; if (calls === 1) { state = 'granted'; throw new TypeError('Failed to fetch') } return new Response(JSON.stringify({ printers: ['TVS'] })) }
    assert.deepEqual(await localPrinters(), ['TVS'])
    assert.equal(calls, 2)
  } finally {
    globalThis.fetch = realFetch
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
  }
})

test('an agent that answers but refuses this website is reported as not paired, not as blocked', async () => {
  const { diagnoseUnreachable } = await import('../src/print/localAgent.ts')
  const realFetch = globalThis.fetch
  try {
    globalThis.fetch = async (_url, init) => { if (init?.mode === 'no-cors') return new Response(null, { status: 200 }); throw new TypeError('Failed to fetch') }
    assert.match(await diagnoseUnreachable('granted'), /is running, but this website .* is not paired/)
    assert.match(await diagnoseUnreachable('denied'), /Site settings/, 'a blocked browser cannot reach it at all')
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
    assert.match(await diagnoseUnreachable('granted'), /installed and running/)
  } finally {
    globalThis.fetch = realFetch
  }
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
