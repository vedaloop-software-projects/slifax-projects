import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { checkBaseline, migrations, parseBaseline, renderBaseline } from './baseline.mjs'

const sum = (character) => character.repeat(64)

test('baseline records round-trip and only later migrations are pending', () => {
  const recorded = parseBaseline(renderBaseline([{ name: '20261013_a.sql', checksum: sum('a') }, { name: '20261029_b.sql', checksum: sum('b') }]))
  assert.deepEqual(recorded.map((row) => row.name), ['20261013_a.sql', '20261029_b.sql'])
  const result = checkBaseline(recorded, [...recorded, { name: '20261101_c.sql', checksum: sum('c') }])
  assert.deepEqual(result, { problems: [], pending: ['20261101_c.sql'] })
})

test('edited, deleted or back-dated migrations are rejected', () => {
  const recorded = [{ name: '20261013_a.sql', checksum: sum('a') }, { name: '20261029_b.sql', checksum: sum('b') }]
  const { problems } = checkBaseline(recorded, [{ name: '20261013_a.sql', checksum: sum('f') }, { name: '20261020_late.sql', checksum: sum('c') }])
  assert.equal(problems.length, 3)
  assert.match(problems.join('\n'), /changed after it was baselined/)
  assert.match(problems.join('\n'), /20261029_b\.sql no longer exists/)
  assert.match(problems.join('\n'), /20261020_late\.sql sorts before/)
})

test('the committed baseline matches the committed migrations', () => {
  const recorded = parseBaseline(readFileSync(new URL('../../deploy/mysql-init/003-migration-baseline.sql', import.meta.url), 'utf8'))
  assert.deepEqual(checkBaseline(recorded, migrations()).problems, [])
})
