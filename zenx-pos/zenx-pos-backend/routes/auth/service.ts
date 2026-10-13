import { compare, hash } from 'bcryptjs'
import { createHash } from 'node:crypto'
import { jwtVerify, SignJWT } from 'jose'
import { z } from 'zod'
import type { AuthConfig } from '../../models/auth/config.ts'
import type { Account, AuthStore, PermissionRow } from '../../models/auth/contracts.ts'

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const loginSchema = z.object({
  mobileEmail: z.string().trim().min(1).max(255),
  password: z.string().min(1).max(128),
})

const passwordSchema = z.object({
  oldPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/),
  confirmPassword: z.string().min(1).max(128),
}).refine((body) => body.newPassword === body.confirmPassword, { message: 'Passwords do not match.' })

function normalizeLaravelHash(value: string) {
  return value.startsWith('$2y$') ? `$2b$${value.slice(4)}` : value
}

function passwordVersion(value: string | null) {
  return createHash('sha256').update(value ?? '').digest('base64url').slice(0, 22)
}

function calendarDate(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

function activeContract(account: Account, now: Date) {
  const today = calendarDate(now)
  const start = account.client.startDate?.toISOString().slice(0, 10)
  const end = account.client.endDate?.toISOString().slice(0, 10)
  return Boolean(start && end && start <= today && today <= end)
}

function safeId(value: bigint) {
  const result = Number(value)
  if (!Number.isSafeInteger(result)) throw new Error('Database ID exceeds the legacy JSON number range.')
  return result
}

function groupPermissions(rows: PermissionRow[], includePriority: boolean) {
  const groups = new Map<bigint, Record<string, unknown>>()
  for (const row of rows) {
    let group = groups.get(row.featureId)
    if (!group) {
      group = { featureId: safeId(row.featureId), feature: row.feature, subFeatures: [] }
      if (includePriority) group.featurePriority = row.featurePriority
      groups.set(row.featureId, group)
    }
    const subFeature: Record<string, unknown> = {
      subFeatureId: row.subFeatureId === null ? null : safeId(row.subFeatureId),
      subFeature: row.subFeature, view: row.view, add: row.add, edit: row.edit,
    }
    if (includePriority) subFeature.subfeaturePriority = row.subFeaturePriority
    ;(group.subFeatures as Record<string, unknown>[]).push(subFeature)
  }
  return [...groups.values()]
}

export class AuthService {
  private readonly store: AuthStore
  private readonly config: AuthConfig
  private readonly now: () => Date

  constructor(store: AuthStore, config: AuthConfig, now = () => new Date()) {
    this.store = store
    this.config = config
    this.now = now
  }

  private assertContract(account: Account) {
    if (!activeContract(account, this.now())) throw new ApiError(422, 'Client account is inactive or contract expired.')
  }

  private async token(account: Account) {
    return new SignJWT({ cid: account.user.clientId.toString(), pv: passwordVersion(account.user.passwordHash) })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(account.user.id.toString()).setIssuer(this.config.jwtIssuer).setAudience(this.config.jwtAudience)
      .setIssuedAt().setExpirationTime(this.config.jwtLifetime).sign(this.config.jwtSecret)
  }

  private user(account: Account, permissions: PermissionRow[], token?: string, priority = false) {
    return {
      id: safeId(account.user.id), name: account.user.name, mobile: account.user.mobile, email: account.user.email,
      businessTypeId: account.client.businessTypeId, businessType: account.businessType,
      roleId: account.user.roleId, roleTitle: account.roleTitle, clientId: safeId(account.client.id),
      businessName: account.client.businessName, logo: account.client.logo, address: account.client.address,
      city: account.client.city, ...(token ? { token } : {}), permissions: groupPermissions(permissions, priority),
    }
  }

  async login(input: unknown) {
    const parsed = loginSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid login details.')
    const account = await this.store.findAccountByLogin(parsed.data.mobileEmail)
    if (!account?.user.passwordHash || !await compare(parsed.data.password, normalizeLaravelHash(account.user.passwordHash))) {
      throw new ApiError(422, 'Invalid email/mobile or password.')
    }
    this.assertContract(account)
    const permissions = await this.store.listPermissions(account.user.clientId, account.user.roleId)
    if (permissions.length === 0) throw new ApiError(422, 'No menu access assigned. Contact store admin.')
    const token = await this.token(account)
    await this.store.recordAudit(account, 'login', `${account.user.name ?? 'User'} logged in`)
    return { user: this.user(account, permissions, token) }
  }

  async authenticate(header: string | undefined) {
    const match = /^Bearer\s+([^\s]+)$/i.exec(header ?? '')
    if (!match) throw new ApiError(401, 'Unauthorized.')
    try {
      const verified = await jwtVerify(match[1], this.config.jwtSecret, {
        algorithms: ['HS256'], issuer: this.config.jwtIssuer, audience: this.config.jwtAudience,
      })
      if (!/^\d+$/.test(verified.payload.sub ?? '') || !/^\d+$/.test(String(verified.payload.cid ?? ''))) throw new Error('claims')
      const account = await this.store.findAccountByIdentity(BigInt(verified.payload.sub!), BigInt(String(verified.payload.cid)))
      if (!account || verified.payload.pv !== passwordVersion(account.user.passwordHash)) throw new Error('account')
      this.assertContract(account)
      return account
    } catch (error) {
      if (error instanceof ApiError) throw error
      throw new ApiError(401, 'Unauthorized.')
    }
  }

  async changePassword(account: Account, input: unknown) {
    const parsed = passwordSchema.safeParse(input)
    if (!parsed.success) {
      const mismatch = parsed.error.issues.find((issue) => issue.message === 'Passwords do not match.')
      throw new ApiError(422, mismatch?.message ?? 'Password must have at least 8 characters, including uppercase, lowercase, number, and @$!%*?&.')
    }
    if (!account.user.passwordHash || !await compare(parsed.data.oldPassword, normalizeLaravelHash(account.user.passwordHash))) {
      throw new ApiError(400, 'Old password is incorrect.')
    }
    if (await compare(parsed.data.newPassword, normalizeLaravelHash(account.user.passwordHash))) {
      throw new ApiError(422, 'New password must be different from the old password.')
    }
    await this.store.changePassword(account, account.user.passwordHash, await hash(parsed.data.newPassword, 12))
  }

  async permissions(account: Account) {
    this.assertContract(account)
    const rows = await this.store.listPermissions(account.user.clientId, account.user.roleId)
    if (rows.length === 0) throw new ApiError(422, 'No menu access assigned. Contact store admin.')
    return { user: this.user(account, rows, undefined, true) }
  }

  async profile(account: Account) {
    const profile = await this.store.getProfile(account.user.clientId)
    if (!profile) throw new ApiError(404, 'Profile not found.')
    return profile
  }
}
