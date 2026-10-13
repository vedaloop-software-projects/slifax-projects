import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeLegacyInput } from '../../zenx-pos-backend/middlewares/http/legacy-input.ts'

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const legacy = resolve(project, '../dev')
const trackerPath = join(project, 'MIGRATION_TRACKER.md')
const reportPath = join(project, 'ENDPOINT_REQUEST_PARITY.md')

function trackerRows() {
  const rows = new Map()
  for (const line of readFileSync(trackerPath, 'utf8').split(/\r?\n/)) {
    if (!line.startsWith('| `api:') && !line.startsWith('| `web:')) continue
    const cells = line.split('|').slice(1, -1).map((value) => value.trim())
    rows.set(cells[0].slice(1, -1), { target: cells[3], status: cells[4], evidence: cells[5] })
  }
  return rows
}

function methodBody(source, action) {
  const marker = new RegExp(`(?:public\\s+)?function\\s+${action}\\s*\\(`).exec(source)
  if (!marker) return null
  const open = source.indexOf('{', marker.index)
  let depth = 0
  for (let index = open; index < source.length; index++) {
    if (source[index] === '{') depth++
    if (source[index] === '}' && --depth === 0) return source.slice(open + 1, index)
  }
  throw new Error(`Legacy controller action is incomplete: ${action}`)
}

