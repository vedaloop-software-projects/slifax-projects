import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const legacy = resolve(project, '../dev')
const tracker = join(project, 'MIGRATION_TRACKER.md')
const start = '<!-- inventory:start -->'
const end = '<!-- inventory:end -->'
const statuses = new Set(['PENDING', 'IN_PROGRESS', 'IMPLEMENTED', 'VERIFIED', 'REPLACED', 'RETIRED', 'REVIEW'])
const previous = existsSync(tracker) ? readFileSync(tracker, 'utf8') : ''
const previousRows = new Map()

for (const line of previous.split('\n')) {
  if (!line.startsWith('| `')) continue
  const cells = line.split('|').slice(1, -1).map((value) => value.trim())
  if (cells.length !== 8) throw new Error(`Malformed tracker row: ${line}`)
  const [rawId, kind, source, target, status, evidence, fingerprint, state] = cells
  if (!statuses.has(status)) throw new Error(`Unknown status ${status}`)
  if (['VERIFIED', 'REPLACED', 'RETIRED'].includes(status) && (evidence === '-' || (status !== 'RETIRED' && target === '-'))) {
    throw new Error(`Completed item ${rawId} needs target and verification evidence (retired items need a rationale).`)
  }
  const id = rawId.slice(1, -1)
  if (previousRows.has(id)) throw new Error(`Duplicate tracker ID: ${id}`)
  previousRows.set(id, { id, kind, source, target, status, evidence, fingerprint, state })
}

function walk(directory, ignored = new Set()) {
  return readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    if (ignored.has(entry.name)) return []
    const path = join(directory, entry.name)
    return entry.isDirectory() ? walk(path, ignored) : entry.isFile() ? [path] : []
  })
}

const digest = (value) => createHash('sha256').update(value).digest('hex').slice(0, 16)
const rows = []
function add(id, kind, source, fingerprint, state = 'active') {
  const old = previousRows.get(id)
  if (rows.some((row) => row.id === id)) throw new Error(`Duplicate discovered ID: ${id}`)
  const changed = old && old.fingerprint !== fingerprint
  rows.push({
    id, kind, source, target: old?.target ?? '-',
    status: changed && old.status !== 'PENDING' ? 'REVIEW' : old?.status ?? 'PENDING',
    evidence: old?.evidence ?? '-', fingerprint, state,
  })
}

