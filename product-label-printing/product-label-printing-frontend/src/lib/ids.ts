// ULID-style identifiers (time-sortable, Crockford base32), prefixed by entity type.
// In production the backend owns ID generation; the mock backend uses this.

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function encodeTime(ms: number, len: number): string {
  let out = ''
  for (let i = 0; i < len; i++) {
    out = ALPHABET[ms % 32] + out
    ms = Math.floor(ms / 32)
  }
  return out
}

function encodeRandom(len: number): string {
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const b of bytes) out += ALPHABET[b % 32]
  return out
}

export function ulid(at = Date.now()): string {
  return encodeTime(at, 10) + encodeRandom(16)
}

export type IdPrefix = 'prd' | 'batch' | 'qr' | 'prn' | 'tpl' | 'job' | 'item' | 'evt' | 'scan' | 'log' | 'usr' | 'shop' | 'q'

export function newId(prefix: IdPrefix, at?: number): string {
  return `${prefix}_${ulid(at)}`
}

/** Short display form: prd_01K8X7A91XQ2 */
export function shortId(id: string): string {
  const [prefix, rest] = id.split('_')
  return rest ? `${prefix}_${rest.slice(0, 12)}` : id
}
