import { compare, hash } from 'bcryptjs'
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { decodeJwt, jwtVerify, SignJWT } from 'jose'
import { z } from 'zod'
import type { AuthConfig } from '../../models/auth/config.ts'
import type { Account, AuthStore, PermissionRow } from '../../models/auth/contracts.ts'
import type { PlatformSettingsStore, SessionStore } from '../../models/platform/contracts.ts'
import type { DeviceInfo } from '../../models/platform/contracts.ts'
import type { IpLocator } from '../../models/platform/geo.ts'
import type { ResetConfig } from '../../models/reset/config.ts'
import type { ChallengeStore, OtpDelivery } from '../../models/reset/contracts.ts'
import { businessDateText, DEFAULT_TIME_ZONE, validTimeZone, zonedParts } from '../../models/system/business-time.ts'

export class ApiError extends Error {
  readonly status: number
  readonly details?: unknown
  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.status = status
    if (details !== undefined) this.details = details
  }
}

const optionalText = (limit: number) => z.preprocess(value => typeof value === 'string' && value.trim() ? value.trim().slice(0, limit) : null, z.string().nullable())
const loginSchema = z.object({
  mobileEmail: z.string().trim().min(1).max(255),
  password: z.string().min(1).max(128),
  // Older app builds send no device details; they share one 'unknown' device slot.
  deviceId: optionalText(191), deviceName: optionalText(255), platform: optionalText(50),
  // Builds released before 05-11-2026 send the device's zone. It is accepted so they can
  // still log in, and never used.
  timeZone: optionalText(64),
})
// "Sign out on <device> & continue here". A blocked login gets a ticket; the takeover goes
// through only when the signed-in device answers "Yes, it's me", or, if it has not answered
// within TAKEOVER_WAIT_SECONDS (switched off, lost, stolen), with an OTP sent to the
// account's mobile. A password alone (leaked) never signs the other device out.
export const TAKEOVER_WAIT_SECONDS = 120
const TAKEOVER_TICKET_SECONDS = 15 * 60
const takeoverTicketSchema = z.object({ ticket: z.string().min(20).max(2048) })
const takeoverCompleteSchema = z.object({
  ticket: z.string().min(20).max(2048),
  otp: z.union([z.string().regex(/^\d{6}$/), z.number().int().min(100000).max(999999).transform(String)]).optional(),
})
type TakeoverState = 'waiting' | 'approved' | 'denied' | 'otp_required'
export type TakeoverOtp = { store: ChallengeStore; delivery: OtpDelivery; config: ResetConfig }

function maskMobile(mobile: string | null) {
  return mobile && mobile.length >= 4 ? `${'*'.repeat(Math.max(0, mobile.length - 4))}${mobile.slice(-4)}` : null
}

