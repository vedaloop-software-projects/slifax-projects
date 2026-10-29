import { z } from 'zod'
import type { Account } from '../../models/auth/contracts.ts'
import type { AccountStore, LogoFile, LogoStorage } from '../../models/account/contracts.ts'
import { ApiError } from '../auth/service.ts'
import { businessZone, zonedTime } from '../../models/system/business-time.ts'

const date = /^\d{4}-\d{2}-\d{2}$/
const time = /^(0[1-9]|1[0-2]):[0-5]\d (AM|PM)$/
const auditDate = z.string().transform(value => /^\d{2}-\d{2}-\d{4}$/.test(value) ? value.split('-').reverse().join('-') : value).pipe(z.string().regex(date))
const auditSchema = z.object({
  page: z.number().int().positive().nullable().optional(),
  userId: z.number().int().positive().nullable().optional(),
  fromDate: auditDate.nullable().optional(), toDate: auditDate.nullable().optional(),
  fromTime: z.string().regex(time).nullable().optional(), toTime: z.string().regex(time).nullable().optional(),
}).strict()
const billFormatSchema = z.object({ id: z.number().int().positive() }).strict()
const optionalText = (schema: z.ZodType<string>) => z.union([schema, z.literal(''), z.null()]).optional().transform((value) => value || null)
const profileSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/), email: z.email().max(255),
  businessName: z.string().trim().min(1).max(255), businessTypeId: z.number().int().positive(),
  contactPerson: z.string().trim().min(1).max(255), alternateMobile: optionalText(z.string().regex(/^[6-9]\d{9}$/)),
  stateId: z.number().int().positive(), city: z.string().trim().min(1).max(255),
  address: z.string().trim().min(1), pincode: z.number().int().min(100000).max(999999),
  websiteUrl: optionalText(z.url().max(255)),
  gstNumber: optionalText(z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/)),
  gstCode: z.union([z.number().int().min(0).max(99), z.string().regex(/^\d{2}$/).transform(Number), z.literal(''), z.null()]).optional().transform((value) => value === '' || value == null ? null : value),
  panNumber: optionalText(z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/)),
  fssaiNumber: optionalText(z.string().regex(/^\d{14}$/)),
  upiId: optionalText(z.string().regex(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/)),
  tradeLicenseNumber: optionalText(z.string().regex(/^[A-Za-z0-9/\-\s]+$/).max(100)),
})

function businessDateTime(value: string, clock: string) {
  const [year, month, day] = value.split('-').map(Number)
  const calendar = new Date(Date.UTC(year, month - 1, day))
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) {
    throw new ApiError(422, 'Invalid date.')
  }
  const result = zonedTime(year, month, day, clock)
  if (Number.isNaN(result.getTime())) throw new ApiError(422, 'Invalid date.')
  return result
}

function clock24(value: string | undefined, end = false) {
  if (!value) return end ? '23:59:59.999' : '00:00:00.000'
  const [, hourText, minute, meridiem] = /^(\d{2}):(\d{2}) (AM|PM)$/.exec(value)!
  let hour = Number(hourText) % 12
  if (meridiem === 'PM') hour += 12
  return `${String(hour).padStart(2, '0')}:${minute}:${end ? '59.999' : '00.000'}`
}

function safeId(value: bigint) {
  const id = Number(value)
  if (!Number.isSafeInteger(id)) throw new Error('Database ID exceeds the legacy JSON number range.')
  return id
}

