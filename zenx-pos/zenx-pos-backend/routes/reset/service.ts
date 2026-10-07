import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import type { ResetConfig } from '../../models/reset/config.ts'
import type { OtpDelivery, ResetChallenge, ResetStore } from '../../models/reset/contracts.ts'
import { ApiError } from '../auth/service.ts'

const mobile = z.string().regex(/^[6-9]\d{9}$/)
const forgotSchema = z.object({ mobile }).strict()
const verifySchema = z.object({
  mobile,
  otp: z.union([z.string().regex(/^\d{6}$/), z.number().int().min(100000).max(999999).transform(String)]),
}).strict()
const resetSchema = z.object({
  mobile, resetToken: z.string().min(32).max(256),
  newPassword: z.string().min(8).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/),
  confirmPassword: z.string().min(1).max(128),
}).strict().refine((body) => body.newPassword === body.confirmPassword, { message: 'Passwords do not match.' })

function same(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

function todayInIndia(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export class ResetService {
  private readonly store: ResetStore
  private readonly delivery: OtpDelivery
  private readonly config: ResetConfig
  private readonly now: () => Date
  constructor(store: ResetStore, delivery: OtpDelivery, config: ResetConfig, now = () => new Date()) {
    this.store = store; this.delivery = delivery; this.config = config; this.now = now
  }

  private digest(scope: string, value: string) {
    return createHmac('sha256', this.config.secret).update(`${scope}:${value}`).digest('base64url')
  }
  private key(mobileNumber: string) { return `zenxpos:password-reset:${this.digest('mobile', mobileNumber)}` }

  async forgot(input: unknown) {
    const parsed = forgotSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid mobile number.')
    if (!this.delivery.available) throw new ApiError(503, 'Password reset service is temporarily unavailable.')
    const now = this.now()
    const key = this.key(parsed.data.mobile)
    const existing = await this.store.getChallenge(key)
    if (existing && now.getTime() - existing.challenge.createdAt < this.config.resendCooldownSeconds * 1000) {
      throw new ApiError(429, 'Please wait before requesting another OTP.')
    }
    const user = await this.store.findActiveUser(parsed.data.mobile, todayInIndia(now))
    const otp = String(randomInt(100000, 1000000))
    const challenge: ResetChallenge = {
      version: 1, userId: user?.id.toString() ?? '0', clientId: user?.clientId.toString() ?? '0',
      otpHash: this.digest(key, otp), attempts: 0, createdAt: now.getTime(),
      expiresAt: now.getTime() + this.config.otpLifetimeMinutes * 60_000,
    }
    await this.store.putChallenge(key, challenge)
    if (user) {
      try { await this.delivery.sendPasswordResetOtp(parsed.data.mobile, otp, this.config.otpLifetimeMinutes) }
      catch {
        await this.store.deleteChallenge(key)
        throw new ApiError(503, 'Password reset service is temporarily unavailable.')
      }
    }
    return null
  }

  async verify(input: unknown) {
    const parsed = verifySchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid OTP details.')
    const key = this.key(parsed.data.mobile)
    for (let retry = 0; retry < this.config.maxAttempts; retry++) {
      const stored = await this.store.getChallenge(key)
      const now = this.now().getTime()
      if (!stored || stored.challenge.userId === '0' || stored.challenge.expiresAt < now || stored.challenge.attempts >= this.config.maxAttempts) {
        if (stored) await this.store.deleteChallenge(key)
        throw new ApiError(400, 'OTP is invalid or expired.')
      }
      if (!same(stored.challenge.otpHash, this.digest(key, parsed.data.otp))) {
        const next = { ...stored.challenge, attempts: stored.challenge.attempts + 1 }
        if (next.attempts >= this.config.maxAttempts) {
          await this.store.deleteChallenge(key)
          throw new ApiError(400, 'OTP is invalid or expired.')
        }
        if (await this.store.compareAndSetChallenge(key, stored.value, next)) throw new ApiError(400, 'OTP is invalid or expired.')
        continue
      }
      const resetToken = randomBytes(32).toString('base64url')
      const next: ResetChallenge = {
        ...stored.challenge, otpHash: '', attempts: stored.challenge.attempts,
        resetTokenHash: this.digest(key, resetToken), resetExpiresAt: now + this.config.resetLifetimeMinutes * 60_000,
      }
      if (await this.store.compareAndSetChallenge(key, stored.value, next)) return { resetToken }
    }
    throw new ApiError(409, 'OTP verification conflicted. Please try again.')
  }

  async reset(input: unknown) {
    const parsed = resetSchema.safeParse(input)
    if (!parsed.success) {
      const mismatch = parsed.error.issues.some((issue) => issue.message === 'Passwords do not match.')
      throw new ApiError(422, mismatch ? 'Passwords do not match.' : 'Invalid password reset details.')
    }
    const now = this.now()
    const key = this.key(parsed.data.mobile)
    const stored = await this.store.getChallenge(key)
    if (!stored?.challenge.resetTokenHash || !stored.challenge.resetExpiresAt || stored.challenge.resetExpiresAt < now.getTime()
      || !same(stored.challenge.resetTokenHash, this.digest(key, parsed.data.resetToken))) {
      throw new ApiError(400, 'Reset token is invalid or expired.')
    }
    const user = await this.store.findActiveUser(parsed.data.mobile, todayInIndia(now))
    if (!user || user.id.toString() !== stored.challenge.userId || user.clientId.toString() !== stored.challenge.clientId) {
      await this.store.deleteChallenge(key)
      throw new ApiError(400, 'Reset token is invalid or expired.')
    }
    const consumed = await this.store.consumeReset(key, stored.value, user, await hash(parsed.data.newPassword, 12))
    if (!consumed) throw new ApiError(409, 'Password reset conflicted. Please request another OTP.')
  }
}
