import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { Account } from '../../models/auth/contracts.ts'
import type { SupportEmailDelivery, SupportIncident, SupportIncidentStore, SupportPriority, SupportStatus } from '../../models/support/contracts.ts'
import { logger } from '../../models/system/logger.ts'
import { ApiError } from '../auth/service.ts'

const customerSchema = z.object({
  priority: z.enum(['P1', 'P2', 'P3']).default('P3'), category: z.enum(['database', 'api', 'payment', 'ui', 'other']).default('other'),
  title: z.string().trim().min(3).max(200), description: z.string().trim().min(5).max(5000), contactNumber: z.string().trim().max(20).optional(),
})
const updateSchema = z.object({ status: z.enum(['open', 'in_progress', 'resolved']), resolutionSteps: z.string().trim().max(5000).nullable().optional() })
const recommended = (priority: SupportPriority, category: string) => {
  if (category === 'database') return 'Check database availability and credentials, then apply pending migrations and retry the failed request.'
  if (category === 'payment') return 'Open Settings > Integrations, verify the tenant gateway is active, and configure the required credentials and callback URL.'
  if (category === 'ui') return 'Capture the affected screen and steps, reproduce on the supported app version, then verify the related API response.'
  return priority === 'P1' ? 'Use the request ID to inspect server logs, reproduce the endpoint, verify dependencies, and assign an immediate fix.' : 'Review the request payload, tenant permissions, configuration, and API contract before retrying.'
}

export type HttpFailure = { clientId?: bigint | null; userId?: bigint | null; requestId?: string; method: string; path: string; statusCode: number; errorMessage?: string }

export class SupportService {
  private readonly store: SupportIncidentStore
  private readonly email: SupportEmailDelivery
  private readonly now: () => Date
  constructor(store: SupportIncidentStore, email: SupportEmailDelivery, now = () => new Date()) { this.store = store; this.email = email; this.now = now }
  async customerCreate(account: Account, body: unknown) {
    const parsed = customerSchema.safeParse(body)
    if (!parsed.success) throw new ApiError(422, 'Enter a title, description, category, and valid priority for the support request.')
    const description = `${parsed.data.description}${parsed.data.contactNumber ? `\nContact: ${parsed.data.contactNumber}` : ''}`
    const incident = await this.store.create({ clientId: account.client.id, userId: account.user.id, source: 'customer', priority: parsed.data.priority, category: parsed.data.category, title: parsed.data.title, description, resolutionSteps: recommended(parsed.data.priority, parsed.data.category), requestId: null, method: null, path: null, statusCode: null, signature: null }, this.now())
    await this.notifyIfP1(incident)
    return incident
  }
  async reportHttpFailure(failure: HttpFailure) {
    const priority: SupportPriority = failure.statusCode >= 500 ? 'P1' : 'P2'
    const database = /database|schema|prisma|sql|credential/i.test(failure.errorMessage ?? '')
    const category = database ? 'database' : 'api'
    const message = failure.errorMessage?.trim() || `HTTP ${failure.statusCode} returned by ${failure.method} ${failure.path}`
    const signature = createHash('sha256').update([priority, category, failure.method, failure.path, failure.statusCode, message].join('|')).digest('hex')
    const now = this.now(), input = { clientId: failure.clientId ?? null, userId: failure.userId ?? null, source: 'system' as const, priority, category, title: `${failure.method} ${failure.path} failed`, description: message, resolutionSteps: recommended(priority, category), requestId: failure.requestId ?? null, method: failure.method, path: failure.path, statusCode: failure.statusCode, signature }
    try {
      const result = await this.store.createOrIncrement(input, new Date(now.getTime() - 15 * 60_000), now)
      if (result.created) await this.notifyIfP1(result.incident)
    } catch (error) {
      logger.error({ event: 'support_incident_persistence_failed', requestId: failure.requestId, errorType: error instanceof Error ? error.name : typeof error }, 'support incident persistence failed')
      // A database outage can prevent persistence. P1 email still goes out with a
      // temporary incident number so the outage does not suppress its own alert.
      if (priority === 'P1') await this.notifyIfP1({ ...input, id: 0n, status: 'open', occurrenceCount: 1, firstSeenAt: now, lastSeenAt: now, createdAt: now, updatedAt: now })
    }
  }
  list(priority?: string, status?: string) {
    if (priority && !['P1', 'P2', 'P3'].includes(priority)) throw new ApiError(422, 'Invalid support priority.')
    if (status && !['open', 'in_progress', 'resolved'].includes(status)) throw new ApiError(422, 'Invalid support status.')
    return this.store.list({ priority: priority as SupportPriority | undefined, status: status as SupportStatus | undefined })
  }
  async update(id: bigint, body: unknown) {
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) throw new ApiError(422, 'Invalid support incident update.')
    if (!await this.store.update(id, parsed.data.status, parsed.data.resolutionSteps ?? null, this.now())) throw new ApiError(404, 'Support incident not found.')
  }
  private async notifyIfP1(incident: SupportIncident) {
    if (incident.priority !== 'P1') return
    if (!this.email.configured) { logger.warn({ event: 'support_email_skipped', incidentId: incident.id.toString() }, 'support email is not configured'); return }
    try { await this.email.send(incident) } catch (error) { logger.error({ event: 'support_email_failed', incidentId: incident.id.toString(), errorType: error instanceof Error ? error.name : typeof error }, 'support email delivery failed') }
  }
}