function displayDate(value: Date | null) {
  if (!value) return null
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: businessZone(), day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  }).formatToParts(value)
  const item = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${item.day}-${item.month}-${item.year} ${item.hour}:${item.minute} ${item.dayPeriod.toUpperCase()}`
}

export class AccountService {
  private readonly store: AccountStore
  private readonly perPage: number
  private readonly logoStorage?: LogoStorage
  constructor(store: AccountStore, perPage = 25, logoStorage?: LogoStorage) {
    if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) throw new Error('AUDIT_PAGE_SIZE must be between 1 and 100.')
    this.store = store
    this.perPage = perPage
    this.logoStorage = logoStorage
  }

  async deleteAccount(account: Account, input: unknown) {
    if (account.user.isAdmin !== 1) throw new ApiError(403, 'Only the primary administrator can delete the business account. Please contact your primary administrator.')
    if (!z.object({ confirm: z.literal(true) }).strict().safeParse(input).success) throw new ApiError(422, 'Confirm account deletion before continuing.')
    if (!await this.store.deleteAccount(account)) throw new ApiError(409, 'Account could not be deleted. Refresh and try again.')
  }

  async audits(account: Account, input: unknown) {
    const parsed = auditSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid audit report filters.')
    const filter = parsed.data
    if ((filter.fromTime || filter.toTime) && (!filter.fromDate || !filter.toDate)) {
      throw new ApiError(422, 'From date and to date are required when time filter is provided.')
    }
    if (filter.fromDate && filter.toDate && filter.fromDate > filter.toDate) throw new ApiError(422, 'From date must not be after to date.')
    const page = filter.page ?? 1
    const result = await this.store.listAudits(account.client.id, {
      page, perPage: this.perPage,
      ...(filter.userId ? { userId: BigInt(filter.userId) } : {}),
      ...(filter.fromDate ? { createdFrom: businessDateTime(filter.fromDate, clock24(filter.fromTime ?? undefined)) } : {}),
      ...(filter.toDate ? { createdTo: businessDateTime(filter.toDate, clock24(filter.toTime ?? undefined, true)) } : {}),
    })
    if (result.total === 0) throw new ApiError(404, 'No audit reports found.')
    return {
      auditReports: result.rows.map((row) => ({
        id: safeId(row.id), type: row.type, description: row.description, userId: safeId(row.userId),
        userName: row.userName, createdAt: displayDate(row.createdAt),
      })),
      pagination: { currentPage: page, lastPage: Math.ceil(result.total / this.perPage), perPage: this.perPage, totalRecords: result.total },
    }
  }

  async updateBillFormat(account: Account, input: unknown) {
    const parsed = billFormatSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid bill format ID.')
    const result = await this.store.updateBillFormat(account, BigInt(parsed.data.id))
    if (result === 'format_invalid') throw new ApiError(404, 'Invalid bill format.')
    if (result === 'settings_missing') throw new ApiError(404, 'Billing settings not found.')
  }

  async billFormat(account: Account) {
    const id = await this.store.getBillFormatId(account.client.id)
    if (!id) throw new ApiError(404, 'Bill format not found.')
    return { billFormatId: id }
  }

  async updateProfile(account: Account, input: unknown, logo?: LogoFile) {
    const parsed = profileSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(422, 'Invalid profile details.')
    if (logo && !this.logoStorage) throw new ApiError(503, 'Logo storage is not configured.')
    let logoPath: string | undefined
    try {
      if (logo) {
        try { logoPath = await this.logoStorage!.save(logo) }
        catch (error) {
          if (error instanceof Error && error.message === 'INVALID_LOGO_CONTENT') throw new ApiError(422, 'Logo content must be JPG, PNG, or WebP.')
          throw error
        }
      }
      const result = await this.store.updateProfile(account, parsed.data, logoPath)
      if (result.status !== 'updated') {
        if (logoPath) await this.logoStorage!.remove(logoPath)
        const errors = {
          profile_missing: 'Profile not found.', business_type_invalid: 'Invalid business type.', state_invalid: 'Invalid state.',
          email_duplicate: 'Email already exists.', mobile_duplicate: 'Mobile number already exists.',
        }
        throw new ApiError(result.status.endsWith('duplicate') ? 400 : 404, errors[result.status])
      }
      if (logoPath && result.oldLogo?.startsWith('uploads/business_logos/')) {
        await this.logoStorage!.remove(result.oldLogo).catch(() => {})
      }
    } catch (error) {
      if (logoPath && !(error instanceof ApiError)) await this.logoStorage!.remove(logoPath).catch(() => {})
      throw error
    }
  }
}
