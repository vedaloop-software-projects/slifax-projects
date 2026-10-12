import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadDatabaseConfig } from '../config.ts'

const url = 'mysql://user:p%40ss%3Aword@sample.example.com:4000/zenxpos_dev'

test('database config is optional and decodes credentials while enforcing verified TLS', () => {
  assert.equal(loadDatabaseConfig({}), null)
  const config = loadDatabaseConfig({ DATABASE_URL: url })!
  assert.equal(config.adapter.password, 'p@ss:word')
  assert.equal(config.adapter.database, 'zenxpos_dev')
  assert.equal(config.adapter.port, 4000)
  assert.equal(config.adapter.connectionLimit, 5)
  assert.equal(config.adapter.ssl?.rejectUnauthorized, true)
  assert.match(config.url, /sslaccept=strict/)
})

test('unsafe TLS and invalid connection settings fail before opening a connection', () => {
  assert.throws(() => loadDatabaseConfig({ DATABASE_URL: url, DB_SSL: 'false' }), /TLS is required/)
  assert.throws(() => loadDatabaseConfig({ DATABASE_URL: url + '?sslaccept=accept_invalid_certs' }), /strict TLS/)
  assert.throws(() => loadDatabaseConfig({ DATABASE_URL: url, DB_POOL_SIZE: '0' }), /DB_POOL_SIZE/)
  assert.throws(() => loadDatabaseConfig({ DATABASE_URL: url + '?connect_timeout=-1' }), /connect_timeout/)
  assert.throws(() => loadDatabaseConfig({ DATABASE_URL: url, DB_TIMEZONE: 'not-a-zone' }), /DB_TIMEZONE/)
  assert.throws(() => loadDatabaseConfig({ DATABASE_URL: 'postgres://u:p@host/db' }), /MySQL/)
  assert.throws(() => loadDatabaseConfig({ DATABASE_URL: url + '?socket=/tmp/db' }), /Unsupported/)
  assert.throws(() => loadDatabaseConfig({ DATABASE_URL: 'mysql://user:p%ZZ@host/db' }), /percent encoding/)
})

test('local MySQL can explicitly disable TLS and URL pool options use the correct units', () => {
  const config = loadDatabaseConfig({ DATABASE_URL: 'mysql://root@localhost/zenxpos_test?connection_limit=3&connect_timeout=7&pool_timeout=8', DB_SSL: 'false' })!
  assert.equal(config.adapter.ssl, undefined)
  assert.equal(config.adapter.port, 3306)
  assert.equal(config.adapter.connectionLimit, 3)
  assert.equal(config.adapter.connectTimeout, 7000)
  assert.equal(config.adapter.acquireTimeout, 8000)
})

test('a private Docker MySQL hostname requires an explicit plaintext opt-in', () => {
  const databaseUrl = 'mysql://zenxpos:secret@mysql:3306/zenxpos_staging'
  assert.throws(() => loadDatabaseConfig({ DATABASE_URL: databaseUrl, DB_SSL: 'false' }), /TLS is required/)
  const config = loadDatabaseConfig({ DATABASE_URL: databaseUrl, DB_SSL: 'false', DB_ALLOW_PLAINTEXT_PRIVATE: 'true' })!
  assert.equal(config.adapter.host, 'mysql')
  assert.equal(config.adapter.ssl, undefined)
})
