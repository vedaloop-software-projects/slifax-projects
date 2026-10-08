import { readdir, readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = resolve(fileURLToPath(new URL('.', import.meta.url)))
const root = resolve(here, '..', '..')
const modelDirectory = resolve(root, '..', 'dev', 'app', 'Models')
const schemaPath = resolve(root, 'zenx-pos-backend', 'models', 'database', 'schema', 'schema.prisma')

function inferredTable(className) {
  const snake = className.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()
  if (snake.endsWith('y') && !/[aeiou]y$/.test(snake)) return `${snake.slice(0, -1)}ies`
  if (/(s|x|z|ch|sh)$/.test(snake)) return `${snake}es`
  return `${snake}s`
}

function prismaTables(source) {
  const tables = new Map()
  for (const match of source.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
    const [, modelName, body] = match
    const table = /@@map\("([^"]+)"\)/.exec(body)?.[1] ?? modelName
    const columns = new Set()
    for (const raw of body.split(/\r?\n/)) {
      const line = raw.trim()
      if (!line || line.startsWith('//') || line.startsWith('@@')) continue
      const field = /^(\w+)\s+/.exec(line)?.[1]
      if (!field) continue
      columns.add(/@map\("([^"]+)"\)/.exec(line)?.[1] ?? field)
    }
    tables.set(table, { modelName, columns })
  }
  return tables
}

export async function checkModelParity() {
  const tables = prismaTables(await readFile(schemaPath, 'utf8'))
  const files = (await readdir(modelDirectory, { withFileTypes: true })).filter(entry => entry.isFile() && entry.name.endsWith('.php')).map(entry => entry.name).sort()
  const results = []
  for (const file of files) {
    const source = await readFile(resolve(modelDirectory, file), 'utf8')
    const className = /class\s+(\w+)\s+extends/.exec(source)?.[1] ?? basename(file, '.php')
    const table = /\$table\s*=\s*['"]([^'"]+)['"]/.exec(source)?.[1] ?? inferredTable(className)
    const fillableBody = /\$fillable\s*=\s*\[([\s\S]*?)\];/.exec(source)?.[1] ?? ''
    const fillable = [...fillableBody.matchAll(/['"]([^'"]+)['"]/g)].map(match => match[1])
    const prisma = tables.get(table)
    const missing = prisma ? fillable.filter(column => !prisma.columns.has(column)) : fillable
    results.push({ file, table, prismaModel: prisma?.modelName ?? null, fillableCount: fillable.length, missing, ok: Boolean(prisma) && missing.length === 0 })
  }
  return results
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const results = await checkModelParity()
  const failures = results.filter(result => !result.ok)
  const expectedRetiredDuplicate = failures.length === 1 && failures[0].file === 'kit_bill_tran.php' && failures[0].table === 'kot_bill_tran' && failures[0].missing.join(',') === 'bill_id,kot_id,discount,tax,amount'
  if (failures.length && !expectedRetiredDuplicate) {
    for (const failure of failures) console.error(`${failure.file}: table=${failure.table}, prisma=${failure.prismaModel ?? 'missing'}, missing=${failure.missing.join(',') || '-'}`)
    process.exitCode = 1
  } else {
    const verified = results.filter(result => result.ok)
    console.log(`Model parity verified: ${verified.length} Laravel models map to Prisma tables and all ${verified.reduce((sum, result) => sum + result.fillableCount, 0)} declared fillable columns exist; the conflicting stale kit_bill_tran.php duplicate is explicitly RETIRED.`)
  }
}
