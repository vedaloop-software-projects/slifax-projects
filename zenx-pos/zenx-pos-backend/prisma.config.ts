import { existsSync } from 'node:fs'
import { defineConfig } from 'prisma/config'
import { loadDatabaseConfig } from './models/database/config.ts'

if (existsSync('.env')) process.loadEnvFile('.env')

export default defineConfig({
  schema: 'models/database/schema/schema.prisma',
  migrations: { seed: 'node --env-file-if-exists=.env models/database/seed.ts' },
  // Empty is sufficient for offline generate/validate; database commands require a real URL.
  datasource: { url: loadDatabaseConfig()?.url ?? '' },
})
