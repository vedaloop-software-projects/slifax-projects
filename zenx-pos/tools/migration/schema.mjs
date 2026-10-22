import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Deliberately bounded translator for the checked-in Laravel migrations, not a general PHP interpreter.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const source = join(root, 'dev/database/migrations')
const destination = join(root, 'zenx-pos/zenx-pos-backend/models/database/schema')
const extensionsFile = join(destination, 'extensions.json')
const modelName = (name) => name.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join('')
const quote = (value) => JSON.stringify(value)

function withoutComments(text) {
  return text.replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (part) => part.startsWith('/') ? ' ' : part)
}

function argumentsOf(text) {
  const tokens = text.match(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?|true|false|null|[\[\],]|\S+/g) ?? []
  let position = 0
  function value() {
    const token = tokens[position++]
    if (token === '[') {
      const array = []
      while (tokens[position] !== ']') {
        array.push(value())
        if (tokens[position] === ',') position++
        else if (tokens[position] !== ']') throw new Error(`Invalid PHP array: ${text}`)
      }
      position++
      return array
    }
    if (token?.startsWith("'")) return token.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\')
    if (token?.startsWith('"')) return JSON.parse(token)
    if (token === 'null') return null
    if (token === 'true' || token === 'false') return token === 'true'
    if (/^-?\d+(?:\.\d+)?$/.test(token ?? '')) return Number(token)
    throw new Error(`Unsupported PHP argument: ${text}`)
  }
  const result = []
  while (position < tokens.length) {
    result.push(value())
    if (tokens[position] === ',') position++
    else if (position < tokens.length) throw new Error(`Unsupported PHP arguments: ${text}`)
  }
  return result
}