function requestFields(body) {
  const fields = new Set()
  for (const match of body.matchAll(/\$request->(?:input|get|has|filled|file)\(\s*['"]([A-Za-z_][A-Za-z0-9_.]*)['"]/g)) fields.add(match[1])
  for (const match of body.matchAll(/\$request->([A-Za-z_][A-Za-z0-9_]*)/g)) {
    if (!['all', 'file', 'filled', 'get', 'has', 'hasFile', 'input', 'isJson', 'isMethod', 'user', 'validate'].includes(match[1])) fields.add(match[1])
  }
  for (const match of body.matchAll(/^\s*['"]([A-Za-z_][A-Za-z0-9_.*]*)['"]\s*=>\s*['"][^'"]*(?:required|nullable|sometimes|numeric|integer|string|array|date|regex|email|boolean|in:)[^'"]*['"]/gm)) {
    if (!/\.(?:required|nullable|numeric|integer|string|array|date|regex|email|boolean)$/.test(match[1])) fields.add(match[1])
  }
  for (const field of exactKeys(body)) fields.add(field)
  return [...fields].sort()
}

function exactKeys(body) {
  if (!/check_keys|array_diff/.test(body)) return []
  const fields = new Set()
  for (const match of body.matchAll(/\$(?:required_keys|allowedKeys|requiredKeys|allowed_keys)\s*=\s*\[([\s\S]*?)\];/g)) {
    for (const field of match[1].matchAll(/['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g)) fields.add(field[1])
  }
  return [...fields].sort()
}

function numericFields(body) {
  const fields = new Set()
  for (const match of body.matchAll(/^\s*['"]([A-Za-z_][A-Za-z0-9_.*]*)['"]\s*=>\s*['"]([^'"]*)['"]/gm)) {
    if (/(?:^|\|)(?:numeric|integer)(?:\||$)/.test(match[2])) fields.add(match[1].replace(/^.*\./, ''))
  }
  return [...fields].sort()
}

function routes() {
  const tracked = trackerRows()
  const rows = []
  for (const scope of ['api', 'web']) {
    const routeFile = `routes/${scope}.php`
    const lines = readFileSync(join(legacy, routeFile), 'utf8').split(/\r?\n/)
    for (const [index, line] of lines.entries()) {
      if (!/^\s*Route::(?:get|post|put|patch|delete|match|any)\(/.test(line)) continue
      const match = line.match(/Route::(get|post|put|patch|delete|match)\((.+?),\s*\[(\w+)::class,\s*'([^']+)'\]\)/)
      if (!match) throw new Error(`Unparsed route: ${routeFile}:${index + 1}`)
      const [, method, args, controller, action] = match
      const methods = method === 'match' ? [...args.matchAll(/'(get|post|put|patch|delete)'/g)].map((item) => item[1]) : [method]
      const expression = method === 'match' ? args.replace(/^\[[^\]]+\],\s*/, '') : args
      const suffix = [...expression.matchAll(/'([^']*)'/g)].map((item) => item[1]).join('')
      const path = scope === 'api' ? '/api/' + suffix.replace(/^\//, '') : '{ADMIN_PATH}' + suffix
      const controllerPath = join(legacy, 'app/Http/Controllers', scope === 'api' ? 'Api' : 'admin', `${controller}.php`)
      const body = methodBody(readFileSync(controllerPath, 'utf8'), action)
      const fields = body ? requestFields(body) : []
      const numerics = body ? numericFields(body) : []
      const strictKeys = body ? exactKeys(body) : []
      for (const verb of methods) {
        const id = `${scope}:${verb.toUpperCase()}:${path}`
        const trackedRow = tracked.get(id)
        if (!trackedRow) throw new Error(`Route is absent from migration tracker: ${id}`)
        rows.push({ id, scope, verb: verb.toUpperCase(), path, controller, action, line: index + 1, fields, numerics, strictKeys, legacyHandlerMissing: body === null, ...trackedRow })
      }
    }
  }
  if (rows.length !== tracked.size) throw new Error(`Route count mismatch: source=${rows.length}, tracker=${tracked.size}`)
  return rows
}

const rows = routes()
const apiNumericFields = new Set(rows.filter((row) => row.scope === 'api').flatMap((row) => row.numerics))
const intentionallyText = new Set(['otp', 'reason'])
const uncovered = [...apiNumericFields].filter((field) => {
  if (intentionallyText.has(field)) return false
  return typeof normalizeLegacyInput({ [field]: '7' })[field] !== 'number'
})
const incomplete = rows.filter((row) => row.status !== 'VERIFIED' || row.target === '-' || row.evidence === '-')
if (uncovered.length) throw new Error(`Numeric-string compatibility is missing: ${uncovered.join(', ')}`)
if (incomplete.length) throw new Error(`Routes without verified mapping: ${incomplete.map((row) => row.id).join(', ')}`)

const api = rows.filter((row) => row.scope === 'api')
const admin = rows.filter((row) => row.scope === 'web')
const requestBearing = rows.filter((row) => row.fields.length || row.numerics.length)
const missingLegacyHandlers = rows.filter((row) => row.legacyHandlerMissing)
const strictLegacyRequests = rows.filter((row) => row.strictKeys.length)
const report = `# Endpoint request parity audit

Generated from the active Laravel route/controller source and the Node migration tracker. Run \`npm run request:parity\` after changing routes, request parsing, or validators.

## Scope and result

| Check | Result |
| --- | ---: |
| Expanded legacy HTTP endpoints | ${rows.length} |
| API endpoints | ${api.length} |
| Admin endpoints (Route::match expanded) | ${admin.length} |
| Endpoints with detected request fields or numeric rules | ${requestBearing.length} |
| Legacy routes pointing to missing controller actions | ${missingLegacyHandlers.length} |
| Legacy endpoints with explicit exact-key checks | ${strictLegacyRequests.length} |
| Distinct API numeric/integer field names | ${apiNumericFields.size} |
| Verified tracker mappings | ${rows.length - incomplete.length} |
| Uncovered API numeric-string fields | ${uncovered.length} |

The source contains 340 expanded endpoints, not 353. The audit fails if source and tracker counts differ, any route lacks a verified Node mapping, or a legacy API numeric field lacks compatibility handling. Missing legacy controller actions are reported because the Node replacement can still implement an endpoint that was broken in the old source.

\`otp\` deliberately remains text so leading zeroes survive; the reset schema accepts the legacy four-digit contract and the new six-digit contract. \`reason\` remains text because it stores descriptions, while the one legacy numeric filter form is accepted and converted to text by the stock-adjustment schema. Admin HTML/form numeric fields use explicit Zod coercion in their Node services.

This is source and automated-contract evidence. Database-dependent business results, browser rendering, third-party delivery, uploads on deployed storage, and production permissions remain part of manual/live testing.

## Per-endpoint inventory

| Endpoint | Legacy handler | Detected request fields | Numeric/integer fields | Exact keys | Node mapping |
| --- | --- | --- | --- | --- | --- |
${rows.map((row) => `| \`${row.verb} ${row.path}\` | \`${row.controller}.${row.action}\`${row.legacyHandlerMissing ? ' (missing in legacy controller)' : ''} | ${row.fields.length ? row.fields.map((field) => `\`${field}\``).join(', ') : '—'} | ${row.numerics.length ? row.numerics.map((field) => `\`${field}\``).join(', ') : '—'} | ${row.strictKeys.length ? row.strictKeys.map((field) => `\`${field}\``).join(', ') : '—'} | ${row.status}: ${row.target} |`).join('\n')}
`

if (process.argv.includes('--check')) {
  if (!existsSync(reportPath) || readFileSync(reportPath, 'utf8') !== report) {
    console.error('Endpoint request parity report is stale. Run npm run request:parity.')
    process.exitCode = 1
  } else console.log(`Endpoint request parity is current: ${rows.length} routes; ${apiNumericFields.size} API numeric fields covered.`)
} else {
  writeFileSync(reportPath, report)
  console.log(`Updated ${reportPath}: ${rows.length} routes; ${apiNumericFields.size} API numeric fields covered.`)
}
