export type EnquiryType = 'quote' | 'contact'
export type EnquiryPlan = 'Standard' | 'Premium' | 'Help me choose'
export type EnquiryStatus = 'new' | 'in_progress' | 'closed'

export type WebsiteEnquiryInput = {
  submissionId: string
  type: EnquiryType
  selectedPlan: EnquiryPlan | null
  businessName: string
  contactPersonName: string
  mobile: string
  email: string
  businessTypeId: bigint | null
  city: string | null
  subject: string
  message: string
}

export type WebsiteEnquiry = WebsiteEnquiryInput & {
  id: bigint
  businessTypeName: string | null
  status: EnquiryStatus
  readAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type EnquirySubmission = { row: WebsiteEnquiry; fingerprint: string }
export type EnquiryFilters = { status?: EnquiryStatus; type?: EnquiryType }

export interface WebsiteEnquiryStore {
  findSubmission(submissionId: string): Promise<EnquirySubmission | null>
  activeBusinessTypeName(id: bigint): Promise<string | null>
  create(input: WebsiteEnquiryInput, businessTypeName: string | null, fingerprint: string, requesterIp: string | null): Promise<EnquirySubmission & { created: boolean }>
  list(filters: EnquiryFilters, page: number, pageSize: number): Promise<{ rows: WebsiteEnquiry[]; total: number }>
  unreadCount(): Promise<number>
  markRead(id: bigint, adminId: bigint): Promise<WebsiteEnquiry | null>
  setStatus(id: bigint, status: EnquiryStatus, adminId: bigint): Promise<WebsiteEnquiry | null>
}

export interface WebsiteEnquiryEmailDelivery {
  readonly configured: boolean
  send(enquiry: WebsiteEnquiry): Promise<void>
}

export type WebsiteEnquiryEmailClaim = { enquiry: WebsiteEnquiry; attempt: number; token: string }

/** Durable delivery state stays private to the worker, separate from the admin inbox DTO. */
export interface WebsiteEnquiryEmailStore {
  claimEmail(now: Date, leaseUntil: Date, token: string): Promise<WebsiteEnquiryEmailClaim | null>
  markEmailSent(id: bigint, token: string, now: Date): Promise<boolean>
  retryEmail(id: bigint, token: string, errorCode: string, nextAttemptAt: Date | null): Promise<boolean>
}
