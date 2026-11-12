import type { OtpDelivery } from './contracts.ts'

export class UnavailableOtpDelivery implements OtpDelivery {
  readonly available = false
  async sendPasswordResetOtp() { throw new Error('OTP_DELIVERY_UNAVAILABLE') }
}

export class WebhookOtpDelivery implements OtpDelivery {
  readonly available = true
  private readonly url: URL
  private readonly token?: string
  constructor(url: URL, token?: string) { this.url = url; this.token = token }

  async sendPasswordResetOtp(mobile: string, otp: string, expiresInMinutes: number, purpose: 'password_reset' | 'login_takeover' = 'password_reset') {
    const response = await fetch(this.url, {
      method: 'POST', signal: AbortSignal.timeout(5_000),
      headers: { 'Content-Type': 'application/json', ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) },
      body: JSON.stringify({ destination: mobile, code: otp, purpose, expiresInMinutes }),
    })
    if (!response.ok) throw new Error('OTP_DELIVERY_FAILED')
  }
}
