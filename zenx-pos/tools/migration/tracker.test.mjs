import assert from 'node:assert/strict'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'

function fixture(run) {
  const base = resolve(tmpdir())
  const root = mkdtempSync(join(base, 'zenx-migration-test-'))
  const project = join(root, 'zenx-pos')
  const write = (name, contents) => {
    const path = join(root, name)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, contents)
  }
  write('dev/routes/api.php', "<?php\n// Route::post('/ignored', [Login::class, 'ignored']);\nRoute::post('/login', [Login::class, 'login']);\n")
  write('dev/routes/web.php', "<?php\nRoute::match(['get', 'post'], $adminPath . '/clients', [Clients::class, 'index']);\n")
  write('dev/app/Http/Controllers/Api/Login.php', '<?php class Login {}')
  write('dev/app/Http/Controllers/admin/Clients.php', '<?php class Clients {}')
  write('zenx-pos/zenx-pos-backend/index.ts', '')
  const script = join(project, 'tools/migration/tracker.mjs')
  mkdirSync(dirname(script), { recursive: true })
  copyFileSync(fileURLToPath(new URL('./tracker.mjs', import.meta.url)), script)
  const execute = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' })
  const tracker = join(project, 'MIGRATION_TRACKER.md')
  try { run({ execute, write, tracker, root }) } finally {
    // Delete only this freshly created fixture directory within the OS temp folder.
    if (!resolve(root).startsWith(base + sep) || !root.includes('zenx-migration-test-')) throw new Error('Unsafe fixture cleanup path')
    rmSync(root, { recursive: true, force: true })
  }
}

test('inventory expands admin methods, ignores commented routes and detects new source', () => fixture(({ execute, write, tracker }) => {
  assert.equal(execute().status, 0)
  const initial = readFileSync(tracker, 'utf8')
  assert.match(initial, /`web:GET:\{ADMIN_PATH\}\/clients`/)
  assert.match(initial, /`web:POST:\{ADMIN_PATH\}\/clients`/)
  assert.doesNotMatch(initial, /api:POST:\/api\/ignored/)
  assert.equal(execute('--check').status, 0)
  write('dev/app/Models/Product.php', '<?php class Product {}')
  assert.equal(execute('--check').status, 1)
  assert.equal(execute().status, 0)
  assert.match(readFileSync(tracker, 'utf8'), /file:app\/Models\/Product.php/)
  assert.equal(execute('--check').status, 0)
}))

test('refresh preserves evidence and flags changed or removed completed source', () => fixture(({ execute, write, tracker }) => {
  assert.equal(execute().status, 0)
  const initial = readFileSync(tracker, 'utf8')
  const saved = initial.replace(/(\| `api:POST:\/api\/login`[^\n]*?)\| - \| PENDING \| - \|/, '$1| routes/auth/login.ts | VERIFIED | auth.test passed |')
  assert.notEqual(saved, initial)
  writeFileSync(tracker, saved)
  assert.equal(execute().status, 0)
  assert.match(readFileSync(tracker, 'utf8'), /routes\/auth\/login.ts \| VERIFIED \| auth.test passed/)
  write('dev/app/Http/Controllers/Api/Login.php', '<?php class Login { /* changed */ }')
  assert.equal(execute('--check').status, 1)
  assert.equal(execute().status, 0)
  assert.match(readFileSync(tracker, 'utf8'), /routes\/auth\/login.ts \| REVIEW \| auth.test passed/)
  write('dev/routes/api.php', '<?php\n')
  assert.equal(execute().status, 0)
  const row = readFileSync(tracker, 'utf8').split('\n').find((line) => line.includes('`api:POST:/api/login`'))
  assert.match(row, /REVIEW.*source removed/)
}))

test('inventory rejects unsupported routes and folders with more than ten files', () => fixture(({ execute, write }) => {
  write('dev/routes/api.php', "<?php\nRoute::any('/dynamic', [Login::class, 'login']);\n")
  const unsupported = execute()
  assert.equal(unsupported.status, 1)
  assert.match(unsupported.stderr, /Unparsed route/)
  write('dev/routes/api.php', '<?php\n')
  for (let index = 0; index < 11; index++) write(`zenx-pos/zenx-pos-backend/models/crowded/${index}.ts`, '')
  const crowded = execute()
  assert.equal(crowded.status, 1)
  assert.match(crowded.stderr, /contains 11 direct files/)
}))

test('check validates committed route mappings when the legacy checkout is unavailable', () => fixture(({ execute, tracker, root }) => {
  assert.equal(execute().status, 0)
  const verified = readFileSync(tracker, 'utf8').split(/\r?\n/).map((line) => {
    if (!line.startsWith('| `api:') && !line.startsWith('| `web:')) return line
    const cells = line.split('|')
    cells[4] = ' routes/example.ts '
    cells[5] = ' VERIFIED '
    cells[6] = ' route contract test passed '
    return cells.join('|')
  }).join('\n')
  writeFileSync(tracker, verified)
  rmSync(join(root, 'dev'), { recursive: true, force: true })
  const check = execute('--check')
  assert.equal(check.status, 0, check.stderr)
  assert.match(check.stdout, /Legacy source is unavailable; validated .* verified routes/)
  const refresh = execute()
  assert.equal(refresh.status, 1)
  assert.match(refresh.stderr, /Set ZENXPOS_LEGACY_ROOT/)
}))
