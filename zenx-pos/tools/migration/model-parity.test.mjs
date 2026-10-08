import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkModelParity } from './model-parity.mjs'
test('Laravel model mappings match Prisma except the documented stale duplicate', async () => { const results = await checkModelParity(); assert.equal(results.length, 93); assert.equal(results.filter(result => result.ok).length, 92); assert.deepEqual(results.filter(result => !result.ok).map(result => ({ file: result.file, table: result.table, missing: result.missing })), [{ file: 'kit_bill_tran.php', table: 'kot_bill_tran', missing: ['bill_id', 'kot_id', 'discount', 'tax', 'amount'] }]) })
