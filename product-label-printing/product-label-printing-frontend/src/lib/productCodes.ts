export function productCodeCandidates(value: string): string[] {
  const raw = value.trim().toLowerCase()
  const compact = raw.replace(/-/g, '')
  let canonical = ''
  if (/^\d{8}$/.test(compact)) canonical = `${compact.slice(0, 3)}-${compact.slice(3)}`
  if (/^\d{11,}$/.test(compact)) canonical = `${compact.slice(0, 3)}-${compact.slice(3, 8)}-${compact.slice(8)}`
  return canonical && canonical !== raw ? [raw, canonical] : [raw]
}

export function matchesProductCode(value: string | null | undefined, query: string): boolean {
  if (!value) return false
  const code = value.toLowerCase()
  return productCodeCandidates(query).includes(code)
}

export function includesProductCode(value: string | null | undefined, query: string): boolean {
  if (!value) return false
  const code = value.toLowerCase()
  return productCodeCandidates(query).some((candidate) => code.includes(candidate))
}

/** Remove separators only for the generated numeric code format used by Code 128 labels. */
export function compactBarcodeCode(value: string): string {
  return /^\d{3,}-\d{5,}-\d{3,}$/.test(value) ? value.replace(/-/g, '') : value
}
