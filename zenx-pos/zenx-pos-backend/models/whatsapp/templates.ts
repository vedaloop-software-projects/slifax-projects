// Template placeholders are {{name}}. Two are filled automatically; the store types the rest.
// The provider's approved template uses {{1}}, {{2}}…: parameters are sent in the order the
// placeholders first appear in the body.
export const AUTO_VARIABLES = ['customer_name', 'store_name'] as const
const PLACEHOLDER = /\{\{\s*([a-z][a-z0-9_]{0,39})\s*\}\}/g
export const MAX_VALUE_LENGTH = 200

export function placeholders(body: string) {
  const keys: string[] = []
  for (const match of body.matchAll(PLACEHOLDER)) if (!keys.includes(match[1]!)) keys.push(match[1]!)
  return keys
}

export const isAuto = (key: string) => (AUTO_VARIABLES as readonly string[]).includes(key)

export function variableLabel(key: string) {
  const text = key.replaceAll('_', ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// The fields a store fills in, in body order.
export function inputVariables(body: string) {
  return placeholders(body).filter(key => !isAuto(key)).map(key => ({ key, label: variableLabel(key) }))
}

export function render(body: string, values: Record<string, string>) {
  return body.replace(PLACEHOLDER, (_whole, key: string) => values[key] ?? '')
}

// Meta rejects parameters with new lines, tabs or more than four spaces in a row.
export function cleanValue(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? String(value).replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim() : ''
}

// Returns the cleaned store-typed values, or the first problem.
export function validateValues(body: string, raw: unknown): { values: Record<string, string> } | { error: string } {
  const input = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const values: Record<string, string> = {}
  for (const { key, label } of inputVariables(body)) {
    const value = cleanValue(input[key])
    if (!value) return { error: `Fill in "${label}".` }
    if (value.length > MAX_VALUE_LENGTH) return { error: `"${label}" can be at most ${MAX_VALUE_LENGTH} characters.` }
    values[key] = value
  }
  return { values }
}

// Shown and sent when a customer has no name on record.
export const FALLBACK_NAME = 'Customer'

export function displayName(name: string | null | undefined) {
  const clean = cleanValue(name ?? '')
  return clean ? clean.slice(0, 60) : FALLBACK_NAME
}
