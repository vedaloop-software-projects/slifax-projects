const padded = (value: bigint, width: number) => value.toString().padStart(width, '0')

export const productCode = (clientId: bigint, productId: bigint) =>
  `${padded(clientId, 3)}-${padded(productId, 5)}`

export const variantCode = (clientId: bigint, productId: bigint, variantId: bigint) =>
  `${productCode(clientId, productId)}-${padded(variantId, 3)}`

/** Accept scanner-friendly codes without separators while retaining legacy codes and EANs. */
export function lookupCandidates(value: string): string[] {
  const raw = value.trim()
  const compact = raw.replace(/-/g, '')
  let canonical: string | null = null
  if (/^\d{8}$/.test(compact)) canonical = `${compact.slice(0, 3)}-${compact.slice(3)}`
  if (/^\d{11,}$/.test(compact)) canonical = `${compact.slice(0, 3)}-${compact.slice(3, 8)}-${compact.slice(8)}`
  return canonical && canonical !== raw ? [raw, canonical] : [raw]
}