function callsIn(statement) {
  const expression = /->(\w+)\(((?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|[^()'"])*)\)/g
  const calls = [...statement.matchAll(expression)].map((match) => ({ name: match[1], args: argumentsOf(match[2]) }))
  if (statement.replace(expression, '').trim() !== '$table') throw new Error(`Unsupported column expression: ${statement}`)
  return calls
}

export function compileSchema(files, extensions = {}) {
  const tables = new Map()
  const migrations = []
  const floatingColumns = []
  const unresolvedForeignKeys = []
  const columnTypes = {
    string: ['String', (args) => `VarChar(${args[1] ?? 255})`], json: ['Json', () => 'Json'],
    text: ['String', () => 'Text'], mediumText: ['String', () => 'MediumText'], longText: ['String', () => 'LongText'],
    integer: ['Int', () => 'Int'], unsignedInteger: ['Int', () => 'UnsignedInt'],
    tinyInteger: ['Int', () => 'TinyInt'], unsignedTinyInteger: ['Int', () => 'UnsignedTinyInt'],
    unsignedBigInteger: ['BigInt', () => 'UnsignedBigInt'], foreignId: ['BigInt', () => 'UnsignedBigInt'],
    decimal: ['Decimal', (args) => `Decimal(${args[1] ?? 8}, ${args[2] ?? 2})`],
    double: ['Float', () => 'Double'],
    date: ['DateTime', () => 'Date'], dateTime: ['DateTime', () => 'DateTime(0)'],
    timestamp: ['DateTime', () => 'Timestamp(0)'], time: ['DateTime', () => 'Time(0)'],
  }
  for (const file of files) {
    const clean = withoutComments(file.text)
    const up = clean.match(/public\s+function\s+up\(\)\s*:\s*void\s*\{([\s\S]*?)\n\s{4}\}/)?.[1]
    if (!up) throw new Error(`Missing supported up() in ${file.name}`)
    const block = /Schema::(create|table)\('([^']+)',\s*function\s*\(Blueprint\s+\$table\)\s*\{([\s\S]*?)\}\);/g
    const matches = [...up.matchAll(block)]
    if (!matches.length || up.replace(block, '').trim()) throw new Error(`Untranslated migration code in ${file.name}`)
    const affected = []
    for (const [, operation, tableName, body] of matches) {
      if (operation === 'create') {
        if (tables.has(tableName)) throw new Error(`Duplicate table ${tableName}`)
        tables.set(tableName, { name: tableName, columns: [], indexes: [], foreign: [], relations: [], primary: null })
      }
      const table = tables.get(tableName)
      if (!table) throw new Error(`Alter references missing table ${tableName}`)
      affected.push(tableName)
      const statements = body.match(/(?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|[^;'"])+;/g) ?? []
      if (body.replace(/(?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|[^;'"])+;/g, '').trim()) throw new Error(`Untranslated table code in ${file.name}`)
      for (const statement of statements) {
        const [first, ...modifiers] = callsIn(statement.slice(0, -1).trim())
        const { name, args } = first
        if (['index', 'unique', 'primary'].includes(name)) {
          const fields = Array.isArray(args[0]) ? args[0] : [args[0]]
          if (name === 'primary') table.primary = fields
          else table.indexes.push({ type: name, fields, name: args[1] ?? `${tableName}_${fields.join('_')}_${name}` })
          if (modifiers.length) throw new Error(`Unsupported index modifier in ${file.name}`)
          continue
        }
        if (name === 'foreign') {
          const find = (key) => modifiers.find((item) => item.name === key)?.args[0]
          const known = new Set(['references', 'on', 'onDelete', 'onUpdate', 'nullOnDelete', 'cascadeOnDelete'])
          if (modifiers.some((item) => !known.has(item.name))) throw new Error(`Unsupported foreign key modifier in ${file.name}`)
          const fields = Array.isArray(args[0]) ? args[0] : [args[0]]
          const refs = find('references')
          table.foreign.push({ fields, refs: Array.isArray(refs) ? refs : [refs], target: find('on'), name: args[1] ?? `${tableName}_${fields.join('_')}_foreign`, onDelete: modifiers.some((item) => item.name === 'nullOnDelete') ? 'set null' : modifiers.some((item) => item.name === 'cascadeOnDelete') ? 'cascade' : find('onDelete') ?? 'restrict', onUpdate: find('onUpdate') ?? 'restrict' })
          continue
        }
        const names = name === 'timestamps' ? ['created_at', 'updated_at'] : name === 'rememberToken' ? ['remember_token'] : [args[0] ?? (name === 'id' ? 'id' : undefined)]
        for (const columnName of names) {
          if (!columnName || table.columns.some((column) => column.name === columnName)) throw new Error(`Missing or duplicate column in ${file.name}: ${columnName}`)
          const type = name === 'id' ? ['BigInt', () => 'UnsignedBigInt'] : name === 'timestamps' ? ['DateTime', () => 'Timestamp(0)'] : name === 'rememberToken' ? ['String', () => 'VarChar(100)'] : columnTypes[name]
          if (!type) throw new Error(`Unsupported type ${name} in ${file.name}`)
          const column = { name: columnName, type: type[0], native: type[1](args), nullable: ['timestamps', 'rememberToken'].includes(name), attributes: [] }
          if (name === 'id') column.attributes.push('@id', '@default(autoincrement())')
          if (name === 'double') floatingColumns.push(`${tableName}.${columnName}`)
          for (const modifier of modifiers) {
            switch (modifier.name) {
              case 'nullable': column.nullable = modifier.args[0] !== false; break
              case 'default': {
                const value = modifier.args[0]
                if (value !== null) column.attributes.push(`@default(${typeof value === 'string' ? quote(value) : value})`)
                break
              }
              case 'useCurrent': column.attributes.push('@default(now())'); break
              case 'primary': column.attributes.push('@id'); break
              case 'index': case 'unique': table.indexes.push({ type: modifier.name, fields: [columnName], name: modifier.args[0] ?? `${tableName}_${columnName}_${modifier.name}` }); break
              case 'comment': case 'after': break // Metadata/order does not alter Prisma query semantics.
              default: throw new Error(`Unsupported modifier ${modifier.name} in ${file.name}`)
            }
          }
          table.columns.push(column)
        }
      }
    }
    migrations.push({ source: file.name, sha256: createHash('sha256').update(file.text).digest('hex'), tables: affected })
  }

  for (const [tableName, definition] of Object.entries(extensions.$tables ?? {})) {
    if (tables.has(tableName)) throw new Error(`Schema extension duplicates table ${tableName}`)
    const table = { name: tableName, columns: [], indexes: definition.indexes ?? [], foreign: [], relations: [], primary: null }
    for (const column of definition.columns ?? []) table.columns.push({ name: column.name, type: column.type, native: column.native, nullable: column.nullable === true, attributes: column.attributes ?? [] })
    tables.set(tableName, table)
  }

  for (const [tableName, patch] of Object.entries(extensions.$patches ?? {})) {
    const table = tables.get(tableName)
    if (!table) throw new Error(`Schema patch references missing table ${tableName}`)
    const removedColumns = new Set(patch.removeColumns ?? [])
    const removedIndexes = new Set(patch.removeIndexes ?? [])
    table.columns = table.columns.filter((column) => !removedColumns.has(column.name))
    table.indexes = table.indexes.filter((index) => !removedIndexes.has(index.name) && !index.fields.some((field) => removedColumns.has(field)))
    for (const index of patch.indexes ?? []) {
      if (table.indexes.some((item) => item.name === index.name)) continue
      table.indexes.push(index)
    }
  }

  for (const [tableName, columns] of Object.entries(extensions).filter(([name]) => !name.startsWith('$'))) {
    const table = tables.get(tableName)
    if (!table) throw new Error(`Schema extension references missing table ${tableName}`)
    for (const column of columns) {
      if (table.columns.some((item) => item.name === column.name)) throw new Error(`Schema extension duplicates ${tableName}.${column.name}`)
      table.columns.push({ name: column.name, type: column.type, native: column.native, nullable: column.nullable === true, attributes: column.attributes ?? [] })
    }
  }

  const action = { cascade: 'Cascade', 'set null': 'SetNull', restrict: 'Restrict', 'no action': 'NoAction' }
  for (const table of tables.values()) {
    for (const index of table.indexes) if (index.fields.some((field) => !table.columns.some((column) => column.name === field))) throw new Error(`Index references missing column in ${table.name}`)
    for (const foreign of table.foreign) {
      const target = tables.get(foreign.target)
      if (!target || foreign.refs.some((field) => !target.columns.some((column) => column.name === field))) {
        unresolvedForeignKeys.push({ table: table.name, ...foreign })
        table.relations.push(`  // REVIEW: ${foreign.name} references missing ${foreign.target}; inspect live schema before creating this constraint.`)
        continue
      }
      const optional = foreign.fields.every((field) => table.columns.find((column) => column.name === field)?.nullable)
      if (!action[foreign.onDelete] || !action[foreign.onUpdate]) throw new Error(`Unknown foreign key action: ${foreign.name}`)
      table.relations.push(`  rel_${foreign.fields.join('_')} ${modelName(target.name)}${optional ? '?' : ''} @relation(${quote(foreign.name)}, fields: [${foreign.fields.join(', ')}], references: [${foreign.refs.join(', ')}], onDelete: ${action[foreign.onDelete]}, onUpdate: ${action[foreign.onUpdate]}, map: ${quote(foreign.name)})`)
      target.relations.push(`  back_${table.name}_${foreign.fields.join('_')} ${modelName(table.name)}[] @relation(${quote(foreign.name)})`)
    }
  }
  const models = [...tables.values()].map((table) => [
    `model ${modelName(table.name)} {`,
    ...table.columns.map((column) => `  ${column.name} ${column.type}${column.nullable ? '?' : ''} ${column.attributes.join(' ')} @db.${column.native}`),
    ...table.relations,
    ...(table.primary ? [`  @@id([${table.primary.join(', ')}])`] : []),
    ...table.indexes.map((index) => `  @@${index.type}([${index.fields.join(', ')}], map: ${quote(index.name)})`),
    `  @@map(${quote(table.name)})`, '}',
  ].join('\n'))
  const schema = `// Generated from Laravel migration up() definitions. Do not run db push against an existing database.\n// Use db pull --print to reconcile actual schema before deployment. DOUBLE semantics are preserved.\ngenerator client {\n  provider = "prisma-client-js"\n}\n\ndatasource db {\n  provider = "mysql"\n}\n\n${models.join('\n\n')}\n`
  return { schema, report: { migrations, tableCount: tables.size, columnCount: [...tables.values()].reduce((sum, table) => sum + table.columns.length, 0), foreignKeyCount: [...tables.values()].reduce((sum, table) => sum + table.foreign.length, 0), unresolvedForeignKeys, floatingColumns, limitations: ['Static translation only; live schema/data parity is not verified.', 'Unresolved foreign keys are recorded, not silently redirected or applied. Deployment is blocked until reconciled.', 'Laravel DOUBLE columns remain floating point; monetary Decimal migration requires a separate reviewed data conversion.', 'Column comments and physical AFTER ordering are not represented by Prisma.', 'Preserve utf8mb4_unicode_ci explicitly in deployment DDL; Prisma schema does not define database collation.', 'Legacy down() rollback code is not translated; future Prisma migrations need reviewed rollback plans.'] } }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = readdirSync(source).filter((name) => name.endsWith('.php')).sort().map((name) => ({ name, text: readFileSync(join(source, name), 'utf8') }))
  const extensions = JSON.parse(readFileSync(extensionsFile, 'utf8'))
  const { schema, report } = compileSchema(files, extensions)
  const outputs = [['schema.prisma', schema], ['compatibility.json', JSON.stringify(report, null, 2) + '\n']]
  if (process.argv.includes('--check')) {
    for (const [name, content] of outputs) if (readFileSync(join(destination, name), 'utf8') !== content) throw new Error(`Schema artifact is stale: ${name}`)
  } else {
    mkdirSync(destination, { recursive: true })
    for (const [name, content] of outputs) writeFileSync(join(destination, name), content)
  }
  console.log(`${files.length} migrations → ${report.tableCount} Prisma models, ${report.columnCount} columns, ${report.foreignKeyCount} foreign keys; live verification pending.`)
}
