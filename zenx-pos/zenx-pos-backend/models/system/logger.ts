const sensitive = /pass(word)?|token|secret|authorization|cookie|otp|database.?url/i

function clean(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated]'
  if (value instanceof Error) return { name: value.name, message: 'Request processing failed' }
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => clean(item, depth + 1))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).slice(0, 50).map(([key, item]) => [key, sensitive.test(key) ? '[redacted]' : clean(item, depth + 1)]))
  if (typeof value === 'string' && value.length > 500) return value.slice(0, 500) + '[truncated]'
  return value
}

export function logError(event: string, context: Record<string, unknown> = {}) {
  console.error(JSON.stringify({ level: 'error', event, timestamp: new Date().toISOString(), ...clean(context) as Record<string, unknown> }))
}

export const redactForLog = clean
