import assert from 'node:assert/strict'
import { once } from 'node:events'
import { test } from 'node:test'
import type { PrismaClient } from '@prisma/client'
import express from 'express'
import type { AuthStore } from '../../../models/auth/contracts.ts'
import type { AuthService } from '../../auth/service.ts'
import { createComplimentaryRouter } from '../router.ts'

test('complimentary rules enforce manager approval configuration and tenant isolation', async t => {
  const rows: Array<Record<string, unknown>> = []
  const rules = {
    async create({ data }: { data: Record<string, unknown> }) {
      const row = { ...data, id: BigInt(rows.length + 1), created_at: new Date() }
      rows.push(row)
      return row
    },
    async findMany({ where }: { where: { client_id: bigint } }) {
      return rows.filter(row => row.client_id === where.client_id)
    },
    async updateMany({ where, data }: { where: { id: bigint; client_id: bigint }; data: Record<string, unknown> }) {
      const row = rows.find(candidate => candidate.id === where.id && candidate.client_id === where.client_id)
      if (row) Object.assign(row, data)
      return { count: Number(!!row) }
    },
  }
  const tx = { complimentaryRules: rules }
  const db = {
    ...tx,
    $transaction: (run: (client: typeof tx) => Promise<unknown>) => run(tx),
  } as unknown as PrismaClient
  const auth = {
    authenticate: async (header: string) => {
      const tenant = Number(header.split(' ')[1])
      return { client: { id: BigInt(tenant) }, user: { id: BigInt(tenant), roleId: tenant } }
    },
    clock: () => ({ serverTime: new Date().toISOString(), timeZone: 'UTC' }),
  } as unknown as AuthService
  const authStore = {
    listPermissions: async (_client: bigint, role: number) => role === 3 ? [] :
      [{ feature: 'Sales', subFeature: 'Bill Buster', view: 1, add: 1, edit: 1 }],
  } as unknown as AuthStore
  const app = express().use(express.json()).use('/api', createComplimentaryRouter(auth, authStore, db))
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const { port } = address
  async function post(route: string, payload: object, expected: number, tenant = 1) {
    const result = await fetch(`http://127.0.0.1:${port}/api/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tenant}` },
      body: JSON.stringify(payload),
    })
    const body = await result.json()
    assert.equal(result.status, expected, JSON.stringify(body))
    return body
  }
  const input = {
    name: 'Manager comp', reason: 'recovery', description: '', orderType: 'dine-in',
    type: 'bill', categoryId: null, itemId: null, maxQuantity: null, maxBillValue: null,
    approvalRequired: true, validFrom: null, validTo: null, status: 1,
  }
  await post('createComplimentaryRule', { ...input, approvalRequired: false }, 422)
  await post('createComplimentaryRule', { ...input, validFrom: '2026-02-30' }, 422)
  const { data: rule } = await post('createComplimentaryRule', input, 200)
  assert.equal(rule.id, 1)
  assert.equal((await post('getComplimentaryRules', {}, 200, 2)).data.rows.length, 0)
  await post('getComplimentaryRules', {}, 403, 3)
  await post('deactivateComplimentaryRule', { id: rule.id }, 404, 2)
  await post('deactivateComplimentaryRule', { id: rule.id }, 200)
  assert.equal((await post('getComplimentaryRules', {}, 200)).data.rows[0].status, 0)
})
