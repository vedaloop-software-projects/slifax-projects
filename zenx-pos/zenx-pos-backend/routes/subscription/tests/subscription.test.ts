import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Account } from '../../../models/auth/contracts.ts'
import type { InvoiceMailer, SubscriptionClient, SubscriptionPayment, SubscriptionStore } from '../../../models/subscription/contracts.ts'
import { SubscriptionService } from '../service.ts'
import { DEFAULT_LETTERHEAD } from '../../../models/documents/letterhead.ts'

const account = (overrides: Partial<Account['user']> = {}, endDate = new Date('2026-11-15')): Account => ({
  user: { id: 3n, clientId: 7n, name: 'Praveen', mobile: '9876543210', email: 'owner@kpn.example', passwordHash: null, roleId: 4, isAdmin: 1, updatedAt: null, ...overrides },
  client: { id: 7n, businessTypeId: 2, businessName: 'KPN Fresh Mart', logo: null, address: '', city: '', startDate: new Date('2025-11-16'), endDate }, businessType: 'Retail', roleTitle: 'Admin',
})
const client: SubscriptionClient = { businessName: 'KPN Fresh Mart', contactPerson: 'Praveen', email: 'kpn@example.com', mobile: '9959396644', address: 'Kondapur', city: 'Hyderabad', pincode: 500084, gstNumber: '36ABCDE1234F1Z5',
  duration: 3, subscriptionFinalAmount: 11800, subscriptionGst: 18, installationFinalAmount: 23600, installationGst: 18 }
class MemoryStore implements SubscriptionStore {
  rows: SubscriptionPayment[] = [
    { id: 12n, type: 2, amount: 11800, mode: 2, reference: 'cf_order_1', paidOn: new Date('2026-10-20'), duration: 3 },
    { id: 4n, type: 1, amount: 20000, mode: 1, reference: null, paidOn: new Date('2025-11-16'), duration: 3 },
  ]
  async client(clientId: bigint) { return clientId === 7n ? client : null }
  async payments(clientId: bigint) { return clientId === 7n ? this.rows : [] }
}
class MemoryMailer implements InvoiceMailer {
  configured = true
  sent: Array<Parameters<InvoiceMailer['send']>[0]> = []
  async send(message: Parameters<InvoiceMailer['send']>[0]) { this.sent.push(message) }
}
const settings = { renewalGraceDays: async () => 7, maxDevicesPerUser: async () => 1, list: async () => ({}), update: async () => {} }
const letterheads = { saved: null as null | { design: typeof DEFAULT_LETTERHEAD; updatedAt: Date | null }, async get() { return this.saved }, async save() {} }
const service = (mailer = new MemoryMailer(), now = new Date('2026-10-28T06:00:00Z')) => new SubscriptionService(new MemoryStore(), mailer, letterheads, settings, () => now)

test('subscription details show plan, status, balances and the invoice folder', async () => {
  const data = await service().details(account())
  assert.deepEqual([data.plan.label, data.plan.amount, data.startDate, data.endDate, data.daysLeft, data.status], ['Yearly', 11800, '16-11-2025', '15-11-2026', 18, 'expiring'])
  assert.deepEqual(data.installation, { amount: 23600, paid: 20000, balance: 3600 })
  assert.equal(data.subscriptionPaid, 11800)
  assert.deepEqual(data.invoices.map(row => [row.invoiceNumber, row.type, row.date, row.amount, row.paymentMode]), [['REN-12', 'subscription', '20-10-2026', 11800, 'Bank / UPI / Online'], ['INS-4', 'installation', '16-11-2025', 20000, 'Cash']])
  assert.deepEqual(data.email, { available: true, to: 'ow***@kpn.example' })
  const grace = await service().details(account({}, new Date('2026-10-25')))
  assert.deepEqual([grace.status, grace.graceEndsOn, grace.graceDaysLeft], ['grace', '01-11-2026', 4])
  assert.equal((await service().details(account({}, new Date('2026-10-01')))).status, 'expired')
})

test('only the primary admin can open subscription details and invoices', async () => {
  for (const action of [(s: SubscriptionService, a: Account) => s.details(a), (s: SubscriptionService, a: Account) => s.invoicePdf(a, 12n), (s: SubscriptionService, a: Account) => s.emailInvoice(a, 12n)])
    await assert.rejects(() => action(service(), account({ isAdmin: 0 })), (error: any) => error.status === 403)
})

test('invoice PDFs are generated on request and scoped to the client', async () => {
  const pdf = await service().invoicePdf(account(), 12n)
  assert.equal(pdf.filename, 'ZenxPOS-Invoice-REN-12.pdf')
  assert.equal(pdf.content.subarray(0, 5).toString(), '%PDF-')
  assert.ok(pdf.content.length > 1000)
  await assert.rejects(() => service().invoicePdf(account(), 99n), (error: any) => error.status === 404)
})

test('emailing an invoice attaches a fresh PDF, sends to the signed-in user and is rate limited', async () => {
  const mailer = new MemoryMailer(), subscription = service(mailer)
  assert.deepEqual(await subscription.emailInvoice(account(), 4n), { sentTo: 'ow***@kpn.example', invoiceNumber: 'INS-4' })
  assert.equal(mailer.sent[0]?.to, 'owner@kpn.example')
  assert.equal(mailer.sent[0]?.attachment.filename, 'ZenxPOS-Invoice-INS-4.pdf')
  assert.equal(mailer.sent[0]?.attachment.content.subarray(0, 5).toString(), '%PDF-')
  assert.equal(mailer.sent[0]?.subject, 'Your ZenxPOS invoice INS-4')
  for (let index = 1; index < 5; index++) await subscription.emailInvoice(account(), 4n)
  await assert.rejects(() => subscription.emailInvoice(account(), 4n), (error: any) => error.status === 429)
  const unconfigured = new MemoryMailer(); unconfigured.configured = false
  await assert.rejects(() => service(unconfigured).emailInvoice(account(), 4n), (error: any) => error.status === 503)
  assert.equal((await service(unconfigured).details(account())).email.available, false)
})

test('invoices use the saved letterhead for the seller name', async () => {
  const mailer = new MemoryMailer()
  letterheads.saved = { design: { ...DEFAULT_LETTERHEAD, company: { ...DEFAULT_LETTERHEAD.company, name: 'Slifax Technologies', gstin: '36ABCDE1234F1Z5' } }, updatedAt: null }
  try {
    await service(mailer).emailInvoice(account(), 12n)
    assert.equal(mailer.sent[0]?.subject, 'Your Slifax Technologies invoice REN-12')
    assert.equal((await service().invoicePdf(account(), 12n)).content.subarray(0, 5).toString(), '%PDF-')
  } finally { letterheads.saved = null }
})
