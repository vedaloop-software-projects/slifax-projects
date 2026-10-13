import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Prisma } from '@prisma/client'
import { allowsNegativeInventory, decrementVariantStock } from '../stock-policy.ts'

test('negative inventory is enabled by default when billing settings are absent', async () => {
  const database = { billingSettings: { findFirst: async () => null } }
  assert.equal(await allowsNegativeInventory(database as unknown as Prisma.TransactionClient, 8n), true)
})

test('negative inventory can be explicitly disabled', async () => {
  const database = { billingSettings: { findFirst: async () => ({ allow_negative_inventory: 0 }) } }
  assert.equal(await allowsNegativeInventory(database as unknown as Prisma.TransactionClient, 8n), false)
})

test('strict stock decrements include an atomic available-quantity guard', async () => {
  let request: Record<string, unknown> | undefined
  const database = { productVariants: { updateMany: async (value: Record<string, unknown>) => { request = value; return { count: 0 } } } }
  const changed = await decrementVariantStock(database as unknown as Prisma.TransactionClient, {
    clientId: 8n, productId: 2n, variantId: 3n, quantity: 4, allowNegative: false,
  })
  assert.equal(changed, false)
  assert.deepEqual((request?.where as Record<string, unknown>).variant_qty, { gte: 4 })
})

test('enabled negative inventory decrements without an available-quantity guard', async () => {
  let request: Record<string, unknown> | undefined
  const database = { productVariants: { updateMany: async (value: Record<string, unknown>) => { request = value; return { count: 1 } } } }
  const changed = await decrementVariantStock(database as unknown as Prisma.TransactionClient, {
    clientId: 8n, productId: 2n, variantId: 3n, quantity: 4, allowNegative: true,
  })
  assert.equal(changed, true)
  assert.equal('variant_qty' in (request?.where as Record<string, unknown>), false)
  assert.deepEqual((request?.data as Record<string, unknown>).variant_qty, { decrement: 4 })
})
