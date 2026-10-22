export type CashfreeOrderInput = {
  orderId: string
  amount: number
  customerId: string
  customerName: string
  customerEmail: string | null
  customerPhone: string
  returnUrl: string
}

type Fetch = typeof globalThis.fetch

export class CashfreeGateway {
  private readonly request: Fetch
  constructor(request: Fetch = globalThis.fetch) { this.request = request }

  private base(environment: 'sandbox' | 'production') {
    return environment === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg'
  }

  private headers(credentials: Record<string, string>) {
    const clientId = credentials.appId ?? credentials.clientId
    const secret = credentials.secretKey ?? credentials.clientSecret
    if (!clientId || !secret) throw new Error('Cashfree App ID or Secret Key is missing.')
    return { Accept: 'application/json', 'Content-Type': 'application/json', 'x-api-version': '2025-01-01', 'x-client-id': clientId, 'x-client-secret': secret }
  }

  async createOrder(environment: 'sandbox' | 'production', credentials: Record<string, string>, input: CashfreeOrderInput) {
    const response = await this.request(`${this.base(environment)}/orders`, {
      method: 'POST', headers: this.headers(credentials), signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        order_id: input.orderId, order_amount: input.amount, order_currency: 'INR',
        customer_details: { customer_id: input.customerId, customer_name: input.customerName, customer_email: input.customerEmail || undefined, customer_phone: input.customerPhone },
        order_meta: { return_url: input.returnUrl }, order_note: 'ZenxPOS subscription renewal',
      }),
    })
    const payload = await response.json().catch(() => null) as { order_id?: string; payment_session_id?: string; order_status?: string; message?: string } | null
    if (!response.ok || !payload?.order_id || !payload.payment_session_id) throw new Error(payload?.message || `Cashfree checkout creation failed (${response.status}).`)
    return { orderId: payload.order_id, paymentSessionId: payload.payment_session_id, orderStatus: payload.order_status ?? 'ACTIVE' }
  }

  async getOrder(environment: 'sandbox' | 'production', credentials: Record<string, string>, orderId: string) {
    const response = await this.request(`${this.base(environment)}/orders/${encodeURIComponent(orderId)}`, { headers: this.headers(credentials), signal: AbortSignal.timeout(15_000) })
    const payload = await response.json().catch(() => null) as { order_id?: string; order_amount?: number; order_currency?: string; order_status?: string; cf_order_id?: string; message?: string } | null
    if (!response.ok || !payload?.order_id) throw new Error(payload?.message || `Cashfree order verification failed (${response.status}).`)
    return { orderId: payload.order_id, amount: Number(payload.order_amount), currency: payload.order_currency, status: payload.order_status, gatewayReference: payload.cf_order_id ?? payload.order_id }
  }
}
