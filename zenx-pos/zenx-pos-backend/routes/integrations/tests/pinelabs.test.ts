import assert from 'node:assert/strict'
import test from 'node:test'
import { PineLabsGateway } from '../pinelabs.ts'

test('uses tenant credentials server-side and creates a Pine Labs hosted checkout', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const request = async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init })
    return calls.length === 1
      ? new Response(JSON.stringify({ access_token: 'server-only-token' }), { status: 200 })
      : new Response(JSON.stringify({ order_id: 'order-1', redirect_url: 'https://checkout.example/order-1', response_code: 200, response_message: 'OK' }), { status: 200 })
  }
  const result = await new PineLabsGateway(request as typeof fetch).checkout('sandbox', { clientId: 'client', clientSecret: 'secret' }, { merchantOrderReference: 'BILL_1', amountInPaise: 12345, callbackUrl: 'https://merchant.example/callback', allowedPaymentMethods: ['CARD', 'UPI'] })
  assert.equal(calls[0]?.url, 'https://pluraluat.v2.pinepg.in/api/auth/v1/token')
  assert.equal(calls[1]?.url, 'https://pluraluat.v2.pinepg.in/api/checkout/v1/orders')
  assert.equal((calls[1]?.init?.headers as Record<string, string>).Authorization, 'Bearer server-only-token')
  assert.deepEqual(result, { orderId: 'order-1', redirectUrl: 'https://checkout.example/order-1', responseCode: 200, responseMessage: 'OK' })
  assert.equal(JSON.stringify(result).includes('server-only-token'), false)
})
