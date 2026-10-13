export type DatabaseFailure = { code?: string; message: string }

function details(error: unknown, depth = 0): { name: string; code?: string; originalCode?: string } | null {
  if (!error || typeof error !== 'object' || depth > 4) return null
  const value = error as Record<string, unknown>
  const name = typeof value.name === 'string' ? value.name : error.constructor?.name ?? ''
  const code = typeof value.code === 'string' ? value.code : undefined
  const originalCode = typeof value.originalCode === 'string' ? value.originalCode : undefined
  const prismaDatabaseError = new Set(['PrismaClientKnownRequestError', 'PrismaClientUnknownRequestError', 'PrismaClientInitializationError', 'PrismaClientRustPanicError']).has(name)
  if (prismaDatabaseError || name === 'DriverAdapterError' || code && (/^P\d{4}$/.test(code) || /^(?:ECONN|ETIMEDOUT|PROTOCOL_)/.test(code))) return { name, ...(code ? { code } : {}), ...(originalCode ? { originalCode } : {}) }
  for (const child of [value.meta, value.driverAdapterError, value.cause]) {
    const nested = details(child, depth + 1)
    if (nested) return nested
  }
  return null
}

export function classifyDatabaseFailure(error: unknown): DatabaseFailure | null {
  const failure = details(error)
  if (!failure) return null
  if (failure.code === 'P2021' || failure.code === 'P2022') return { code: failure.code, message: 'Database schema is out of date.' }
  if (failure.code === 'P1000') return { code: failure.code, message: 'Database credentials were rejected.' }
  if (failure.code === 'P1001' || failure.code === 'P2039' || failure.originalCode === '45028') return { ...(failure.code ? { code: failure.code } : {}), message: 'Database is unavailable.' }
  if (!failure.code && (failure.name === 'PrismaClientInitializationError' || failure.name === 'PrismaClientUnknownRequestError' || failure.name === 'PrismaClientRustPanicError' || failure.name === 'DriverAdapterError')) return { message: 'Database is unavailable.' }
  if (failure.code && /^(?:ECONN|ETIMEDOUT|PROTOCOL_)/.test(failure.code)) return { code: failure.code, message: 'Database is unavailable.' }
  return null
}
