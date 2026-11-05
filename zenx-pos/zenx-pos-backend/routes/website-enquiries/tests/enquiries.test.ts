import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { test } from 'node:test'
import type { AdminIdentity } from '../../../models/admin/contracts.ts'
import type { EnquiryFilters, EnquiryStatus, EnquirySubmission, WebsiteEnquiry, WebsiteEnquiryEmailStore, WebsiteEnquiryInput, WebsiteEnquiryStore } from '../../../models/website-enquiries/contracts.ts'
import { WebsiteEnquiryEmailWorker } from '../../../models/website-enquiries/email-worker.ts'
import { createWebsiteEnquiryAdminRouter } from '../../admin/website-enquiries-router.ts'
import { issueAdminSession } from '../../admin/session.ts'
import { createApp } from '../../system/app.ts'
import { createWebsiteEnquiryRouter } from '../router.ts'
import { WebsiteEnquiryService } from '../service.ts'

type EmailJob = { status: 'pending' | 'processing' | 'retry' | 'sent' | 'failed'; attempt: number; token: string | null; nextAt: Date | null; leaseUntil: Date | null; error: string | null }
class MemoryEnquiries implements WebsiteEnquiryStore, WebsiteEnquiryEmailStore {
  saved: EnquirySubmission[] = []
  emailJobs = new Map<bigint, EmailJob>()
  businessTypeActive = true
  async findSubmission(submissionId: string) { return this.saved.find(value => value.row.submissionId === submissionId) ?? null }
  async activeBusinessTypeName(id: bigint) { return id === 2n && this.businessTypeActive ? 'Retail' : null }
  async create(input: WebsiteEnquiryInput, businessTypeName: string | null, fingerprint: string) {
    const existing = await this.findSubmission(input.submissionId)
    if (existing) return { ...existing, created: false }
    const now = new Date(), value = { fingerprint, row: { ...input, id: BigInt(this.saved.length + 1), businessTypeName, status: 'new' as const, readAt: null, createdAt: now, updatedAt: now } }
    this.saved.push(value)
    this.emailJobs.set(value.row.id, { status: 'pending', attempt: 0, token: null, nextAt: now, leaseUntil: null, error: null })
    return { ...value, created: true }
  }
  async list(filters: EnquiryFilters, page: number, pageSize: number) {
    const rows = this.saved.map(value => value.row).filter(row => (!filters.status || filters.status === row.status) && (!filters.type || filters.type === row.type)).reverse()
    return { rows: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length }
  }
  async unreadCount() { return this.saved.filter(value => !value.row.readAt).length }
  async markRead(id: bigint) {
    const row = this.saved.find(value => value.row.id === id)?.row
    if (!row) return null
    if (!row.readAt) { row.readAt = new Date(); row.updatedAt = row.readAt }
    return row
  }
  async setStatus(id: bigint, status: EnquiryStatus) {
    const row = this.saved.find(value => value.row.id === id)?.row
    if (!row) return null
    row.status = status; row.updatedAt = new Date()
    return row
  }
  async claimEmail(now: Date, leaseUntil: Date, token: string) {
    for (const [id, job] of this.emailJobs) if (['pending', 'retry'].includes(job.status) && job.nextAt && job.nextAt <= now && job.attempt < 5) {
      job.status = 'processing'; job.token = token; job.leaseUntil = leaseUntil; job.attempt++; job.nextAt = null
      return { enquiry: this.saved.find(value => value.row.id === id)!.row, attempt: job.attempt, token }
    }
    return null
  }
  async markEmailSent(id: bigint, token: string) {
    const job = this.emailJobs.get(id)
    if (!job || job.status !== 'processing' || job.token !== token) return false
    job.status = 'sent'; job.token = null; job.leaseUntil = null
    return true
  }
  async retryEmail(id: bigint, token: string, error: string, nextAt: Date | null) {
    const job = this.emailJobs.get(id)
    if (!job || job.status !== 'processing' || job.token !== token) return false
    job.status = nextAt ? 'retry' : 'failed'; job.token = null; job.leaseUntil = null; job.nextAt = nextAt; job.error = error
    return true
  }
}

