import { randomUUID } from 'node:crypto'

export type PineLabsCheckoutInput = {
  merchantOrderReference: string
  amountInPaise: number
  callbackUrl: string
  allowedPaymentMethods: string[]
  notes?: string
  customer?: { emailId?: string; firstName?: string; lastName?: string; customerId?: string; mobileNumber?: string }
}

type Fetch = typeof globalThis.fetch

export class PineLabsGateway {
  private readonly request: Fetch
  constructor(request: Fetch = globalThis.fetch) { this.request = request }

  private base(environment: 'sandbox' | 'production') { return environment === 'production' ? 'https://api.pluralpay.in' : 'https://pluraluat.v2.pinepg.in' }
  private headers(token?: string) { return { 'Content-Type': 'application/json', 'Request-ID': randomUUID(), 'Request-Timestamp': new Date().toISOString(), ...(token ? { Authorization: `Bearer ${token}` } : {}) } }

  async checkout(environment: 'sandbox' | 'production', credentials: Record<string, string>, input: PineLabsCheckoutInput) {
    const base = this.base(environment)
    const tokenResponse = await this.request(`${base}/api/auth/v1/token`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ client_id: credentials.clientId, client_secret: credentials.clientSecret, grant_type: 'client_credentials' }), signal: AbortSignal.timeout(15_000) })
    const tokenPayload = await tokenResponse.json().catch(() => null) as { access_token?: string; message?: string; error?: string } | null
    if (!tokenResponse.ok || !tokenPayload?.access_token) throw new Error(`Pine Labs authentication failed (${tokenResponse.status}).`)
    const customer = input.customer ? { email_id: input.customer.emailId, first_name: input.customer.firstName, last_name: input.customer.lastName, customer_id: input.customer.customerId, mobile_number: input.customer.mobileNumber, country_code: '91' } : undefined
    const checkoutResponse = await this.request(`${base}/api/checkout/v1/orders`, { method: 'POST', headers: this.headers(tokenPayload.access_token), body: JSON.stringify({ merchant_order_reference: input.merchantOrderReference, order_amount: { value: input.amountInPaise, currency: 'INR' }, integration_mode: 'REDIRECT', allowed_payment_methods: input.allowedPaymentMethods, notes: input.notes, callback_url: input.callbackUrl, ...(customer ? { purchase_details: { customer } } : {}) }), signal: AbortSignal.timeout(20_000) })
    const payload = await checkoutResponse.json().catch(() => null) as { token?: string; order_id?: string; redirect_url?: string; response_code?: number; response_message?: string } | null
    if (!checkoutResponse.ok || !payload?.order_id || !payload.redirect_url) throw new Error(`Pine Labs checkout creation failed (${checkoutResponse.status}).`)
    return { orderId: payload.order_id, redirectUrl: payload.redirect_url, responseCode: payload.response_code, responseMessage: payload.response_message }
  }
}
