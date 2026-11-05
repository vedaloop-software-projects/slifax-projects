import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import type { PrismaClient, WebsiteEnquiries } from '@prisma/client'
import type { WebsiteEnquiryInput } from '../contracts.ts'
import { PrismaWebsiteEnquiryStore } from '../prisma-store.ts'

const input = (): WebsiteEnquiryInput => ({ submissionId: randomUUID(), type: 'quote', selectedPlan: 'Premium', businessName: 'Store', contactPersonName: 'Owner', mobile: '9876543210', email: 'owner@example.com', businessTypeId: 2n, city: 'Madurai', subject: 'Quote request', message: 'Please help us choose a setup.' })
const date = new Date('2026-11-05T12:00:00Z')
const record = (value: WebsiteEnquiryInput): WebsiteEnquiries => ({ id: 9007199254740993n, submission_id: value.submissionId, payload_hash: 'hash', type: value.type, selected_plan: value.selectedPlan, business_name: value.businessName, contact_person_name: value.contactPersonName, mobile: value.mobile, email: value.email, business_type_id: value.businessTypeId, business_type_name: 'Retail', city: value.city, subject: value.subject, message: value.message, status: 'new', read_at: null, read_by: null, updated_by: null, requester_ip: '127.0.0.1', created_at: date, updated_at: date, email_status: 'not_requested', email_attempts: 0, email_next_attempt_at: null, email_lease_token: null, email_lease_expires_at: null, email_sent_at: null, email_last_error: null })

test('Prisma enquiry create maps all submitted fields and survives unique-key retry races', async () => {
  const value = input(), saved = record(value)
  let createData: Record<string, unknown> = {}, collision = false
  const store = new PrismaWebsiteEnquiryStore({ websiteEnquiries: {
    async create(args: { data: Record<string, unknown> }) { if (collision) throw Object.assign(new Error('duplicate'), { code: 'P2002' }); createData = args.data; return saved },
    async findUnique(args: unknown) { assert.deepEqual(args, { where: { submission_id: value.submissionId } }); return saved },
  } } as unknown as PrismaClient)
  const result = await store.create(value, 'Retail', 'hash', '127.0.0.1')
  assert.equal(result.created, true)
  assert.deepEqual(createData, { submission_id: value.submissionId, payload_hash: 'hash', type: 'quote', selected_plan: 'Premium', business_name: value.businessName, contact_person_name: value.contactPersonName, mobile: value.mobile, email: value.email, business_type_id: 2n, business_type_name: 'Retail', city: value.city, subject: value.subject, message: value.message, requester_ip: '127.0.0.1', status: 'new', created_at: createData.created_at, updated_at: createData.created_at, email_status: 'pending', email_next_attempt_at: createData.created_at })
  assert.ok(createData.created_at instanceof Date)
  assert.deepEqual(result.row, { ...value, id: saved.id, businessTypeName: 'Retail', status: 'new', readAt: null, createdAt: date, updatedAt: date })
  collision = true
  assert.equal((await store.create(value, 'Retail', 'hash', null)).created, false)
})

test('Prisma enquiry queries constrain business types, paginate correctly, and do not replace first-read metadata', async () => {
  const saved = record(input()), queries: unknown[] = [], updates: Array<{ where: Record<string, unknown>; data: Record<string, unknown> }> = []
  const store = new PrismaWebsiteEnquiryStore({
    businessTypes: { async findFirst(args: unknown) { assert.deepEqual(args, { where: { id: 2n, status: 1, trash: 0 }, select: { business_type: true } }); return { business_type: 'Retail' } }, },
    websiteEnquiries: {
      async findMany(args: unknown) { queries.push(args); return [saved] },
      async count(args: unknown) { queries.push(args); return 1 },
      async updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }) { updates.push(args); return { count: 1 } },
      async findUnique(args: unknown) { assert.deepEqual(args, { where: { id: saved.id } }); return saved },
    },
  } as unknown as PrismaClient)
  assert.equal(await store.activeBusinessTypeName(2n), 'Retail')
  assert.equal((await store.list({ type: 'quote', status: 'new' }, 2, 25)).rows[0].id, 9007199254740993n)
  assert.deepEqual(queries.slice(0, 2), [ { where: { type: 'quote', status: 'new' }, orderBy: { id: 'desc' }, skip: 25, take: 25 }, { where: { type: 'quote', status: 'new' } } ])
  await store.unreadCount(); assert.deepEqual(queries[2], { where: { read_at: null } })
  await store.markRead(saved.id, 4n)
  assert.deepEqual(updates[0].where, { id: saved.id, read_at: null }); assert.equal(updates[0].data.read_by, 4n)
  assert.ok(updates[0].data.read_at instanceof Date)
  await store.setStatus(saved.id, 'closed', 5n)
  assert.deepEqual(updates[1].where, { id: saved.id }); assert.equal(updates[1].data.updated_by, 5n); assert.equal(updates[1].data.status, 'closed')
  assert.equal(updates[1].data.read_at, undefined)
})

