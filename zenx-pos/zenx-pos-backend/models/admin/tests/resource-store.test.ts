import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PrismaClient } from '@prisma/client'
import { PrismaAdminStore } from '../prisma-store.ts'

test('admin resource queries preserve multi-field search, parent filters, and composite duplicates', async () => {
  const calls: Array<{ operation: string; args: Record<string, unknown> }> = []
  const delegate = {
    findMany: async (args: Record<string, unknown>) => { calls.push({ operation: 'list', args }); return [] },
    count: async (args: Record<string, unknown>) => { calls.push({ operation: 'count', args }); return 0 },
    findFirst: async (args: Record<string, unknown>) => { calls.push({ operation: 'duplicate', args }); return { id: 1n } },
  }
  const prisma = { admins: delegate, subFeatures: delegate } as unknown as PrismaClient
  const store = new PrismaAdminStore(prisma)

  await store.list('admins', ['name', 'mobile'], '98', 1, {}, 1, 25)
  await store.list('subFeatures', ['sub_feature'], '', undefined, { feature_id: 7n }, 1, 25)
  assert.equal(await store.findDuplicate('subFeatures', { feature_id: 7n, sub_feature: 'Sales' }), true)

  const adminWhere = calls.find((call) => call.operation === 'list')!.args.where as Record<string, unknown>
  assert.deepEqual(adminWhere.OR, [{ name: { startsWith: '98' } }, { mobile: { startsWith: '98' } }])
  const filtered = calls.filter((call) => call.operation === 'list')[1]!.args.where as Record<string, unknown>
  assert.equal(filtered.feature_id, 7n)
  const duplicate = calls.find((call) => call.operation === 'duplicate')!.args.where as Record<string, unknown>
  assert.deepEqual(duplicate, { feature_id: 7n, sub_feature: 'Sales', trash: 0 })
})
