import assert from 'node:assert/strict'
import test from 'node:test'
import type { Account } from '../../../models/auth/contracts.ts'
import type { IntegrationStore } from '../../../models/integrations/contracts.ts'
import { CashfreeGateway } from '../cashfree.ts'
import { IntegrationService } from '../service.ts'

test('uses ZenxPOS platform credentials server-side for Cashfree renewal orders', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const request = async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init })
    return new Response(JSON.stringify({ order_id: 'REN_8_12345678', payment_session_id: 'session-only-for-client', order_status: 'ACTIVE' }), { status: 200 })
  }
  const result = await new CashfreeGateway(request as typeof fetch).createOrder('sandbox', { appId: 'zenxpos-app', secretKey: 'zenxpos-secret' }, {
    orderId: 'REN_8_12345678', amount: 2500, customerId: '8', customerName: 'KPN Freshmart', customerEmail: 'store@example.com', customerPhone: '9999999999', returnUrl: 'https://staging-retail-api.zenxpos.com/api/subscription/cashfree/return?order_id=REN_8_12345678',
  })
  assert.equal(calls[0]?.url, 'https://sandbox.cashfree.com/pg/orders')
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-client-id'], 'zenxpos-app')
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-client-secret'], 'zenxpos-secret')
  assert.equal(JSON.stringify(result).includes('zenxpos-secret'), false)
  assert.equal(result.paymentSessionId, 'session-only-for-client')
})

test('subscription renewal uses the single ZenxPOS Cashfree account instead of tenant credentials', async () => {
  let recordedProvider = ''
  const store = {
    renewalQuote: async () => ({ businessName: 'KPN Freshmart', contactPerson: 'Praveen', email: 'store@example.com', mobile: '9999999999', amount: 2500, duration: 3, endDate: new Date('2026-10-21') }),
    recordCheckout: async (input: { providerCode: string }) => { recordedProvider = input.providerCode },
    findActive: async () => { throw new Error('Tenant Cashfree credentials must not be read for subscription renewal.') },
  } as unknown as IntegrationStore
  const request = async () => new Response(JSON.stringify({ order_id: 'REN_8_12345678', payment_session_id: 'platform-session', order_status: 'ACTIVE' }), { status: 200 })
  const service = new IntegrationService(store, undefined, undefined, new CashfreeGateway(request as typeof fetch), {
    appId: 'zenxpos-app', secretKey: 'zenxpos-secret', environment: 'sandbox', returnUrl: 'https://staging-retail-api.zenxpos.com/api/subscription/cashfree/return?order_id={order_id}',
  })
  const account = { user: { id: 13n }, client: { id: 8n } } as Account
  assert.equal((await service.renewalQuote(account)).cashfreeConfigured, true)
  assert.equal((await service.createCashfreeRenewal(account)).paymentSessionId, 'platform-session')
  assert.equal(recordedProvider, 'cashfree')
})
