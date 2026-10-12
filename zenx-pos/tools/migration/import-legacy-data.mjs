import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import mariadb from '../../zenx-pos-backend/node_modules/mariadb/promise.js'
import { loadDatabaseConfig } from '../../zenx-pos-backend/models/database/config.ts'
import { clearConfiguredCache } from './clear-cache.mjs'

function usage() {
  console.error('Usage: node --env-file=.env ../tools/migration/import-legacy-data.mjs --dump <file> (--plan | --apply [--backup <file>])')
  process.exit(2)
}

function option(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? null : process.argv[index + 1] ?? usage()
}

const dumpPath = option('--dump')
const backupPath = option('--backup')
const apply = process.argv.includes('--apply')
const plan = process.argv.includes('--plan')
if (!dumpPath || apply === plan) usage()

const config = loadDatabaseConfig()
if (!config) throw new Error('DATABASE_URL is required.')

const sql = await readFile(resolve(dumpPath), 'utf8')
if (!sql.startsWith('-- MySQL dump')) throw new Error('The input is not a recognized MySQL dump.')
if (/['"]0000-00-00(?: 00:00:00)?['"]/.test(sql)) throw new Error('The dump contains zero dates that Prisma cannot safely read.')

const definitions = new Map()
const createPattern = /CREATE TABLE `([^`]+)` \(([\s\S]*?)\) ENGINE=/g
for (const match of sql.matchAll(createPattern)) {
  const columns = [...match[2].matchAll(/^\s*`([^`]+)`\s+/gm)].map((column) => column[1])
  definitions.set(match[1], columns)
}

