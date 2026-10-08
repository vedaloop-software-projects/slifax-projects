import { loadDatabaseConfig } from './config.ts'
import { createDatabase } from './client.ts'
import { classifyDatabaseFailure } from './errors.ts'

const config = loadDatabaseConfig()
function diagnosis(error: unknown) {
  const failure = classifyDatabaseFailure(error)
  return failure?.message ?? 'Unknown database failure.'
}
if (!config) {
  console.error('Set DATABASE_URL in the backend .env before checking the database.')
  process.exitCode = 1
} else {
  const database = createDatabase(config)
  try {
    await database.check()
    console.log('Prisma connected successfully and can read the business_types table.')
  } catch (error) {
    console.error(`Database check failed. ${diagnosis(error)} No connection details are logged.`)
    process.exitCode = 1
  } finally { await database.close() }
}
