import assert from 'node:assert/strict'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import express from 'express'
import { legacyInput } from '../../../middlewares/http/legacy-input.ts'
import { createDatabase } from '../../../models/database/client.ts'
import { loadDatabaseConfig } from '../../../models/database/config.ts'
import type { AuthStore } from '../../../models/auth/contracts.ts'
import { ApiError, type AuthService } from '../../auth/service.ts'
import { createComboRouter } from '../router.ts'

const url = process.env.COMBO_TEST_DATABASE_URL

test('combo SQL and API persist definitions across restart, isolate tenants, and allow archive', { skip: !url }, async t => {
  const target = new URL(url!)
  assert.match(target.pathname, /^\/combo_test_[a-z0-9_]+$/, 'Use a fresh disposable combo_test_* database')
  const config = loadDatabaseConfig({ DATABASE_URL: url, DB_SSL: 'false' })!
  const initial = createDatabase(config)
  t.after(() => initial.close())
  const fixture = [
    `CREATE TABLE products (id BIGINT UNSIGNED PRIMARY KEY, client_id BIGINT UNSIGNED, product_full_name VARCHAR(255),
      product_image VARCHAR(255), status TINYINT DEFAULT 1, trash TINYINT DEFAULT 0)`,
    `CREATE TABLE product_variants (id BIGINT UNSIGNED PRIMARY KEY, product_id BIGINT UNSIGNED, client_id BIGINT UNSIGNED,
      pack_size VARCHAR(255), variant_code VARCHAR(255), sale_price DOUBLE, status TINYINT DEFAULT 1, trash TINYINT DEFAULT 0)`,
    'CREATE TABLE product_controls (product_id BIGINT UNSIGNED, client_id BIGINT UNSIGNED, is_combo TINYINT)',
    "INSERT INTO products (id,client_id,product_full_name) VALUES (1,1,'Meal'),(2,1,'Fries'),(3,1,'Cola'),(4,2,'Other tenant')",
    "INSERT INTO product_variants (id,product_id,client_id,pack_size,variant_code,sale_price) VALUES (11,1,1,'Small','M1',80),(12,1,1,'Large','M2',100),(21,2,1,'Single','F1',30),(31,3,1,'Can','C1',20),(41,4,2,'Single','O1',10)",
    'INSERT INTO product_controls VALUES (1,1,1),(2,1,0),(3,1,0),(4,2,0)',
  ]
  const ddl = await readFile(new URL('../../../../deploy/sql/20261123_combo_management.sql', import.meta.url), 'utf8')
  for (const statement of [...fixture, ...ddl.split(';').map(sql => sql.trim()).filter(Boolean)]) {
    await initial.prisma.$executeRawUnsafe(statement)
  }
  await initial.close()

  async function start() {
    const db = createDatabase(config)
    const auth = {
      async authenticate(header?: string) {
        if (header !== 'Bearer 1' && header !== 'Bearer 2') throw new ApiError(401, 'Authorization required.')
        return { client: { id: BigInt(header.slice(-1)) }, user: { roleId: 1 } }
      },
      clock: () => ({ serverTime: new Date().toISOString(), timeZone: 'UTC' }),
    } as unknown as AuthService
    const store = { listPermissions: async () => [{ feature: 'Products', view: 1, add: 1, edit: 1 }] } as unknown as AuthStore
    const images = { async save() { throw new Error('Unexpected image') }, async remove() {} }
    const app = express().use(express.json()).use(legacyInput).use('/api', createComboRouter(auth, store, db.prisma, images, 'http://localhost'))
    const server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    t.after(async () => {
      if (server.listening) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
      await db.close()
    })
    return {
      async post(path: string, body: object, status = 200, tenant = '1') {
        const response = await fetch(`http://127.0.0.1:${address.port}/api/${path}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tenant}` },
          body: JSON.stringify(body),
        })
        const text = await response.text()
        assert.equal(response.status, status, text)
        return JSON.parse(text).data
      },
      async close() {
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
        await db.close()
      },
    }
  }

  const first = await start()
  const { post } = first
  assert.equal((await post('getComboParents', { search: 'M2' })).rows[0].id, '12')
  assert.deepEqual((await post('getComboComponents', { search: 'Meal' })).rows, [])
  assert.deepEqual((await post('getComboComponents', { search: 'Other' })).rows, [])
  assert.equal((await post('getComboComponents', { search: '', pageSize: 1 })).hasMore, true)
  assert.equal((await post('getComboComponents', { pageSize: 1, page: 2 })).rows[0].id, '21')
  const fixed = {
    parentVariantId: '11', comboName: 'Value Meal', comboType: 'fixed', sellingPrice: '55.00', status: 1,
    items: [{ variantId: '21', quantity: 2 }],
  }
  const saved = await post('addCombo', { ...fixed, description: '', originalPrice: 999 })
  assert.equal(saved.description, '')
  assert.equal(saved.originalPrice, '60.00')
  await post('addCombo', fixed, 409)
  await post('addCombo', { ...fixed, parentVariantId: '12', items: [{ variantId: '41', quantity: 2 }] }, 422)
  const custom = {
    parentVariantId: '12', comboName: 'Build a Meal', comboType: 'customizable', sellingPrice: '80', status: 0,
    groups: [{ name: 'Choose a side', min: 1, max: 1, variantIds: ['21', '31'] }],
  }
  await post('addCombo', { ...custom, groups: [{ ...custom.groups[0], min: 2 }] }, 422)
  const customizable = await post('addCombo', custom)
  assert.equal(customizable.originalPrice, null)
  await first.close()

  const restarted = await start()
  const after = restarted.post
  assert.deepEqual((await after('getComboById', { id: saved.id })).items, [{ itemId: '21', quantity: 2 }])
  assert.deepEqual((await after('getComboById', { id: customizable.id })).groups[0].itemIds, ['21', '31'])
  assert.equal((await after('getCombos', { search: 'Build', type: 'customizable', status: 0 })).rows[0].id, customizable.id)
  assert.equal((await after('getCombos', { search: null })).pagination.total, 2)
  assert.equal((await after('getCombos', { pageSize: 1, page: 2 })).rows[0].id, saved.id)
  assert.equal((await after('getCombos', {}, 200, '2')).pagination.total, 0)
  await after('getComboById', { id: saved.id }, 404, '2')
  await after('archiveCombo', { id: saved.id }, 404, '2')
  const edited = await after('updateCombo', { ...fixed, id: saved.id, status: 0, sellingPrice: '19', items: [{ variantId: '31', quantity: 1 }] })
  assert.deepEqual(edited.items, [{ itemId: '31', quantity: 1 }])
  assert.equal(edited.originalPrice, '20.00')
  assert.equal(edited.status, 0)
  const editedCustom = await after('updateCombo', { ...custom, id: customizable.id,
    groups: [{ name: 'Optional drink', min: 0, max: 1, variantIds: ['31'] }] })
  assert.equal(editedCustom.groups[0].min, 0)
  assert.deepEqual(editedCustom.groups[0].itemIds, ['31'])
  await after('archiveCombo', { id: saved.id })
  await after('getComboById', { id: saved.id }, 404)
  assert.equal((await after('getCombos', {})).pagination.total, 1)
  assert.notEqual((await after('addCombo', fixed)).id, saved.id)
})
