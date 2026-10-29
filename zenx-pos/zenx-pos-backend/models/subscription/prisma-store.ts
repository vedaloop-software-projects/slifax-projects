import type { PrismaClient } from '@prisma/client'
import type { SubscriptionStore } from './contracts.ts'

export class PrismaSubscriptionStore implements SubscriptionStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }
  async client(clientId: bigint) {
    const row = await this.prisma.users.findFirst({ where: { id: clientId, trash: 0 } })
    if (!row) return null
    return { businessName: row.business_name, contactPerson: row.contact_person, email: row.email, mobile: row.mobile, address: row.address, city: row.city, pincode: row.pincode || null, gstNumber: row.gst_number,
      duration: row.subscription_duration, subscriptionFinalAmount: Number(row.subscription_final_amount), subscriptionGst: Number(row.subscription_gst), installationFinalAmount: Number(row.final_amount), installationGst: Number(row.gst) }
  }
  async payments(clientId: bigint) {
    const rows = await this.prisma.clientPayments.findMany({ where: { client_id: clientId, paid_amount: { gt: 0 } }, orderBy: [{ payment_date: 'desc' }, { id: 'desc' }] })
    return rows.map(row => ({ id: row.id, type: row.payment_type, amount: Number(row.paid_amount), mode: row.payment_mode, reference: row.reference_number, paidOn: row.payment_date, duration: row.subscription_duration }))
  }
}
