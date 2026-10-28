import type { PrismaClient } from '@prisma/client'
import type { RegistrationInput, RegistrationStore } from './contracts.ts'

export class PrismaRegistrationStore implements RegistrationStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  async create(input: RegistrationInput) {
    // One open request per mobile/email, and no request for an existing client login.
    const [pending, existing] = await Promise.all([
      this.prisma.registrationRequests.findFirst({ where: { status: 'pending', OR: [{ mobile: input.mobile }, { email: input.email }] }, select: { id: true } }),
      this.prisma.clientUsers.findFirst({ where: { trash: 0, OR: [{ mobile: input.mobile }, { email: input.email }] }, select: { id: true } }),
    ])
    if (pending || existing) return 'duplicate' as const
    const now = new Date()
    await this.prisma.registrationRequests.create({ data: {
      business_name: input.businessName, contact_person_name: input.contactPersonName, mobile: input.mobile, email: input.email,
      business_type_id: input.businessTypeId, city: input.city, address: input.address, notes: input.notes, requester_ip: input.requesterIp,
      status: 'pending', created_at: now, updated_at: now,
    } })
    return 'saved' as const
  }

  async list(status: string | undefined, page: number, perPage: number) {
    const where = status ? { status } : {}
    const [rows, total] = await Promise.all([
      this.prisma.registrationRequests.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * perPage, take: perPage }),
      this.prisma.registrationRequests.count({ where }),
    ])
    return { total, rows: rows.map(row => ({
      id: row.id, businessName: row.business_name, contactPersonName: row.contact_person_name, mobile: row.mobile, email: row.email,
      businessTypeId: row.business_type_id, city: row.city, address: row.address, notes: row.notes, requesterIp: row.requester_ip,
      status: row.status, clientId: row.client_id, reviewNote: row.review_note, reviewedAt: row.reviewed_at, createdAt: row.created_at,
    })) }
  }

  async review(id: bigint, status: 'approved' | 'rejected', adminId: bigint, note: string | null, clientId: bigint | null) {
    const now = new Date()
    const result = await this.prisma.registrationRequests.updateMany({ where: { id, status: 'pending' }, data: { status, review_note: note, client_id: clientId, reviewed_by: adminId, reviewed_at: now, updated_at: now } })
    return result.count === 1
  }

  async businessTypes() {
    const rows = await this.prisma.businessTypes.findMany({ where: { status: 1, trash: 0 }, select: { id: true, business_type: true }, orderBy: { business_type: 'asc' } })
    return rows.map(row => ({ id: row.id, name: row.business_type }))
  }
}
