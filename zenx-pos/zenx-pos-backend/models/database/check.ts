import { loadDatabaseConfig } from './config.ts'
import { createDatabase } from './client.ts'

const config = loadDatabaseConfig()
if (!config) {
  console.error('Set DATABASE_URL in the backend .env before checking the database.')
  process.exitCode = 1
} else {
  const database = createDatabase(config)
  try {
    await database.check()
    console.log('Prisma connected successfully and can read the business_types table.')
  } catch {
    console.error('Database check failed. Check the URL, TLS/network access, permissions and schema. No connection details are logged.')
    process.exitCode = 1
  } finally { await database.close() }
}
