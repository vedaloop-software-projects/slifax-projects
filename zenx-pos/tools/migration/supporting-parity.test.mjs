import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const supportingMap = new Map([
  ['file:.editorconfig', '.editorconfig'],
  ['file:.env.example', 'zenx-pos-backend/.env.example'],
  ['file:.gitattributes', '.gitattributes'],
  ['file:.gitignore', 'zenx-pos-backend/.gitignore'],
  ['file:app/Exports/ExpensesExport.php', 'zenx-pos-backend/models/expense/export-storage.ts'],
  ['file:app/Http/Kernel.php', 'zenx-pos-backend/routes/system/app.ts'],
  ['file:app/Http/Traits/ApiLogger.php', 'zenx-pos-backend/models/system/logger.ts'],
  ['file:app/Http/Traits/ProjectTrait.php', 'zenx-pos-backend/middlewares/http/errors.ts'],
  ['file:app/Providers/AppServiceProvider.php', 'zenx-pos-backend/index.ts'],
  ['file:app/Providers/RouteServiceProvider.php', 'zenx-pos-backend/routes/system/app.ts'],
  ['file:artisan', 'zenx-pos-backend/package.json'],
  ['file:bootstrap/app.php', 'zenx-pos-backend/routes/system/app.ts'],
  ['file:bootstrap/providers.php', 'zenx-pos-backend/index.ts'],
  ['file:composer.json', 'zenx-pos-backend/package.json'],
  ['file:config/app.php', 'zenx-pos-backend/models/system/config.ts'],
  ['file:config/auth.php', 'zenx-pos-backend/models/auth/config.ts'],
  ['file:config/cache.php', 'zenx-pos-backend/models/cache/config.ts'],
  ['file:config/constants.php', 'zenx-pos-backend/middlewares/http/errors.ts'],
  ['file:config/database.php', 'zenx-pos-backend/models/database/config.ts'],
  ['file:config/filesystems.php', 'zenx-pos-backend/models/account/logo-storage.ts'],
  ['file:config/logging.php', 'zenx-pos-backend/models/system/logger.ts'],
  ['file:config/mail.php', 'zenx-pos-backend/models/reset/delivery.ts'],
  ['file:config/queue.php', 'zenx-pos-backend/package.json'],
  ['file:config/services.php', 'zenx-pos-backend/models/reset/config.ts'],
  ['file:config/session.php', 'zenx-pos-backend/routes/admin/session.ts'],
  ['file:database/.gitignore', 'zenx-pos-backend/.gitignore'],
  ['file:database/migrations.zip', 'tools/migration/schema.mjs'],
  ['file:database/factories/UserFactory.php', 'zenx-pos-backend/routes/auth/tests/auth.test.ts'],
  ['file:database/seeders/DatabaseSeeder.php', 'zenx-pos-backend/routes/admin/tests/clients.test.ts'],
  ['file:package.json', 'zenx-pos-backend/package.json'],
  ['file:phpunit.xml', 'zenx-pos-backend/package.json'],
  ['file:README.md', 'zenx-pos-backend/README.md'],
  ['file:resources/css/app.css', 'zenx-pos-backend/public/css/style.css'],
  ['file:routes/api.php', 'zenx-pos-backend/index.ts'],
  ['file:routes/web.php', 'zenx-pos-backend/index.ts'],
  ['file:routes/console.php', 'zenx-pos-backend/package.json'],
])

test('Node runtime replacements exist for audited Laravel support files', async () => {
  assert.equal(supportingMap.size, 36)
  for (const [source, target] of supportingMap) {
    const legacy = resolve(project, '../dev', source.slice(5))
    const replacement = resolve(project, target)
    assert.ok((await stat(legacy)).isFile(), source)
    assert.ok((await stat(replacement)).isFile(), target)
    assert.ok((await readFile(replacement)).length > 0, `${target} is empty`)
  }
  const packageJson = JSON.parse(await readFile(resolve(project, 'zenx-pos-backend/package.json'), 'utf8'))
  for (const script of ['build', 'start', 'test', 'db:check', 'migration:check']) assert.equal(typeof packageJson.scripts[script], 'string')
  assert.ok(packageJson.dependencies.express && packageJson.dependencies['@prisma/client'])
  const applicationSource = await readFile(resolve(project, 'zenx-pos-backend/index.ts'), 'utf8')
  assert.match(applicationSource, /createBillingRouter/)
  assert.match(applicationSource, /createKotAdvancedRouter/)
  const legacyAppRoot = resolve(project, '../dev/app')
  const phpFiles = (await readdir(legacyAppRoot, { recursive: true })).filter(file => file.endsWith('.php'))
  const legacyApplication = (await Promise.all(phpFiles.map(file => readFile(resolve(legacyAppRoot, file), 'utf8')))).join('\n')
  assert.doesNotMatch(legacyApplication, /ShouldQueue|Queue::|dispatch\(/, 'No active Laravel queue dependency was expected')
})
