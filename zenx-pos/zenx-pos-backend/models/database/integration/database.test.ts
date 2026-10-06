import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { createDatabase } from '../client.ts'
import { loadDatabaseConfig } from '../config.ts'
import { runTransaction } from '../transaction.ts'

test('Prisma connection, parameter binding, commit and rollback on a separate test database', async () => {
  assert.ok(process.env.DATABASE_TEST_URL, 'Set DATABASE_TEST_URL to a disposable database with the reconciled schema')
  const config = loadDatabaseConfig({ ...process.env, DATABASE_URL: process.env.DATABASE_TEST_URL })!
  assert.match(config.adapter.database, /_test$/, 'Integration tests require a database name ending in _test')
  const main = loadDatabaseConfig(process.env)
  assert.ok(!main || main.adapter.host !== config.adapter.host || main.adapter.port !== config.adapter.port || main.adapter.database !== config.adapter.database, 'Integration target must differ from the application database')
  const database = createDatabase(config)
  const name = `probe-${randomUUID()}`
  const injection = `${name}'; DROP TABLE business_types; --`
  let committedId: bigint | undefined
  try {
    await database.check()
    const record = await runTransaction(database.prisma, (tx) => tx.businessTypes.create({ data: { business_type: name } }))
    committedId = record.id
    assert.equal((await database.prisma.businessTypes.findUnique({ where: { id: record.id } }))?.business_type, name)
    assert.equal(await database.prisma.businessTypes.count({ where: { business_type: injection } }), 0)
    const rollback = new Error('intentional rollback')
    await assert.rejects(runTransaction(database.prisma, async (tx) => {
      await tx.businessTypes.create({ data: { business_type: name + '-rollback' } })
      throw rollback
    }), (error) => error === rollback)
    assert.equal(await database.prisma.businessTypes.count({ where: { business_type: name + '-rollback' } }), 0)
  } finally {
    try {
      if (committedId !== undefined) await database.prisma.businessTypes.delete({ where: { id: committedId } })
    } finally { await database.close() }
  }
})