// Parse every explicit controller route. Fail closed if a new declaration is not understood.
for (const scope of ['api', 'web']) {
  const source = `routes/${scope}.php`
  const lines = readFileSync(join(legacy, source), 'utf8').split(/\r?\n/)
  for (const [index, line] of lines.entries()) {
    if (!/^\s*Route::(?:get|post|put|patch|delete|match|any)\(/.test(line)) continue
    const match = line.match(/Route::(get|post|put|patch|delete|match)\((.+?),\s*\[(\w+)::class,\s*'([^']+)'\]\)/)
    if (!match) throw new Error(`Unparsed route: ${source}:${index + 1}`)
    const [, method, args, controller, action] = match
    const methods = method === 'match' ? [...args.matchAll(/'(get|post|put|patch|delete)'/g)].map((item) => item[1]) : [method]
    const pathExpression = method === 'match' ? args.replace(/^\[[^\]]+\],\s*/, '') : args
    const suffix = [...pathExpression.matchAll(/'([^']*)'/g)].map((item) => item[1]).join('')
    const path = scope === 'api' ? '/api/' + suffix.replace(/^\//, '') : '{ADMIN_PATH}' + suffix
    const controllerPath = `app/Http/Controllers/${scope === 'api' ? 'Api' : 'admin'}/${controller}.php`
    const fingerprint = digest(line.trim() + readFileSync(join(legacy, controllerPath), 'utf8'))
    for (const verb of methods) add(`${scope}:${verb.toUpperCase()}:${path}`, `${scope === 'api' ? 'API' : 'Admin route'}/${controller}`, `dev/${source}:${index + 1} → ${controller}.${action}`, fingerprint)
  }
}

// First-party source and static assets. Operational data and installed libraries are not conversion units.
const excluded = new Set(['.git', 'vendor', 'node_modules', 'storage', 'uploads', '.well-known', 'build', '.env', '.env.backup', '.env.production', 'database.sqlite', 'composer.lock', 'package-lock.json', 'auth.json'])
for (const path of walk(legacy, excluded)) {
  const name = relative(legacy, path).replaceAll('\\', '/')
  if (name.startsWith('bootstrap/cache/') || name.endsWith('.log')) continue
  const kind = name.startsWith('database/migrations/') ? 'Schema'
    : name.startsWith('app/Models/') ? 'Model'
    : name.endsWith('.blade.php') ? 'Template'
    : name.startsWith('app/Http/Controllers/') ? 'Controller'
    : name.startsWith('tests/') ? 'Legacy test'
    : name.startsWith('public/') ? 'Public asset'
    : 'Supporting source'
  add(`file:${name}`, kind, `dev/${name}`, digest(readFileSync(path)))
}

// Keep removed source visible for an explicit retirement decision.
for (const old of previousRows.values()) {
  if (!rows.some((row) => row.id === old.id)) rows.push({ ...old, status: old.status === 'RETIRED' ? 'RETIRED' : 'REVIEW', state: 'source removed' })
}

const backend = join(project, 'zenx-pos-backend')
const sizeIssues = []
function checkFolders(directory) {
  const entries = readdirSync(directory, { withFileTypes: true })
  const count = entries.filter((entry) => entry.isFile()).length
  if (count > 10) sizeIssues.push(`${relative(project, directory)} contains ${count} direct files`)
  for (const entry of entries) if (entry.isDirectory() && !['node_modules', 'dist', '.git', 'coverage'].includes(entry.name)) checkFolders(join(directory, entry.name))
}
checkFolders(backend)
if (sizeIssues.length) throw new Error(sizeIssues.join('\n'))

const groups = [...new Set(rows.map((row) => row.kind))].sort()
const summary = groups.map((kind) => {
  const items = rows.filter((row) => row.kind === kind)
  const verified = items.filter((row) => row.status === 'VERIFIED').length
  const disposed = items.filter((row) => ['REPLACED', 'RETIRED'].includes(row.status)).length
  const implemented = items.filter((row) => row.status === 'IMPLEMENTED').length
  const active = items.filter((row) => ['IN_PROGRESS', 'REVIEW'].includes(row.status)).length
  const pending = items.filter((row) => row.status === 'PENDING').length
  return `| ${kind} | ${items.length} | ${verified} | ${implemented} | ${active} | ${disposed} | ${pending} |`
})
const generated = [
  start,
  '## Conversion counts', '',
  'Counts below are independent work inventories; do not add routes and their source files to claim a conversion percentage.',
  'Admin routes expand GET/POST matches into separate endpoints. Templates include shared layouts and the Laravel welcome page.', '',
  '| Area | Total | Verified conversions | Implemented, unverified | In progress/review | Replaced/retired | Not started |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: |', ...summary, '',
  '## Complete inventory', '',
  'Edit Target, Status, and Evidence here, then run `npm run migration:refresh` in the backend.',
  'Evidence must name the checks and their result. Use no literal pipe characters inside cells.',
  'Fingerprints detect source changes; changed work already started returns to REVIEW.', '',
  '| ID | Kind | Source | Target | Status | Evidence | Fingerprint | Source state |',
  '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map((row) => `| \`${row.id}\` | ${row.kind} | ${row.source} | ${row.target} | ${row.status} | ${row.evidence} | ${row.fingerprint} | ${row.state} |`),
  '', end,
].join('\n')

const introduction = `# ZenxPOS migration tracker

Source: \\dev (Laravel). Target: \\zenx-pos\\zenx-pos-backend (Node.js/TypeScript).
Baseline recorded: 2026-10-05. This is the single source of migration progress.

## Current checkpoint

- Stage 1: inventory and HTTP foundation implemented; verification pending.
- Business endpoint conversions: none yet. No business route stubs count as progress.
- Database access, schema migration, authentication, and frontend conversion are not implemented yet.
- Existing product-label-printing app and its deployment remain separate.

## Delivery sequence

| Step | Scope | Status | Completion gate |
| --- | --- | --- | --- |
| 1 | Source inventory, folder conventions, TypeScript/Express foundation | IN_PROGRESS | Build, HTTP tests, inventory drift check |
| 2 | Database connection, schema compatibility, test database and transaction helpers | PENDING | Connection and rollback tests; no production schema writes |
| 3 | Login, JWT, reset flow, profiles, client isolation, roles and permissions | PENDING | Auth success/failure and cross-client denial checks |
| 4 | Master data, customers, employees, products and variants, uploads | PENDING | CRUD, filtering, validation and import parity |
| 5 | Settings, discounts, coupons and happy hours | PENDING | Configuration and promotion calculation checks |
| 6 | Transfers, stock adjustments and kits | PENDING | Stock balance and transaction rollback checks |
| 7 | Retail billing, refunds, receipts and day closing | PENDING | Totals, tax, payments, stock and concurrent bill checks |
| 8 | Restaurant reservations, tables, KOT and billing | PENDING | Order lifecycle, table state and billing checks |
| 9 | Salon appointments, services and billing | PENDING | Scheduling, employee assignment and billing checks |
| 10 | Admin routes, sessions and frontend templates | PENDING | Screen and role parity with the Blade admin panel |
| 11 | Remaining helpers/assets, runtime configuration, deployment and cutover | PENDING | Full regression, deployment rehearsal and rollback procedure |

## Working agreement

- Preserve the three folders: routes, middlewares, models. Use domain subfolders; at most 10 direct first-party files per folder.
- Preserve legacy endpoint paths and request/response contracts unless a change is explicitly documented here.
- Port client_id filtering, status/trash handling, monetary rules, audit records, and transaction behavior with each feature.
- Record implementation targets and tests per endpoint. Controller/schema/template rows track their separate migration or replacement work.
- Statuses: PENDING, IN_PROGRESS, IMPLEMENTED, VERIFIED, REPLACED, RETIRED, REVIEW.
- VERIFIED means implementation plus passing relevant behavior checks. REPLACED and RETIRED require documented rationale/evidence and do not count as literal conversions.
- Existing insecure behavior (for example admin MD5 passwords or returning reset OTPs) needs a documented replacement plan, not blind duplication.
- Maintain original Laravel code as a reference. No production database changes or deployment in the foundation stage.

## Frontend scope

There are 33 Blade templates: 27 admin pages, 5 shared admin includes, and the Laravel welcome template.
Admin pages cover login, dashboard, password change, clients/contracts/collections, admins, business types, features/subfeatures, key mappings, bill columns, coupon usage types, and bill formats.
The customer-facing retail/restaurant/salon POS UI is not present as a React application in this source.
The Node API conversion does not itself convert Blade templates; Step 10 owns their replacement, with the frontend framework to be selected before that step.

## Inventory boundaries and refresh

The inventory covers explicit API/admin routes and first-party source/static assets. It excludes .git, vendor/node_modules, runtime storage/cache, actual .env secrets, uploaded customer files, dependency lockfiles, and the SQLite database contents.
Those excluded runtime/dependency items still need a deployment/data-transfer plan in Step 11; they are not PHP-to-Node conversion units.
The legacy example environment file is fingerprinted, never copied into the Node environment.
Run npm run migration:refresh to rescan. Run npm run migration:check to verify coverage without writing.
New source becomes PENDING; removed source remains visible; completed work affected by source changes becomes REVIEW.

## Decisions and verification log

- 2026-10-05: Node.js with TypeScript and Express; reuse user-created routes/middlewares/models structure. Runtime development uses Node native TypeScript support; production uses compiled JavaScript.
- 2026-10-05: Baseline is static source inventory, not an assertion that the Laravel app works end to end.
- 2026-10-05: Foundation uses port 5100 so it can coexist with the existing label backend. /up and /api/health are liveness only.

`

let next
if (previous) {
  const first = previous.indexOf(start)
  const last = previous.indexOf(end)
  if (first < 0 || last < first) throw new Error('Tracker inventory markers are missing; refusing to overwrite progress.')
  next = previous.slice(0, first) + generated + previous.slice(last + end.length)
} else next = introduction + generated + '\n'

if (process.argv.includes('--check')) {
  if (next !== previous) {
    console.error('Migration inventory or counts are stale. Run npm run migration:refresh and review changes.')
    process.exitCode = 1
  } else console.log(`Tracker is current: ${rows.length} work items; all backend folders satisfy the 10-file limit.`)
} else {
  writeFileSync(tracker, next)
  console.log(`Updated ${tracker}: ${rows.length} work items. Existing progress preserved.`)
}
