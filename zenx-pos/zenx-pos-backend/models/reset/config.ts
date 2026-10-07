export type ResetConfig = {
  secret: Uint8Array
  otpLifetimeMinutes: number
  resetLifetimeMinutes: number
  resendCooldownSeconds: number
  maxAttempts: number
  deliveryUrl?: URL
  deliveryToken?: string
}

function integer(value: string | undefined, fallback: number, name: string, min: number, max: number) {
  const parsed = Number(value ?? fallback)
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error(`${name} must be between ${min} and ${max}.`)
  return parsed
}

export function loadResetConfig(jwtSecret: Uint8Array, env: NodeJS.ProcessEnv = process.env): ResetConfig {
  const suppliedSecret = env.RESET_HMAC_SECRET
  const secret = suppliedSecret ? new TextEncoder().encode(suppliedSecret) : jwtSecret
  if (secret.byteLength < 32) throw new Error('RESET_HMAC_SECRET must contain at least 32 bytes.')
  let deliveryUrl: URL | undefined
  if (env.OTP_DELIVERY_URL) {
    deliveryUrl = new URL(env.OTP_DELIVERY_URL)
    const local = ['localhost', '127.0.0.1', '::1'].includes(deliveryUrl.hostname)
    if (deliveryUrl.protocol !== 'https:' && !local) throw new Error('OTP_DELIVERY_URL must use HTTPS except on localhost.')
  }
  return {
    secret,
    otpLifetimeMinutes: integer(env.OTP_LIFETIME_MINUTES, 10, 'OTP_LIFETIME_MINUTES', 2, 30),
    resetLifetimeMinutes: integer(env.RESET_TOKEN_LIFETIME_MINUTES, 10, 'RESET_TOKEN_LIFETIME_MINUTES', 2, 30),
    resendCooldownSeconds: integer(env.OTP_RESEND_COOLDOWN_SECONDS, 60, 'OTP_RESEND_COOLDOWN_SECONDS', 30, 600),
    maxAttempts: integer(env.OTP_MAX_ATTEMPTS, 5, 'OTP_MAX_ATTEMPTS', 3, 10),
    deliveryUrl,
    deliveryToken: env.OTP_DELIVERY_TOKEN,
  }
}