const valid = () => ({ submissionId: randomUUID(), type: 'quote', selectedPlan: 'Premium', businessName: '  Sri Stores ', contactPersonName: ' Lakshmi ', mobile: '+91 98765 43210', email: ' Owner@Example.com ', businessTypeId: 2, city: ' Madurai ', subject: ' Premium quote ', message: ' Please help us connect two retail stores. ' })
const secret = 'website-enquiry-test-secret-with-more-than-thirty-two-characters'

async function fixture(action: (args: { base: string; cookie: string; store: MemoryEnquiries; setAdmin: (value: boolean) => void }) => Promise<void>, limit = 100) {
  const store = new MemoryEnquiries(), service = new WebsiteEnquiryService(store)
  let activeAdmin = true
  const admin: AdminIdentity = { id: 1n, name: 'Admin', mobile: '9876543210', passwordHash: 'unused', status: 1 }
  const admins = { store: { async findAdminById(id: bigint) { return activeAdmin && id === admin.id ? admin : null } } }
  const server = createServer(createApp(undefined, createWebsiteEnquiryRouter(service, limit), undefined, createWebsiteEnquiryAdminRouter(admins, store, secret, '/console')))
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const { port } = server.address() as { port: number }
  try { await action({ base: `http://127.0.0.1:${port}`, cookie: `zenx_admin=${issueAdminSession(1n, secret)}`, store, setAdmin: value => { activeAdmin = value } }) }
  finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) }
}
const post = (url: string, body: unknown, cookie?: string) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) })

test('public enquiry normalizes details and preserves type/plan without exposing stored records', async () => {
  await fixture(async ({ base, store }) => {
    const result = await post(base + '/api/website-enquiries', { ...valid(), status: 'closed', readAt: new Date().toISOString(), id: 999 })
    assert.equal(result.status, 201)
    assert.equal((await result.json()).data, null)
    assert.equal(result.headers.get('cache-control'), 'no-store')
    const saved = store.saved[0].row
    assert.equal(saved.businessName, 'Sri Stores'); assert.equal(saved.contactPersonName, 'Lakshmi')
    assert.equal(saved.mobile, '9876543210'); assert.equal(saved.email, 'owner@example.com')
    assert.equal(saved.businessTypeId, 2n); assert.equal(saved.businessTypeName, 'Retail')
    assert.equal(saved.selectedPlan, 'Premium'); assert.equal(saved.type, 'quote')
    assert.equal(saved.subject, 'Premium quote'); assert.equal(saved.message, 'Please help us connect two retail stores.')
    assert.equal(saved.status, 'new'); assert.equal(saved.readAt, null)
    for (const path of ['/api/website-enquiries', '/api/website-enquiries/1', '/api/website-enquiries/summary']) assert.equal((await fetch(base + path)).status, 404)
  })
})

test('fresh UUID permits repeat contact details; identical UUID retries are safe and changed payload conflicts', async () => {
  await fixture(async ({ base, store }) => {
    const payload = valid(), url = base + '/api/website-enquiries'
    assert.equal((await post(url, payload)).status, 201)
    store.businessTypeActive = false
    // A historical retry succeeds even if its formerly valid category was later disabled.
    assert.equal((await post(url, { ...payload, email: 'owner@example.com', mobile: '9876543210' })).status, 200)
    assert.equal((await post(url, { ...payload, selectedPlan: 'Standard' })).status, 409)
    assert.equal((await post(url, { ...payload, message: 'Please send a different enquiry.' })).status, 409)
    assert.equal(store.saved.length, 1)
    store.businessTypeActive = true
    assert.equal((await post(url, { ...valid(), type: 'contact', selectedPlan: null })).status, 201)
    assert.equal(store.saved.length, 2)
  })
})