const inserts = new Map()
for (const line of sql.split(/\r?\n/)) {
  const match = line.match(/^INSERT INTO `([^`]+)` VALUES ([\s\S]+);$/)
  if (!match) continue
  const statements = inserts.get(match[1]) ?? []
  statements.push(match[2])
  inserts.set(match[1], statements)
}
if (definitions.size === 0 || inserts.size === 0) throw new Error('No legacy table definitions or data inserts were found.')

function countRows(values) {
  let count = 0
  let quoted = false
  let escaped = false
  let depth = 0
  for (const character of values) {
    if (escaped) { escaped = false; continue }
    if (quoted && character === '\\') { escaped = true; continue }
    if (character === "'") { quoted = !quoted; continue }
    if (quoted) continue
    if (character === '(') { if (depth === 0) count += 1; depth += 1 }
    else if (character === ')') depth -= 1
  }
  if (quoted || depth !== 0) throw new Error('The dump contains an unterminated value expression.')
  return count
}

const connection = await mariadb.createConnection({
  host: config.adapter.host,
  port: config.adapter.port,
  user: config.adapter.user,
  password: config.adapter.password,
  database: config.adapter.database,
  connectTimeout: config.adapter.connectTimeout,
  socketTimeout: config.adapter.socketTimeout,
  ssl: config.adapter.ssl,
  bigIntAsNumber: false,
  insertIdAsNumber: false,
})

const quoteId = (value) => `\`${String(value).replaceAll('`', '``')}\``
try {
  const metadata = await connection.query(`
    SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name,
           IS_NULLABLE AS is_nullable, COLUMN_DEFAULT AS column_default, EXTRA AS extra
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `)
  const target = new Map()
  for (const row of metadata) {
    const columns = target.get(row.table_name) ?? []
    columns.push(row)
    target.set(row.table_name, columns)
  }

  const ignoredLegacyTables = new Set(['migrations'])
  const missingTables = [...definitions.keys()].filter((table) => !target.has(table) && !ignoredLegacyTables.has(table))
  const incompatible = []
  for (const [table, sourceColumns] of definitions) {
    const targetColumns = target.get(table)
    if (!targetColumns) continue
    const targetNames = new Set(targetColumns.map((column) => column.column_name))
    const removed = sourceColumns.filter((column) => !targetNames.has(column))
    const sourceNames = new Set(sourceColumns)
    const required = targetColumns
      .filter((column) => !sourceNames.has(column.column_name)
        && column.is_nullable === 'NO'
        && column.column_default === null
        && !String(column.extra).includes('auto_increment'))
      .map((column) => column.column_name)
    if (removed.length || required.length) incompatible.push({ table, removed, required })
  }

  const expected = new Map()
  for (const [table, statements] of inserts) {
    if (target.has(table)) expected.set(table, statements.reduce((sum, values) => sum + countRows(values), 0))
  }
  const expectedTotal = [...expected.values()].reduce((sum, count) => sum + count, 0)

  console.log(`Target database: ${config.adapter.database}`)
  console.log(`Legacy schema tables: ${definitions.size}`)
  console.log(`Legacy tables containing rows: ${inserts.size}`)
  console.log(`Legacy rows to import: ${expectedTotal}`)
  console.log(`Target schema tables: ${target.size}`)
  console.log(`Target-only tables to clear: ${[...target.keys()].filter((table) => !definitions.has(table) && table !== '_prisma_migrations').length}`)
  const ignoredPresent = [...definitions.keys()].filter((table) => ignoredLegacyTables.has(table) && !target.has(table))
  if (ignoredPresent.length) console.log(`Ignored Laravel framework tables: ${ignoredPresent.join(', ')}`)

  if (missingTables.length) console.error(`Missing target tables: ${missingTables.join(', ')}`)
  for (const issue of incompatible) {
    console.error(`Incompatible ${issue.table}: removed source columns [${issue.removed.join(', ')}], missing required target columns [${issue.required.join(', ')}]`)
  }
  if (missingTables.length || incompatible.length) throw new Error('The legacy data is not compatible with the current target schema.')
  if (plan) {
    console.log('Plan passed: the dump can be loaded without replacing the Prisma schema.')
    process.exit(0)
  }

  if (backupPath) {
    const backup = [
      '-- ZenxPOS pre-import target database backup',
      `-- Created: ${new Date().toISOString()}`,
      'SET FOREIGN_KEY_CHECKS=0;',
    ]
    let backupRows = 0
    for (const [table, columns] of target) {
      if (table === '_prisma_migrations') continue
      const names = columns.map((column) => column.column_name)
      const rows = await connection.query(`SELECT ${names.map(quoteId).join(',')} FROM ${quoteId(table)}`)
      backup.push(`DELETE FROM ${quoteId(table)};`)
      for (let offset = 0; offset < rows.length; offset += 250) {
        const batch = rows.slice(offset, offset + 250)
        if (!batch.length) continue
        const values = batch.map((row) => `(${names.map((name) => connection.escape(row[name])).join(',')})`).join(',')
        backup.push(`INSERT INTO ${quoteId(table)} (${names.map(quoteId).join(',')}) VALUES ${values};`)
        backupRows += batch.length
      }
    }
    backup.push('SET FOREIGN_KEY_CHECKS=1;', '')
    await writeFile(resolve(backupPath), backup.join('\n'), { encoding: 'utf8', flag: 'wx', mode: 0o600 })
    console.log(`Pre-import backup written with ${backupRows} rows.`)
  } else {
    console.log('Pre-import backup skipped by request.')
  }

  await connection.beginTransaction()
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS=0')
    for (const table of target.keys()) {
      if (table !== '_prisma_migrations') await connection.query(`DELETE FROM ${quoteId(table)}`)
    }
    for (const [table, statements] of inserts) {
      if (!target.has(table)) continue
      const columns = definitions.get(table)
      const prefix = `INSERT INTO ${quoteId(table)} (${columns.map(quoteId).join(',')}) VALUES `
      for (const values of statements) await connection.query(prefix + values)
    }
    await connection.query('SET FOREIGN_KEY_CHECKS=1')
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    try { await connection.query('SET FOREIGN_KEY_CHECKS=1') } catch {}
    throw error
  }

  let actualTotal = 0
  const mismatches = []
  for (const [table, wanted] of expected) {
    const [row] = await connection.query(`SELECT COUNT(*) AS row_count FROM ${quoteId(table)}`)
    const actual = Number(row.row_count)
    actualTotal += actual
    if (actual !== wanted) mismatches.push(`${table}: expected ${wanted}, found ${actual}`)
  }
  if (mismatches.length) throw new Error(`Post-import row-count mismatch: ${mismatches.join('; ')}`)
  console.log(`Import committed and verified: ${actualTotal} rows across ${expected.size} populated tables.`)

  try {
    console.log(`Cleared ${await clearConfiguredCache()} cached Redis keys in the configured namespace.`)
  } catch (error) {
    console.warn(`Data is imported, but Redis cache clearing failed: ${error instanceof Error ? error.message : 'unknown error'}`)
  }
} finally {
  await connection.end()
}
