import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Account } from '../../../models/auth/contracts.ts'
import type { SupportEmailDelivery, SupportIncident, SupportIncidentInput, SupportIncidentStore, SupportPriority, SupportStatus } from '../../../models/support/contracts.ts'
import { SupportService } from '../service.ts'

const account: Account = { user: { id: 12n, clientId: 7n, name: 'Jaya', mobile: '9999999999', email: null, passwordHash: null, roleId: 1, updatedAt: null }, client: { id: 7n, businessTypeId: 1, businessName: 'Shop', logo: null, address: '', city: '', startDate: null, endDate: null }, businessType: null, roleTitle: null }
class Store implements SupportIncidentStore {
  rows: SupportIncident[] = []
  async create(input: SupportIncidentInput, now: Date) { const row: SupportIncident = { ...input, id: BigInt(this.rows.length + 1), status: 'open', occurrenceCount: 1, firstSeenAt: now, lastSeenAt: now, createdAt: now, updatedAt: now }; this.rows.push(row); return row }
  async createOrIncrement(input: SupportIncidentInput, _since: Date, now: Date) { return { incident: await this.create(input, now), created: true } }
  async list(filters: { priority?: SupportPriority; status?: SupportStatus }) { return this.rows.filter(row => (!filters.priority || row.priority === filters.priority) && (!filters.status || row.status === filters.status)) }
  async update(id: bigint, status: SupportStatus, resolutionSteps: string | null, now: Date) { const row = this.rows.find(item => item.id === id); if (!row) return false; row.status = status; row.resolutionSteps = resolutionSteps; row.updatedAt = now; return true }
}
class Email implements SupportEmailDelivery { configured = true; sent: SupportIncident[] = []; async send(incident: SupportIncident) { this.sent.push(incident) } }

test('customer priority is retained and only P1 sends email', async () => {
  const store = new Store(), email = new Email(), service = new SupportService(store, email, () => new Date('2026-10-22T10:00:00Z'))
  await service.customerCreate(account, { priority: 'P3', category: 'ui', title: 'Button issue', description: 'The save button overlaps the form.' })
  await service.customerCreate(account, { priority: 'P1', category: 'payment', title: 'Payments unavailable', description: 'All gateway payments are blocked.' })
  assert.deepEqual(store.rows.map(row => row.priority), ['P3', 'P1'])
  assert.equal(email.sent.length, 1)
  assert.match(email.sent[0]!.resolutionSteps!, /Integrations/)
})

test('HTTP failures route 5xx to P1 and 4xx to P2', async () => {
  const store = new Store(), email = new Email(), service = new SupportService(store, email)
  await service.reportHttpFailure({ method: 'POST', path: '/api/saveBill', statusCode: 503, errorMessage: 'Database is unavailable.', requestId: 'r1' })
  await service.reportHttpFailure({ method: 'POST', path: '/api/addProduct', statusCode: 422, errorMessage: 'Invalid product details.', requestId: 'r2' })
  assert.equal(store.rows[0]!.priority, 'P1'); assert.equal(store.rows[0]!.category, 'database')
  assert.equal(store.rows[1]!.priority, 'P2'); assert.equal(email.sent.length, 1)
})