function sameText(left: string, right: string) {
  const a = Buffer.from(left), b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

const alertResponseSchema = z.object({ alertId: z.coerce.number().int().positive().safe(), response: z.enum(['me', 'not_me', 'dismissed']) })

export type LoginContext = { ip?: string | null }

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

function calendarDate(now: Date, zone: string) {
  const { year, month, day } = zonedParts(now, zone)
  return `${year}-${month}-${day}`
}

function addDays(isoDate: string, days: number) {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

// A contract keeps full access for `graceDays` after its end date; after that the
// client is inactive and only the renewal routes work.
export function contractState(account: Account, now: Date, graceDays: number) {
  const today = calendarDate(now, validTimeZone(account.client.timeZone) ?? DEFAULT_TIME_ZONE)
  const start = account.client.startDate?.toISOString().slice(0, 10)
  const end = account.client.endDate?.toISOString().slice(0, 10)
  const daysLeft = end ? Math.round((Date.parse(end) - Date.parse(today)) / 86_400_000) : null
  if (!start || !end || today < start) return { active: false, inGrace: false, endDate: end ?? null, graceEndsOn: null, graceDaysLeft: 0, daysLeft }
  const graceEndsOn = addDays(end, graceDays)
  const inGrace = end < today && today <= graceEndsOn
  return { active: today <= graceEndsOn, inGrace, endDate: end, graceEndsOn, graceDaysLeft: inGrace ? Math.round((Date.parse(graceEndsOn) - Date.parse(today)) / 86_400_000) : 0, daysLeft }
}

function deviceLabel(name: string | null, platform: string | null) {
  return name ?? (platform ? `${platform} device` : 'another device')
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
  private readonly sessions?: SessionStore
  private readonly settings?: PlatformSettingsStore
  private readonly locator?: IpLocator
  private readonly otp?: TakeoverOtp

  constructor(store: AuthStore, config: AuthConfig, now = () => new Date(), options: { sessions?: SessionStore; settings?: PlatformSettingsStore; locator?: IpLocator; otp?: TakeoverOtp } = {}) {
    this.store = store
    this.config = config
    this.now = now
    if (options.sessions) this.sessions = options.sessions
    if (options.settings) this.settings = options.settings
    if (options.locator) this.locator = options.locator
    if (options.otp) this.otp = options.otp
  }

  private async contract(account: Account) {
    return contractState(account, this.now(), await this.settings?.renewalGraceDays() ?? 0)
  }

  private async assertContract(account: Account) {
    // The code lets apps send the user to renewal instead of failing each screen.
    if (!(await this.contract(account)).active) throw new ApiError(422, 'Client account is inactive or contract expired.', { code: 'CONTRACT_EXPIRED' })
  }

  private async token(account: Account, sessionId?: string) {
    return new SignJWT({ cid: account.user.clientId.toString(), pv: passwordVersion(account.user.passwordHash), ...(sessionId ? { sid: sessionId } : {}) })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(account.user.id.toString()).setIssuer(this.config.jwtIssuer).setAudience(this.config.jwtAudience)
      .setIssuedAt().setExpirationTime(this.config.jwtLifetime).sign(this.config.jwtSecret)
  }

  private user(account: Account, permissions: PermissionRow[], token?: string, priority = false, renewalRequired = false) {
    return {
      id: safeId(account.user.id), name: account.user.name, mobile: account.user.mobile, email: account.user.email,
      businessTypeId: account.client.businessTypeId, businessType: account.businessType,
      roleId: account.user.roleId, roleTitle: account.roleTitle, isAdmin: account.user.isAdmin ?? 0, clientId: safeId(account.client.id),
      businessName: account.client.businessName, logo: account.client.logo, address: account.client.address,
      city: account.client.city, ...(token ? { token } : {}), renewalRequired, permissions: groupPermissions(permissions, priority),
    }
  }

  async login(input: unknown, context: LoginContext = {}) {
    const parsed = loginSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid login details.')
    const account = await this.store.findAccountByLogin(parsed.data.mobileEmail)
    if (!account?.user.passwordHash || !await compare(parsed.data.password, normalizeLaravelHash(account.user.passwordHash))) {
      throw new ApiError(422, 'Invalid email/mobile or password.')
    }
    const permissions = await this.store.listPermissions(account.user.clientId, account.user.roleId)
    if (permissions.length === 0) throw new ApiError(422, 'No menu access assigned. Contact store admin.')
    const device = { deviceId: parsed.data.deviceId ?? 'unknown', deviceName: parsed.data.deviceName, platform: parsed.data.platform, ipAddress: context.ip ?? null, location: await this.locator?.locate(context.ip ?? null) ?? null }
    return this.signIn(account, permissions, device, false)
  }

  // Opens the session (refusing, or with `takeOver` signing out, the other device) and
  // returns the login payload.
  private async signIn(account: Account, permissions: PermissionRow[], device: DeviceInfo, takeOver: boolean) {
    const sessionId = this.sessions ? randomBytes(32).toString('hex') : undefined
    const token = await this.token(account, sessionId)
    if (this.sessions && sessionId) {
      const opened = await this.sessions.open(account.user.clientId, account.user.id, sessionId, device, new Date(decodeJwt(token).exp! * 1000), await this.settings?.maxDevicesPerUser() ?? 1, takeOver)
      if (opened.opened && opened.signedOut.length) {
        await this.store.recordAudit(account, 'login_takeover', `Signed in on ${deviceLabel(device.deviceName, device.platform)}; signed out ${opened.signedOut.map(other => deviceLabel(other.deviceName, other.platform)).join(', ')}`)
      }
      if (!opened.opened) {
        const alertId = await this.sessions.recordAlert(account.user.clientId, account.user.id, device).catch(() => null)
        await this.store.recordAudit(account, 'login_blocked', `Login blocked on ${deviceLabel(device.deviceName, device.platform)}; already active on ${deviceLabel(opened.blockedBy.deviceName, opened.blockedBy.platform)}`)
        const active = opened.blockedBy
        const where = `${deviceLabel(active.deviceName, active.platform)}${active.location ? ` (${active.location})` : ''}`
        throw new ApiError(409, opened.limit === 1
          ? `This account is already logged in on ${where}. Log out there first, or ask your administrator to sign that device out.`
          : `This account is already logged in on ${opened.limit} devices, including ${where}. Log out on one of them first.`, {
          code: 'SESSION_ACTIVE_ELSEWHERE', deviceLimit: opened.limit,
          activeDevice: { deviceName: active.deviceName, platform: active.platform, location: active.location, loggedInAt: active.createdAt, lastActiveAt: active.lastSeenAt },
          ...(alertId ? { takeover: { ticket: await this.takeoverTicket(account, alertId, device), waitSeconds: TAKEOVER_WAIT_SECONDS } } : {}),
        })
      }
    }
    await this.rememberTimeZone(account, device.ipAddress)
    await this.store.recordAudit(account, 'login', `${account.user.name ?? 'User'} logged in`)
    const contract = await this.contract(account)
    return { user: { ...this.user(account, permissions, token, false, !contract.active), contract: { endDate: contract.endDate, inGrace: contract.inGrace, graceEndsOn: contract.graceEndsOn, graceDaysLeft: contract.graceDaysLeft, daysLeft: contract.daysLeft }, ...this.clock(account) } }
  }

  private takeoverAudience() { return `${this.config.jwtAudience}:login-takeover` }

  private takeoverTicket(account: Account, alertId: bigint, device: DeviceInfo) {
    return new SignJWT({ cid: account.user.clientId.toString(), pv: passwordVersion(account.user.passwordHash), aid: alertId.toString(), did: device.deviceId, dn: device.deviceName, pf: device.platform })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(account.user.id.toString()).setIssuer(this.config.jwtIssuer).setAudience(this.takeoverAudience())
      .setIssuedAt(Math.floor(this.now().getTime() / 1000)).setExpirationTime(Math.floor(this.now().getTime() / 1000) + TAKEOVER_TICKET_SECONDS).sign(this.config.jwtSecret)
  }

  private async takeover(ticket: string) {
    const expired = () => new ApiError(401, 'This sign-in request has expired. Please log in again.', { code: 'TAKEOVER_EXPIRED' })
    if (!this.sessions) throw expired()
    let claims: Record<string, unknown>
    try {
      claims = (await jwtVerify(ticket, this.config.jwtSecret, { algorithms: ['HS256'], issuer: this.config.jwtIssuer, audience: this.takeoverAudience(), currentDate: this.now() })).payload
    } catch { throw expired() }
    const [sub, cid, aid] = [claims.sub, claims.cid, claims.aid].map(String)
    if (!/^\d+$/.test(sub!) || !/^\d+$/.test(cid!) || !/^\d+$/.test(aid!) || typeof claims.did !== 'string') throw expired()
    const account = await this.store.findAccountByIdentity(BigInt(sub!), BigInt(cid!))
    // A password change since the attempt cancels it.
    if (!account || claims.pv !== passwordVersion(account.user.passwordHash)) throw expired()
    const alertId = BigInt(aid!)
    const alert = await this.sessions.alertStatus(alertId, account.user.id)
    if (!alert) throw expired()
    const waited = this.now().getTime() - alert.createdAt.getTime()
    const state: TakeoverState = alert.response === 'not_me' ? 'denied'
      : alert.response === 'me' ? 'approved'
      : waited >= TAKEOVER_WAIT_SECONDS * 1000 ? 'otp_required' : 'waiting'
    const device = { deviceId: claims.did, deviceName: typeof claims.dn === 'string' ? claims.dn : null, platform: typeof claims.pf === 'string' ? claims.pf : null }
    return { account, alertId, state, device, retryAfterSeconds: state === 'waiting' ? Math.ceil((TAKEOVER_WAIT_SECONDS * 1000 - waited) / 1000) : 0 }
  }

  private otpAvailable(account: Account) { return Boolean(this.otp?.delivery.available && account.user.mobile) }

  private otpKey(alertId: bigint, userId: bigint) {
    return `zenxpos:login-takeover:${createHmac('sha256', this.otp!.config.secret).update(`${userId}:${alertId}`).digest('base64url')}`
  }

  private otpHash(key: string, otp: string) { return createHmac('sha256', this.otp!.config.secret).update(`${key}:${otp}`).digest('base64url') }

  private assertTakeoverState(state: TakeoverState, retryAfterSeconds: number) {
    if (state === 'denied') throw new ApiError(403, 'The signed-in device said this login was not them. Change your password if you did not try to log in.', { code: 'TAKEOVER_DENIED' })
    if (state === 'waiting') throw new ApiError(409, 'Waiting for the signed-in device to respond.', { code: 'TAKEOVER_WAITING', retryAfterSeconds })
  }

  async takeoverStatus(input: unknown) {
    const parsed = takeoverTicketSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid sign-in request.')
    const { account, state, retryAfterSeconds } = await this.takeover(parsed.data.ticket)
    return { state, retryAfterSeconds, otpAvailable: this.otpAvailable(account), otpDestination: maskMobile(account.user.mobile) }
  }

  async sendTakeoverOtp(input: unknown) {
    const parsed = takeoverTicketSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid sign-in request.')
    const { account, alertId, state, retryAfterSeconds } = await this.takeover(parsed.data.ticket)
    this.assertTakeoverState(state, retryAfterSeconds)
    if (state === 'approved') return { otpRequired: false, otpDestination: null, expiresInMinutes: 0 }
    if (!this.otpAvailable(account)) throw new ApiError(503, 'OTP verification is not available yet. Contact ZenxPOS support (support@zenxpos.com) to sign that device out.', { code: 'TAKEOVER_OTP_UNAVAILABLE' })
    const { store, delivery, config } = this.otp!
    const key = this.otpKey(alertId, account.user.id)
    const now = this.now().getTime()
    const existing = await store.getChallenge(key)
    if (existing && now - existing.challenge.createdAt < config.resendCooldownSeconds * 1000) throw new ApiError(429, 'Please wait before requesting another OTP.')
    const otp = String(randomInt(100000, 1000000))
    await store.putChallenge(key, { version: 1, userId: account.user.id.toString(), clientId: account.user.clientId.toString(), otpHash: this.otpHash(key, otp), attempts: 0, createdAt: now, expiresAt: now + config.otpLifetimeMinutes * 60_000 })
    try { await delivery.sendPasswordResetOtp(account.user.mobile!, otp, config.otpLifetimeMinutes, 'login_takeover') }
    catch {
      await store.deleteChallenge(key)
      throw new ApiError(503, 'Could not send the OTP. Please try again.')
    }
    return { otpRequired: true, otpDestination: maskMobile(account.user.mobile), expiresInMinutes: config.otpLifetimeMinutes }
  }

  private async consumeTakeoverOtp(alertId: bigint, account: Account, otp: string | undefined) {
    const invalid = () => new ApiError(400, 'OTP is invalid or expired.', { code: 'TAKEOVER_OTP_INVALID' })
    if (!this.otp || !otp) throw new ApiError(422, 'Enter the OTP sent to your registered mobile number.', { code: 'TAKEOVER_OTP_REQUIRED' })
    const { store, config } = this.otp
    const key = this.otpKey(alertId, account.user.id)
    for (let retry = 0; retry < config.maxAttempts; retry++) {
      const stored = await store.getChallenge(key)
      if (!stored || stored.challenge.userId !== account.user.id.toString() || stored.challenge.expiresAt < this.now().getTime() || stored.challenge.attempts >= config.maxAttempts) {
        if (stored) await store.deleteChallenge(key)
        throw invalid()
      }
      if (sameText(stored.challenge.otpHash, this.otpHash(key, otp))) {
        // Single use: a second request with the same OTP finds nothing.
        if (await store.compareAndSetChallenge(key, stored.value, { ...stored.challenge, otpHash: '', attempts: config.maxAttempts })) { await store.deleteChallenge(key); return }
        continue
      }
      const next = { ...stored.challenge, attempts: stored.challenge.attempts + 1 }
      if (next.attempts >= config.maxAttempts) { await store.deleteChallenge(key); throw invalid() }
      if (await store.compareAndSetChallenge(key, stored.value, next)) throw invalid()
    }
    throw invalid()
  }

  async completeTakeover(input: unknown, context: LoginContext = {}) {
    const parsed = takeoverCompleteSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid sign-in request.')
    const { account, alertId, state, device, retryAfterSeconds } = await this.takeover(parsed.data.ticket)
    this.assertTakeoverState(state, retryAfterSeconds)
    if (state === 'otp_required') await this.consumeTakeoverOtp(alertId, account, parsed.data.otp)
    const permissions = await this.store.listPermissions(account.user.clientId, account.user.roleId)
    if (permissions.length === 0) throw new ApiError(422, 'No menu access assigned. Contact store admin.')
    const ip = context.ip ?? null
    return this.signIn(account, permissions, { ...device, ipAddress: ip, location: await this.locator?.locate(ip) ?? null }, true)
  }

  // The store's zone comes from the IP lookup at its first login and is then kept; super
  // admin changes it on purpose. A device's own timezone setting is never used: devices
  // (emulators, tablets set to another zone) must not move the store's business day.
  private async rememberTimeZone(account: Account, ip: string | null) {
    if (validTimeZone(account.client.timeZone)) return
    const detected = validTimeZone(await this.locator?.timeZone?.(ip).catch(() => null))
    if (!detected) return
    await this.store.setTimeZone?.(account.client.id, detected)
    account.client.timeZone = detected
  }

  // Server time and the store's business date, so the app never trusts the device clock.
  clock(account: Account, now = this.now()) {
    const timeZone = validTimeZone(account.client.timeZone) ?? DEFAULT_TIME_ZONE
    return { timeZone, serverTime: now.toISOString(), businessDate: businessDateText(now, timeZone) }
  }

  async logout(account: Account) {
    if (account.sessionId) await this.sessions?.revoke(account.sessionId, 'logout')
  }

  async loginAlerts(account: Account) {
    const alerts = await this.sessions?.pendingAlerts(account.user.id) ?? []
    return { alerts: alerts.map(alert => ({ id: safeId(alert.id), deviceName: alert.deviceName, platform: alert.platform, location: alert.location, attemptedAt: alert.attemptedAt })) }
  }

  async respondLoginAlert(account: Account, input: unknown) {
    const parsed = alertResponseSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid login alert response.')
    if (!await this.sessions?.respondAlert(account.user.id, BigInt(parsed.data.alertId), parsed.data.response)) throw new ApiError(404, 'Login alert not found.')
    if (parsed.data.response === 'not_me') await this.store.recordAudit(account, 'login_alert', 'User reported an unrecognised login attempt')
  }

  private async authenticatedAccount(header: string | undefined) {
    const match = /^Bearer\s+([^\s]+)$/i.exec(header ?? '')
    if (!match) throw new ApiError(401, 'Unauthorized.')
    try {
      const verified = await jwtVerify(match[1], this.config.jwtSecret, {
        algorithms: ['HS256'], issuer: this.config.jwtIssuer, audience: this.config.jwtAudience,
      })
      if (!/^\d+$/.test(verified.payload.sub ?? '') || !/^\d+$/.test(String(verified.payload.cid ?? ''))) throw new Error('claims')
      const account = await this.store.findAccountByIdentity(BigInt(verified.payload.sub!), BigInt(String(verified.payload.cid)))
      if (!account || verified.payload.pv !== passwordVersion(account.user.passwordHash)) throw new Error('account')
      // Tokens issued before single-device sessions carry no sid and stay valid until they expire.
      const sessionId = typeof verified.payload.sid === 'string' ? verified.payload.sid : undefined
      if (sessionId && this.sessions && !await this.sessions.isActive(sessionId, account.user.id)) {
        const reason = await this.sessions.endedReason?.(sessionId, account.user.id).catch(() => null)
        throw new ApiError(401, reason === 'signed_in_elsewhere'
          ? 'You were signed out because this account was signed in on another device.'
          : 'Your session has ended. Please log in again.', { code: 'SESSION_ENDED', ...(reason === 'signed_in_elsewhere' ? { reason } : {}) })
      }
      return sessionId ? { ...account, sessionId } : account
    } catch (error) {
      if (error instanceof ApiError) throw error
      throw new ApiError(401, 'Unauthorized.')
    }
  }

  async authenticate(header: string | undefined) {
    const account = await this.authenticatedAccount(header)
    await this.assertContract(account)
    return account
  }

  authenticateForRenewal(header: string | undefined) {
    return this.authenticatedAccount(header)
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
    await this.assertContract(account)
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
