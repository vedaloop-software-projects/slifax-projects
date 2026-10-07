import { Prisma, type PrismaClient } from '@prisma/client'

export type TransactionClient = Prisma.TransactionClient

// Prisma manages commit/rollback. No automatic retry: interrupted commits and payment
// or stock side effects require domain-specific idempotency rules.
export function runTransaction<T>(client: PrismaClient, work: (transaction: TransactionClient) => Promise<T>) {
  return client.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
