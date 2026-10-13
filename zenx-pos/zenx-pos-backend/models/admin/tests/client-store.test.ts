import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PrismaClient } from '@prisma/client'
import { PrismaClientAdminStore } from '../client-store.ts'

test('client list includes barcode overview, user counts, and email search', async () => {
  let listWhere: Record<string, unknown> = {}
  const prisma = {
    users: {
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        listWhere = where
        return [{ id: 7n, business_name: 'Demo', end_date: new Date('2030-01-01'), status: 1, trash: 0 }]
      },
      count: async ({ where }: { where: Record<string, unknown> }) => {
        if ('OR' in where) return 1
        if ('end_date' in where) return 'lt' in (where.end_date as object) ? 1 : 2
        if (where.status === 1) return 3
        return 4
      },
    },
    clientUsers: {
      groupBy: async () => [{ client_id: 7n, _count: { _all: 2 } }],
    },
  } as unknown as PrismaClient

  const result = await new PrismaClientAdminStore(prisma).list({ search: 'owner@example.test', page: 1, take: 25 })
  const searchFields = (listWhere.OR as Array<Record<string, unknown>>).flatMap((item) => Object.keys(item))

  assert.ok(searchFields.includes('email'))
  assert.equal(result.rows[0]?.user_count, 2)
  assert.deepEqual(result.summary, { total: 4, active: 3, expiring: 2, expired: 1 })
})

test('collection rows include the client and business type required by the report', async () => {
  const payment = { id: 9n, client_id: 7n, paid_amount: 250, payment_mode: 1, reference_number: null, payment_date: new Date('2026-10-08'), payment_type: 2, subscription_duration: 3, created_by: 1, updated_by: 1, created_at: null, updated_at: null }
  const prisma = {
    clientPayments: {
      findMany: async () => [payment],
      count: async () => 1,
      aggregate: async () => ({ _sum: { paid_amount: 250 } }),
    },
    users: { findMany: async () => [{ id: 7n, business_name: 'Demo Shop', business_type_id: 3 }] },
    businessTypes: { findMany: async () => [{ id: 3n, business_type: 'Retail' }] },
  } as unknown as PrismaClient

  const result = await new PrismaClientAdminStore(prisma).collections(undefined, undefined, 1, 25)

  assert.equal(result.rows[0]?.business_name, 'Demo Shop')
  assert.equal(result.rows[0]?.business_type, 'Retail')
  assert.equal(result.today, 250)
})

test('feature selection infers the active parent of selected sub-features', async () => {
  let featureIds: bigint[] = []
  const prisma = {
    subFeatures: { findMany: async () => [{ id: 5n, feature_id: 2n }] },
    features: {
      findMany: async ({ where }: { where: { id: { in: bigint[] } } }) => {
        featureIds = where.id.in
        return [{ id: 2n }]
      },
    },
  } as unknown as PrismaClient

  const result = await new PrismaClientAdminStore(prisma).selected(prisma, [], [5n])

  assert.deepEqual(featureIds, [2n])
  assert.deepEqual(result.features, [{ id: 2n }])
  assert.deepEqual(result.subs, [{ id: 5n, feature_id: 2n }])
})
