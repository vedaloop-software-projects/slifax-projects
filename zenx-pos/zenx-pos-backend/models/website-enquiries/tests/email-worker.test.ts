import assert from 'node:assert/strict'
import { test } from 'node:test'
import { WebsiteEnquiryEmailWorker } from '../email-worker.ts'
import type { WebsiteEnquiry, WebsiteEnquiryEmailClaim, WebsiteEnquiryEmailDelivery, WebsiteEnquiryEmailStore } from '../contracts.ts'

const date = new Date('2026-11-05T12:00:00Z')
const enquiry: WebsiteEnquiry = {
  id: 1n, submissionId: 'fa31b9e1-1544-45a0-b845-bf96f75122c8', type: 'quote', selectedPlan: 'Premium',
  businessName: 'QA Store', contactPersonName: 'QA Owner', mobile: '9876543210', email: 'qa@example.com',
  businessTypeId: 2n, businessTypeName: 'Retail', city: 'Chennai', subject: 'New store quote', message: 'Please quote for two counters.',
  status: 'new', readAt: null, createdAt: date, updatedAt: date,
}

class Queue implements WebsiteEnquiryEmailStore {
  claimed = 0
  jobs: WebsiteEnquiryEmailClaim[] = []
  sent: Array<{ id: bigint; token: string }> = []
  retries: Array<{ id: bigint; token: string; error: string; at: Date | null }> = []
  leases: number[] = []
  ackFails = false
  async claimEmail(now: Date, leaseUntil: Date, token: string) {
    this.claimed++
    this.leases.push(leaseUntil.getTime() - now.getTime())
    const next = this.jobs.shift()
    return next ? { ...next, token } : null
  }
  async markEmailSent(id: bigint, token: string) {
    if (this.ackFails) throw new Error('private database details')
    this.sent.push({ id, token }); return true
  }
  async retryEmail(id: bigint, token: string, error: string, at: Date | null) { this.retries.push({ id, token, error, at }); return true }
}
const job = (attempt = 1): WebsiteEnquiryEmailClaim => ({ enquiry, attempt, token: '' })
const fixture = (store: Queue, email: WebsiteEnquiryEmailDelivery) => {
  const events: string[] = []
  const worker = new WebsiteEnquiryEmailWorker(store, email, { now: () => date, report: event => events.push(event) })
  return { events, worker }
}

test('worker delivers saved enquiry details, acknowledges success, and does not redeliver on another tick', async () => {
  const queue = new Queue(), sent: WebsiteEnquiry[] = []
  queue.jobs.push(job())
  const { worker, events } = fixture(queue, { configured: true, async send(row) { sent.push(row) } })
  await worker.run(); await worker.run()
  assert.deepEqual(sent, [enquiry]); assert.equal(queue.sent.length, 1); assert.equal(queue.retries.length, 0)
  assert.match(queue.sent[0].token, /^[\da-f-]{36}$/); assert.ok(queue.leases.every(ms => ms === 300_000))
  assert.deepEqual(events, [])
})

test('unconfigured SMTP leaves the queue untouched for a later configured restart', async () => {
  const queue = new Queue(); queue.jobs.push(job())
  const { worker, events } = fixture(queue, { configured: false, async send() { assert.fail('must not send') } })
  worker.start(); await worker.run(); await worker.stop()
  assert.equal(queue.claimed, 0); assert.equal(queue.jobs.length, 1)
  assert.deepEqual(events, ['website_enquiry_email_not_configured'])
})

test('SMTP failures persist bounded backoff, exhaust after five attempts, and never leak SMTP details', async () => {
  const queue = new Queue(); queue.jobs.push(...[1, 2, 3, 4, 5].map(job))
  const { worker, events } = fixture(queue, { configured: true, async send() { throw new Error('password=private recipient=secret@example.com') } })
  await worker.run()
  assert.equal(queue.sent.length, 0)
  assert.deepEqual(queue.retries.map(row => row.at ? row.at.getTime() - date.getTime() : null), [60_000, 300_000, 900_000, 3_600_000, null])
  assert.ok(queue.retries.every(row => row.error === 'smtp_delivery_failed'))
  assert.deepEqual(events, [...Array(4).fill('website_enquiry_email_retry_scheduled'), 'website_enquiry_email_attempts_exhausted'])
  assert.doesNotMatch(JSON.stringify({ retries: queue.retries.map(({ id, ...rest }) => ({ id: String(id), ...rest })), events }), /private|secret@example/)
})

test('overlapping ticks share a batch; shutdown waits for current delivery and leaves remaining jobs queued', async () => {
  const queue = new Queue(); queue.jobs.push(job(), job())
  let finish!: () => void, sending!: () => void
  const started = new Promise<void>(resolve => { sending = resolve })
  const pending = new Promise<void>(resolve => { finish = resolve })
  let count = 0
  const { worker } = fixture(queue, { configured: true, async send() { count++; sending(); await pending } })
  const first = worker.run(), concurrent = worker.run()
  assert.equal(first, concurrent)
  await started
  let stopped = false
  const stopping = worker.stop().then(() => { stopped = true })
  assert.equal(stopped, false)
  finish(); await Promise.all([first, stopping])
  assert.equal(stopped, true); assert.equal(count, 1); assert.equal(queue.jobs.length, 1)
  await worker.run(); assert.equal(count, 1)
})

test('a database acknowledgement failure keeps the lease recoverable without scheduling a second SMTP send immediately', async () => {
  const queue = new Queue(); queue.jobs.push(job()); queue.ackFails = true
  const { worker, events } = fixture(queue, { configured: true, async send() {} })
  await worker.run()
  assert.equal(queue.retries.length, 0)
  assert.deepEqual(events, ['website_enquiry_email_acknowledgement_failed'])
})

test('queue outages and lost leases are reported without throwing into the request server', async () => {
  const queue = new Queue()
  queue.claimEmail = async () => { throw new Error('mysql://secret') }
  const { worker, events } = fixture(queue, { configured: true, async send() { assert.fail('must not send') } })
  await worker.run()
  assert.deepEqual(events, ['website_enquiry_email_queue_unavailable'])
  const lost = new Queue(); lost.jobs.push(job()); lost.markEmailSent = async () => false
  const second = fixture(lost, { configured: true, async send() {} })
  await second.worker.run()
  assert.deepEqual(second.events, ['website_enquiry_email_lease_lost'])
})
