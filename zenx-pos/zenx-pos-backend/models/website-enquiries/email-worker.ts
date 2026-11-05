import { randomUUID } from 'node:crypto'
import { logger } from '../system/logger.ts'
import type { WebsiteEnquiryEmailDelivery, WebsiteEnquiryEmailStore } from './contracts.ts'

const retryDelays = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000]
const leaseMs = 5 * 60_000
type Report = (event: string, enquiryId?: string, attempt?: number) => void
const report: Report = (event, enquiryId, attempt) => {
  // SMTP error messages can contain addresses, credentials or message contents.
  // Only fixed event codes and internal IDs are logged.
  logger.warn({ event, enquiryId, attempt }, 'website enquiry email delivery')
}

/** The enquiry row is also the outbox: saving a request never depends on SMTP. */
export class WebsiteEnquiryEmailWorker {
  private readonly store: WebsiteEnquiryEmailStore
  private readonly email: WebsiteEnquiryEmailDelivery
  private readonly now: () => Date
  private readonly report: Report
  private readonly pollMs: number
  private timer?: ReturnType<typeof setInterval>
  private running: Promise<void> | null = null
  private stopping = false

  constructor(store: WebsiteEnquiryEmailStore, email: WebsiteEnquiryEmailDelivery, options: { now?: () => Date; report?: Report; pollMs?: number } = {}) {
    this.store = store
    this.email = email
    this.now = options.now ?? (() => new Date())
    this.report = options.report ?? report
    this.pollMs = options.pollMs ?? 15_000
  }

  start() {
    if (this.timer || this.stopping) return
    if (!this.email.configured) {
      this.report('website_enquiry_email_not_configured')
      return
    }
    this.timer = setInterval(() => { void this.run() }, this.pollMs).unref()
    void this.run()
  }

  /** Concurrent ticks share the same batch; database leases also protect multiple processes. */
  run(): Promise<void> {
    if (this.stopping || !this.email.configured) return Promise.resolve()
    if (this.running) return this.running
    this.running = this.processBatch().finally(() => { this.running = null })
    return this.running
  }

  async stop() {
    this.stopping = true
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
    await this.running
  }

  private async processBatch() {
    // Bound each sweep so a queue backlog cannot keep shutdown waiting indefinitely.
    for (let index = 0; index < 10 && !this.stopping; index++) {
      const now = this.now()
      let claim
      try { claim = await this.store.claimEmail(now, new Date(now.getTime() + leaseMs), randomUUID()) }
      catch { this.report('website_enquiry_email_queue_unavailable'); return }
      if (!claim) return
      const id = claim.enquiry.id.toString()
      try {
        await this.email.send(claim.enquiry)
      } catch {
        const delay = retryDelays[claim.attempt - 1]
        const retryAt = delay === undefined ? null : new Date(this.now().getTime() + delay)
        try {
          const updated = await this.store.retryEmail(claim.enquiry.id, claim.token, 'smtp_delivery_failed', retryAt)
          this.report(updated ? retryAt ? 'website_enquiry_email_retry_scheduled' : 'website_enquiry_email_attempts_exhausted' : 'website_enquiry_email_lease_lost', id, claim.attempt)
        } catch { this.report('website_enquiry_email_retry_save_failed', id, claim.attempt); return }
        continue
      }
      // Keep acknowledgement failures separate from SMTP failures. An expired lease
      // recovers an interrupted delivery; SMTP cannot guarantee exactly-once receipt.
      try {
        const updated = await this.store.markEmailSent(claim.enquiry.id, claim.token, this.now())
        if (!updated) this.report('website_enquiry_email_lease_lost', id, claim.attempt)
      } catch { this.report('website_enquiry_email_acknowledgement_failed', id, claim.attempt); return }
    }
  }
}