test('public validation rejects invalid business types, field limits, and malformed payloads', async () => {
  await fixture(async ({ base, store }) => {
    const cases = [
      { submissionId: 'not-a-uuid' }, { type: 'registration' }, { selectedPlan: 'Enterprise' },
      { type: 'contact', selectedPlan: 'Standard' }, { businessName: 'A' }, { contactPersonName: 'B' },
      { email: 'bad' }, { mobile: 'text9876543210' }, { mobile: '12345' }, { businessTypeId: 0 },
      { businessTypeId: 999 }, { businessTypeId: 1.2 }, { businessTypeId: Number.MAX_SAFE_INTEGER + 1 },
      { city: 'x'.repeat(101) }, { subject: 'Hi' }, { subject: 'x'.repeat(101) },
      { message: 'Short' }, { message: 'x'.repeat(1001) }, { businessName: 'x'.repeat(256) },
    ]
    for (const changes of cases) {
      const response = await post(base + '/api/website-enquiries', { ...valid(), ...changes })
      assert.equal(response.status, 422, JSON.stringify(changes)); assert.equal(typeof (await response.json()).errors, 'string')
    }
    assert.equal(store.saved.length, 0)
    assert.equal((await post(base + '/api/website-enquiries', { ...valid(), businessTypeId: null, city: null, selectedPlan: 'Help me choose' })).status, 201)
  })
})

test('public enquiries throttle repeated attempts with Retry-After', async () => {
  await fixture(async ({ base, store }) => {
    const url = base + '/api/website-enquiries'
    assert.equal((await post(url, { ...valid(), mobile: 'bad' })).status, 422)
    assert.equal((await post(url, valid())).status, 201)
    const response = await post(url, valid())
    assert.equal(response.status, 429); assert.ok(Number(response.headers.get('retry-after')) > 0)
    assert.equal(store.saved.length, 1)
  }, 2)
})

test('HTTP requests remain available during mail delivery; quote/contact retries do not queue duplicate alerts', async () => {
  await fixture(async ({ base, cookie, store }) => {
    const sent: WebsiteEnquiry[] = []
    let release!: () => void, signal!: () => void
    const pending = new Promise<void>(resolve => { release = resolve })
    const started = new Promise<void>(resolve => { signal = resolve })
    const worker = new WebsiteEnquiryEmailWorker(store, { configured: true, async send(row) { sent.push(row); signal(); await pending } }, { report() {} })
    const payload = valid(), url = base + '/api/website-enquiries'
    assert.equal((await post(url, payload)).status, 201)
    assert.equal(sent.length, 0); assert.equal(store.emailJobs.get(1n)?.status, 'pending')
    const delivery = worker.run()
    try {
      await started
      // The original SMTP operation remains unresolved throughout both HTTP requests.
      assert.equal((await post(url, payload)).status, 200)
      const contact = { ...valid(), type: 'contact', selectedPlan: null, subject: 'A contact message' }
      assert.equal((await post(url, contact)).status, 201)
      assert.equal(store.emailJobs.size, 2); assert.equal(sent.length, 1)
      const inbox = await (await fetch(base + '/console/website-enquiries', { headers: { Cookie: cookie } })).json()
      assert.equal(inbox.meta.total, 2); assert.equal(inbox.data[0].type, 'contact'); assert.equal(inbox.data[1].selectedPlan, 'Premium')
      assert.equal(inbox.data[1].emailJobs, undefined)
    } finally { release(); await delivery; await worker.stop() }
    assert.equal(sent.length, 2); assert.equal(sent[0].type, 'quote'); assert.equal(sent[0].selectedPlan, 'Premium')
    assert.equal(sent[1].type, 'contact'); assert.equal(sent[1].selectedPlan, null)
    assert.equal(store.emailJobs.get(1n)?.status, 'sent'); assert.equal(store.emailJobs.get(2n)?.status, 'sent')
    assert.equal((await post(url, payload)).status, 200); assert.equal(store.emailJobs.size, 2)
  })
})

