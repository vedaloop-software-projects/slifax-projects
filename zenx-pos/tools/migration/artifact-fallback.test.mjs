import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'

const directory = dirname(fileURLToPath(import.meta.url))
const missingLegacy = join(tmpdir(), `zenxpos-missing-legacy-${process.pid}`)
const environment = { ...process.env, ZENXPOS_LEGACY_ROOT: missingLegacy }

function execute(name, ...args) {
  return spawnSync(process.execPath, [join(directory, name), ...args], { encoding: 'utf8', env: environment })
}

test('migration checks validate committed artifacts without the private legacy checkout', () => {
  for (const script of ['tracker.mjs', 'schema.mjs', 'request-parity.mjs']) {
    const result = execute(script, '--check')
    assert.equal(result.status, 0, `${script}: ${result.stderr}`)
    assert.match(result.stdout, /Legacy source is unavailable; validated/)
  }
})

test('artifact regeneration still requires the legacy source', () => {
  for (const script of ['schema.mjs', 'request-parity.mjs']) {
    const result = execute(script)
    assert.equal(result.status, 1)
    assert.match(result.stderr, /Set ZENXPOS_LEGACY_ROOT/)
  }
})
