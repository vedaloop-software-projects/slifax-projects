import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import type { DatabaseConfig } from './config.ts'

export function createDatabase(config: DatabaseConfig) {
  const adapter = new PrismaMariaDb(config.adapter)
  const prisma = new PrismaClient({ adapter, transactionOptions: config.transaction, errorFormat: 'minimal' })
  return {
    prisma,
    async check() {
      // A real query verifies connectivity and basic schema availability; no rows are exposed.
      await prisma.businessTypes.findFirst({ select: { id: true } })
    },
    close: () => prisma.$disconnect(),
  }
}