test('SMTP failure leaves the submitted enquiry in the inbox and persists a delayed retry without changing its details', async () => {
  await fixture(async ({ base, cookie, store }) => {
    let now = new Date(Date.now() + 1000), fail = true, attempts = 0
    const worker = new WebsiteEnquiryEmailWorker(store, { configured: true, async send() { attempts++; if (fail) throw new Error('simulated SMTP outage') } }, { now: () => now, report() {} })
    const payload = { ...valid(), type: 'contact', selectedPlan: null }, url = base + '/api/website-enquiries'
    assert.equal((await post(url, payload)).status, 201)
    const savedAt = store.saved[0].row.updatedAt
    await worker.run()
    assert.equal(attempts, 1); assert.equal(store.emailJobs.get(1n)?.status, 'retry')
    assert.equal(store.emailJobs.get(1n)?.error, 'smtp_delivery_failed')
    assert.equal(store.emailJobs.get(1n)?.nextAt?.getTime(), now.getTime() + 60_000)
    assert.equal((await post(url, payload)).status, 200); assert.equal(store.saved.length, 1)
    const inbox = await (await fetch(base + '/console/website-enquiries', { headers: { Cookie: cookie } })).json()
    assert.equal(inbox.data[0].message, payload.message.trim()); assert.equal(inbox.data[0].status, 'new')
    assert.equal(store.saved[0].row.updatedAt, savedAt)
    await worker.run(); assert.equal(attempts, 1)
    now = new Date(now.getTime() + 60_000); fail = false
    await worker.run(); await worker.run(); await worker.stop()
    assert.equal(attempts, 2); assert.equal(store.emailJobs.get(1n)?.status, 'sent')
  })
})

test('admin inbox requires a current authenticated admin and supports filters, pagination, read-once and status', async () => {
  await fixture(async ({ base, cookie, store, setAdmin }) => {
    const path = base + '/console/website-enquiries'
    for (const suffix of ['', '/summary']) assert.equal((await fetch(path + suffix)).status, 401)
    for (const suffix of ['/1/read', '/1/status']) assert.equal((await post(path + suffix, { status: 'closed' })).status, 401)
    const service = new WebsiteEnquiryService(store)
    for (let index = 0; index < 27; index++) await service.submit({ ...valid(), type: index % 2 ? 'contact' : 'quote', selectedPlan: index % 2 ? null : 'Standard' }, null)
    const get = (suffix: string) => fetch(path + suffix, { headers: { Cookie: cookie } })
    let response = await get(''), payload = await response.json()
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.deepEqual(payload.meta, { total: 27, page: 1, pageSize: 25 }); assert.equal(payload.data.length, 25)
    assert.equal(payload.data[0].id, '27'); assert.equal(payload.data[0].businessTypeId, '2')
    assert.equal(payload.data[0].businessTypeName, 'Retail'); assert.ok(payload.data[0].createdAt)
    assert.equal(payload.data[0].payload_hash, undefined); assert.equal(payload.data[0].requesterIp, undefined)
    payload = await (await get('?page=2')).json(); assert.equal(payload.data.length, 2)
    payload = await (await get('?type=contact&status=new')).json(); assert.equal(payload.meta.total, 13)
    assert.equal((await (await get('/summary')).json()).data.unreadCount, 27)
    response = await post(path + '/27/read', {}, cookie); payload = await response.json()
    const firstRead = payload.data.readAt; assert.ok(firstRead); assert.equal(payload.data.status, 'new')
    payload = await (await post(path + '/27/read', {}, cookie)).json(); assert.equal(payload.data.readAt, firstRead)
    assert.equal((await (await get('/summary')).json()).data.unreadCount, 26)
    payload = await (await post(path + '/27/status', { status: 'in_progress' }, cookie)).json(); assert.equal(payload.data.status, 'in_progress')
    payload = await (await get('?type=quote&status=in_progress')).json(); assert.equal(payload.meta.total, 1)
    for (const suffix of ['?status=pending', '?type=invalid', '?page=-1', '?page=1.5', '?page=Infinity']) assert.equal((await get(suffix)).status, 422)
    assert.equal((await post(path + '/27/status', { status: 'approved' }, cookie)).status, 422)
    assert.equal((await post(path + '/abc/read', {}, cookie)).status, 422)
    assert.equal((await post(path + '/18446744073709551616/read', {}, cookie)).status, 422)
    assert.equal((await post(path + '/999/read', {}, cookie)).status, 404)
    assert.equal((await post(path + '/999/status', { status: 'closed' }, cookie)).status, 404)
    setAdmin(false)
    assert.equal((await get('/summary')).status, 401)
    assert.equal((await post(path + '/27/status', { status: 'closed' }, cookie)).status, 401)
  })
})
