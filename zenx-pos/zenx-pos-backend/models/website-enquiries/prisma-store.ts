import type { PrismaClient, WebsiteEnquiries } from '@prisma/client'
import type { EnquiryFilters, EnquiryPlan, EnquiryStatus, EnquiryType, WebsiteEnquiry, WebsiteEnquiryEmailStore, WebsiteEnquiryInput, WebsiteEnquiryStore } from './contracts.ts'

const row = (record: WebsiteEnquiries): WebsiteEnquiry => ({
  id: record.id, submissionId: record.submission_id, type: record.type as EnquiryType,
  selectedPlan: record.selected_plan as EnquiryPlan | null, businessName: record.business_name,
  contactPersonName: record.contact_person_name, mobile: record.mobile, email: record.email,
  businessTypeId: record.business_type_id, businessTypeName: record.business_type_name,
  city: record.city, subject: record.subject, message: record.message,
  status: record.status as EnquiryStatus, readAt: record.read_at, createdAt: record.created_at, updatedAt: record.updated_at,
})

export class PrismaWebsiteEnquiryStore implements WebsiteEnquiryStore, WebsiteEnquiryEmailStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  async findSubmission(submissionId: string) {
    const record = await this.prisma.websiteEnquiries.findUnique({ where: { submission_id: submissionId } })
    return record ? { row: row(record), fingerprint: record.payload_hash } : null
  }

  async activeBusinessTypeName(id: bigint) {
    const record = await this.prisma.businessTypes.findFirst({ where: { id, status: 1, trash: 0 }, select: { business_type: true } })
    return record?.business_type ?? null
  }

  async create(input: WebsiteEnquiryInput, businessTypeName: string | null, fingerprint: string, requesterIp: string | null) {
    try {
      const now = new Date()
      const record = await this.prisma.websiteEnquiries.create({ data: {
        submission_id: input.submissionId, payload_hash: fingerprint, type: input.type, selected_plan: input.selectedPlan,
        business_name: input.businessName, contact_person_name: input.contactPersonName, mobile: input.mobile, email: input.email,
        business_type_id: input.businessTypeId, business_type_name: businessTypeName, city: input.city,
        subject: input.subject, message: input.message, requester_ip: requesterIp,
        status: 'new', created_at: now, updated_at: now,
        // The alert is queued in the same insert as the inbox record, with no SMTP on the request path.
        email_status: 'pending', email_next_attempt_at: now,
      } })
      return { row: row(record), fingerprint: record.payload_hash, created: true }
    } catch (error) {
      // The unique UUID also protects concurrent retries, rather than only checking before insertion.
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        const existing = await this.findSubmission(input.submissionId)
        if (existing) return { ...existing, created: false }
      }
      throw error
    }
  }

  async list(filters: EnquiryFilters, page: number, pageSize: number) {
    const where = { ...filters }
    const [records, total] = await Promise.all([
      this.prisma.websiteEnquiries.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.websiteEnquiries.count({ where }),
    ])
    return { rows: records.map(row), total }
  }

  unreadCount() { return this.prisma.websiteEnquiries.count({ where: { read_at: null } }) }

  async markRead(id: bigint, adminId: bigint) {
    const now = new Date()
    await this.prisma.websiteEnquiries.updateMany({ where: { id, read_at: null }, data: { read_at: now, read_by: adminId, updated_at: now } })
    const record = await this.prisma.websiteEnquiries.findUnique({ where: { id } })
    return record ? row(record) : null
  }

  async setStatus(id: bigint, status: EnquiryStatus, adminId: bigint) {
    const result = await this.prisma.websiteEnquiries.updateMany({ where: { id }, data: { status, updated_by: adminId, updated_at: new Date() } })
    if (!result.count) return null
    const record = await this.prisma.websiteEnquiries.findUnique({ where: { id } })
    return record ? row(record) : null
  }

  async claimEmail(now: Date, leaseUntil: Date, token: string) {
    // A crash on the final attempt must not strand the row in processing forever.
    await this.prisma.websiteEnquiries.updateMany({
      where: { email_status: 'processing', email_attempts: { gte: 5 }, email_lease_expires_at: { lte: now } },
      data: { email_status: 'failed', email_last_error: 'delivery_attempts_exhausted', email_next_attempt_at: null, email_lease_token: null, email_lease_expires_at: null },
    })
    const record = await this.prisma.websiteEnquiries.findFirst({
      where: {
        email_attempts: { lt: 5 },
        OR: [
          { email_status: { in: ['pending', 'retry'] }, email_next_attempt_at: { lte: now } },
          { email_status: 'processing', email_lease_expires_at: { lte: now } },
        ],
      },
      orderBy: { id: 'asc' },
    })
    if (!record) return null
    // Compare the selected queue state so two workers cannot both claim this delivery.
    const claimed = await this.prisma.websiteEnquiries.updateMany({
      where: {
        id: record.id, email_status: record.email_status, email_attempts: record.email_attempts,
        email_lease_token: record.email_lease_token, email_lease_expires_at: record.email_lease_expires_at,
        email_next_attempt_at: record.email_next_attempt_at,
      },
      data: { email_status: 'processing', email_attempts: { increment: 1 }, email_lease_token: token, email_lease_expires_at: leaseUntil, email_next_attempt_at: null },
    })
    return claimed.count === 1 ? { enquiry: row(record), attempt: record.email_attempts + 1, token } : null
  }

  async markEmailSent(id: bigint, token: string, now: Date) {
    const result = await this.prisma.websiteEnquiries.updateMany({
      where: { id, email_status: 'processing', email_lease_token: token },
      data: { email_status: 'sent', email_sent_at: now, email_last_error: null, email_next_attempt_at: null, email_lease_token: null, email_lease_expires_at: null },
    })
    return result.count === 1
  }

  async retryEmail(id: bigint, token: string, errorCode: string, nextAttemptAt: Date | null) {
    const result = await this.prisma.websiteEnquiries.updateMany({
      where: { id, email_status: 'processing', email_lease_token: token },
      data: { email_status: nextAttemptAt ? 'retry' : 'failed', email_last_error: errorCode, email_next_attempt_at: nextAttemptAt, email_lease_token: null, email_lease_expires_at: null },
    })
    return result.count === 1
  }
}
