import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { WebsiteEnquiryInput, WebsiteEnquiryStore } from '../../models/website-enquiries/contracts.ts'
import { ApiError } from '../auth/service.ts'

const mobile = z.string().trim().max(30).regex(/^[+\d\s()-]+$/, 'Enter a valid Indian mobile number.').transform(value => {
  const digits = value.replace(/\D/g, '')
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits
}).pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.'))

const inputSchema = z.object({
  submissionId: z.string().uuid().transform(value => value.toLowerCase()),
  type: z.enum(['quote', 'contact']),
  selectedPlan: z.enum(['Standard', 'Premium', 'Help me choose']).nullable(),
  businessName: z.string().trim().min(2).max(255),
  contactPersonName: z.string().trim().min(2).max(255),
  mobile,
  email: z.string().trim().toLowerCase().email().max(255),
  businessTypeId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).nullable().default(null),
  city: z.string().trim().max(100).nullable().default(null).transform(value => value || null),
  subject: z.string().trim().min(3).max(100),
  message: z.string().trim().min(10).max(1000),
}).superRefine((value, context) => {
  if (value.type === 'contact' && value.selectedPlan !== null) context.addIssue({ code: 'custom', path: ['selectedPlan'], message: 'A contact message cannot select a pricing plan.' })
})

const fingerprint = (input: WebsiteEnquiryInput) => createHash('sha256').update(JSON.stringify(input, (_key, value: unknown) => typeof value === 'bigint' ? value.toString() : value)).digest('hex')

export class WebsiteEnquiryService {
  readonly store: WebsiteEnquiryStore
  constructor(store: WebsiteEnquiryStore) { this.store = store }

  async submit(body: unknown, requesterIp: string | null) {
    const parsed = inputSchema.safeParse(body)
    if (!parsed.success) throw new ApiError(422, parsed.error.issues[0]?.message ?? 'Enter valid enquiry details.')
    const input: WebsiteEnquiryInput = { ...parsed.data, businessTypeId: parsed.data.businessTypeId === null ? null : BigInt(parsed.data.businessTypeId) }
    const hash = fingerprint(input)
    const existing = await this.store.findSubmission(input.submissionId)
    if (existing) {
      if (existing.fingerprint !== hash) throw new ApiError(409, 'This submission ID has already been used for different details. Please start a new enquiry.')
      return { created: false }
    }
    const businessTypeName = input.businessTypeId === null ? null : await this.store.activeBusinessTypeName(input.businessTypeId)
    if (input.businessTypeId !== null && businessTypeName === null) throw new ApiError(422, 'Choose an available business type, or leave it blank.')
    const result = await this.store.create(input, businessTypeName, hash, requesterIp)
    if (result.fingerprint !== hash) throw new ApiError(409, 'This submission ID has already been used for different details. Please start a new enquiry.')
    return { created: result.created }
  }
}
