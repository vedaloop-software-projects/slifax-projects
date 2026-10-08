import { createHmac, timingSafeEqual } from 'node:crypto'

export type AdminSession = { adminId: bigint; expiresAt: number }

function signature(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

export function issueAdminSession(adminId: bigint, secret: string, now = Date.now(), ttlMs = 8 * 60 * 60 * 1000) {
  const payload = Buffer.from(JSON.stringify({ adminId: adminId.toString(), expiresAt: now + ttlMs })).toString('base64url')
  return `${payload}.${signature(payload, secret)}`
}

export function readAdminSession(token: string | undefined, secret: string, now = Date.now()): AdminSession | null {
  if (!token) return null
  const [payload, supplied, extra] = token.split('.')
  if (!payload || !supplied || extra) return null
  const expected = signature(payload, secret)
  const left = Buffer.from(supplied)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { adminId?: string; expiresAt?: number }
    if (!parsed.adminId || !Number.isSafeInteger(parsed.expiresAt) || (parsed.expiresAt ?? 0) <= now) return null
    return { adminId: BigInt(parsed.adminId), expiresAt: parsed.expiresAt! }
  } catch { return null }
}

export function cookieValue(header: string | undefined, name: string) {
  for (const part of (header ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=')
    if (key === name) return value.join('=')
  }
  return undefined
}