type Query = Record<string, unknown>
const scalar = (value: unknown): unknown => value instanceof Date ? value.getTime() : value
const matches = (record: WebsiteEnquiries, where: Query): boolean => Object.entries(where).every(([key, expected]) => {
  if (key === 'OR') return (expected as Query[]).some(branch => matches(record, branch))
  const actual = (record as unknown as Query)[key]
  if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
    const condition = expected as Query
    if ('in' in condition) return (condition.in as unknown[]).includes(actual)
    if (actual === null) return false
    if ('lt' in condition) return Number(scalar(actual)) < Number(scalar(condition.lt))
    if ('lte' in condition) return Number(scalar(actual)) <= Number(scalar(condition.lte))
    if ('gte' in condition) return Number(scalar(actual)) >= Number(scalar(condition.gte))
    throw new Error('Unexpected fake query condition')
  }
  return scalar(actual) === scalar(expected)
})

function queueFixture(records: WebsiteEnquiries[]) {
  const updates: Array<{ where: Query; data: Query }> = []
  const store = new PrismaWebsiteEnquiryStore({ websiteEnquiries: {
    async findFirst({ where }: { where: Query }) {
      const found = records.find(value => matches(value, where))
      // Like Prisma, return a snapshot so parallel readers can race the subsequent CAS.
      return found ? { ...found } : null
    },
    async updateMany(args: { where: Query; data: Query }) {
      updates.push(args)
      let count = 0
      for (const record of records) if (matches(record, args.where)) {
        count++
        for (const [key, value] of Object.entries(args.data)) {
          const target = record as unknown as Query
          target[key] = value && typeof value === 'object' && 'increment' in value ? Number(target[key]) + Number(value.increment) : value
        }
      }
      return { count }
    },
  } } as unknown as PrismaClient)
  return { store, updates }
}

test('parallel email workers claim one delivery once and a stale token cannot acknowledge or retry it', async () => {
  const queued = { ...record(input()), email_status: 'pending', email_next_attempt_at: date }
  const { store, updates } = queueFixture([queued]), first = randomUUID(), second = randomUUID()
  const leaseUntil = new Date(date.getTime() + 300_000)
  const claims = await Promise.all([store.claimEmail(date, leaseUntil, first), store.claimEmail(date, leaseUntil, second)])
  assert.equal(claims.filter(Boolean).length, 1)
  const claim = claims.find(value => value !== null)!
  assert.equal(claim.attempt, 1); assert.equal(queued.email_attempts, 1)
  assert.equal(queued.email_status, 'processing'); assert.equal(queued.email_lease_token, claim.token)
  assert.equal('email_status' in claim.enquiry, false); assert.equal('email_attempts' in claim.enquiry, false)
  const loser = claim.token === first ? second : first
  assert.equal(await store.markEmailSent(queued.id, loser, date), false)
  assert.equal(await store.retryEmail(queued.id, loser, 'smtp_delivery_failed', date), false)
  assert.equal(queued.email_status, 'processing')
  assert.equal(await store.markEmailSent(queued.id, claim.token, date), true)
  assert.equal(queued.email_status, 'sent'); assert.equal(queued.email_sent_at, date)
  assert.equal(queued.email_lease_token, null); assert.equal(queued.email_lease_expires_at, null)
  assert.equal(await store.retryEmail(queued.id, claim.token, 'smtp_delivery_failed', date), false)
  assert.ok(updates.every(update => !('updated_at' in update.data)))
})

test('email retries wait until due, reclaim expired leases, and fail exhausted crashed attempts', async () => {
  const historical = { ...record(input()), id: 1n }
  const exhausted = { ...record(input()), id: 2n, email_status: 'processing', email_attempts: 5, email_lease_token: randomUUID(), email_lease_expires_at: date }
  const future = { ...record(input()), id: 3n, email_status: 'retry', email_attempts: 2, email_next_attempt_at: new Date(date.getTime() + 600_000) }
  const oldToken = randomUUID()
  const expired = { ...record(input()), id: 4n, email_status: 'processing', email_attempts: 3, email_lease_token: oldToken, email_lease_expires_at: date }
  const { store, updates } = queueFixture([historical, exhausted, future, expired])
  const token = randomUUID(), leaseUntil = new Date(date.getTime() + 300_000)
  const claim = await store.claimEmail(date, leaseUntil, token)
  assert.equal(claim?.enquiry.id, expired.id); assert.equal(claim?.attempt, 4)
  assert.equal(historical.email_status, 'not_requested'); assert.equal(historical.email_attempts, 0)
  assert.equal(future.email_attempts, 2)
  assert.equal(exhausted.email_status, 'failed'); assert.equal(exhausted.email_lease_token, null)
  assert.equal(exhausted.email_last_error, 'delivery_attempts_exhausted')
  assert.equal(await store.markEmailSent(expired.id, oldToken, date), false)
  const retryAt = new Date(date.getTime() + 60_000)
  assert.equal(await store.retryEmail(expired.id, token, 'smtp_delivery_failed', retryAt), true)
  assert.equal(expired.email_status, 'retry'); assert.equal(expired.email_next_attempt_at, retryAt)
  assert.equal(expired.email_lease_token, null)
  assert.equal(await store.claimEmail(date, leaseUntil, randomUUID()), null)
  const lastToken = randomUUID()
  assert.equal((await store.claimEmail(retryAt, new Date(retryAt.getTime() + 300_000), lastToken))?.attempt, 5)
  assert.equal(await store.retryEmail(expired.id, lastToken, 'smtp_delivery_failed', null), true)
  assert.equal(expired.email_status, 'failed'); assert.equal(expired.email_next_attempt_at, null)
  assert.ok(updates.every(update => !('updated_at' in update.data)))
})
