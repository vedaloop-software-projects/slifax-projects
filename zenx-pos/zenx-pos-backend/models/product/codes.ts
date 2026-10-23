import { Prisma } from '@prisma/client'
import { ApiError } from '../../routes/auth/service.ts'
const padded = (value: bigint, width: number) => value.toString().padStart(width, '0')

export const productCode = (clientId: bigint, productId: bigint) =>
  `${padded(clientId, 3)}-${padded(productId, 5)}`

export function variantCode(clientId: bigint, productId: bigint, sequence: bigint) {
  if (sequence < 1n || sequence > 999n) throw new ApiError(422, 'A product can have at most 999 variant codes, including deleted variants.')
  return `${productCode(clientId, productId)}-${padded(sequence, 3)}`
}

export async function allocateVariantCode(tx: Prisma.TransactionClient, clientId: bigint, productId: bigint) {
  await tx.$queryRaw(Prisma.sql`SELECT id FROM products WHERE client_id = ${clientId} AND id = ${productId} FOR UPDATE`)
  // Locking reads see the latest committed rows even after earlier repeatable-read queries.
  const rows = await tx.$queryRaw<Array<{id: bigint}>>(Prisma.sql`SELECT id FROM product_variants WHERE client_id = ${clientId} AND product_id = ${productId} FOR UPDATE`)
  return variantCode(clientId, productId, BigInt(rows.length + 1))
}

/** Accept scanner-friendly codes without separators while retaining legacy codes and EANs. */
export function lookupCandidates(value: string): string[] {
  const raw = value.trim()
  const compact = raw.replace(/-/g, '')
  let canonical: string | null = null
  if (/^\d{8}$/.test(compact)) canonical = `${compact.slice(0, 3)}-${compact.slice(3)}`
  if (/^\d{11,}$/.test(compact)) canonical = `${compact.slice(0, 3)}-${compact.slice(3, 8)}-${compact.slice(8)}`
  return canonical && canonical !== raw ? [raw, canonical] : [raw]
}
