import type { PrismaClient } from '@prisma/client'
import type { SupportIncident, SupportIncidentInput, SupportIncidentStore, SupportPriority, SupportStatus } from './contracts.ts'

type Row = Awaited<ReturnType<PrismaClient['supportIncidents']['create']>>
const mapped = (row: Row): SupportIncident => ({
  id: row.id, clientId: row.client_id, userId: row.user_id, source: row.source as SupportIncident['source'], priority: row.priority as SupportPriority,
  category: row.category, title: row.title, description: row.description, resolutionSteps: row.resolution_steps, status: row.status as SupportStatus,
  requestId: row.request_id, method: row.method, path: row.path, statusCode: row.status_code, signature: row.signature,
  occurrenceCount: row.occurrence_count, firstSeenAt: row.first_seen_at, lastSeenAt: row.last_seen_at,
  createdAt: row.created_at ?? row.first_seen_at, updatedAt: row.updated_at ?? row.last_seen_at,
})

const data = (input: SupportIncidentInput, now: Date) => ({
  client_id: input.clientId, user_id: input.userId, source: input.source, priority: input.priority, category: input.category,
  title: input.title, description: input.description, resolution_steps: input.resolutionSteps, status: 'open', request_id: input.requestId,
  method: input.method, path: input.path, status_code: input.statusCode, signature: input.signature, occurrence_count: 1,
  first_seen_at: now, last_seen_at: now, created_at: now, updated_at: now,
})

export class PrismaSupportIncidentStore implements SupportIncidentStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }
  async create(input: SupportIncidentInput, now: Date) { return mapped(await this.prisma.supportIncidents.create({ data: data(input, now) })) }
  async createOrIncrement(input: SupportIncidentInput, since: Date, now: Date) {
    if (input.signature) {
      const existing = await this.prisma.supportIncidents.findFirst({ where: { signature: input.signature, status: { not: 'resolved' }, last_seen_at: { gte: since } }, orderBy: { last_seen_at: 'desc' } })
      if (existing) return { incident: mapped(await this.prisma.supportIncidents.update({ where: { id: existing.id }, data: { occurrence_count: { increment: 1 }, last_seen_at: now, updated_at: now, description: input.description, request_id: input.requestId } })), created: false }
    }
    return { incident: await this.create(input, now), created: true }
  }
  async list(filters: { priority?: SupportPriority; status?: SupportStatus }) {
    return (await this.prisma.supportIncidents.findMany({ where: { ...(filters.priority ? { priority: filters.priority } : {}), ...(filters.status ? { status: filters.status } : {}) }, orderBy: [{ priority: 'asc' }, { last_seen_at: 'desc' }], take: 500 })).map(mapped)
  }
  async update(id: bigint, status: SupportStatus, resolutionSteps: string | null, now: Date) {
    const result = await this.prisma.supportIncidents.updateMany({ where: { id }, data: { status, resolution_steps: resolutionSteps, updated_at: now } })
    return result.count === 1
  }
}
