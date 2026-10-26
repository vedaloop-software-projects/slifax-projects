import type { PrismaClient } from '@prisma/client'
import type { Account } from '../auth/contracts.ts'
import type { AccountStore, AuditFilters, ProfileUpdate } from './contracts.ts'
import type { JsonCache } from '../cache/cache-aside.ts'
import { profileCacheKey } from '../cache/cache-aside.ts'

export class PrismaAccountStore implements AccountStore {
  private readonly prisma: PrismaClient
  private readonly cache?: JsonCache
  constructor(prisma: PrismaClient, cache?: JsonCache) { this.prisma = prisma; this.cache = cache }

  async deleteAccount(account: Account) {
    const deleted = await this.prisma.$transaction(async tx => {
      // Recheck primary ownership inside the write transaction.
      const actor = await tx.clientUsers.findFirst({ where: { id: account.user.id, client_id: account.client.id, is_admin: 1, status: 1, trash: 0 } })
      if (!actor) return false
      const now = new Date()
      const result = await tx.users.updateMany({ where: { id: account.client.id, trash: 0 }, data: { status: 0, trash: 1, updated_by: Number(account.user.id), updated_at: now } })
      if (result.count !== 1) return false
      await tx.clientUsers.updateMany({ where: { client_id: account.client.id }, data: { status: 0, trash: 1, updated_by: Number(account.user.id), updated_at: now } })
      await tx.audits.create({ data: { client_id: account.client.id, user_id: account.user.id, type: 'delete', description: 'Business account deletion requested by primary administrator; access disabled.', created_at: now, updated_at: now } })
      return true
    }, { isolationLevel: 'Serializable' })
    if (deleted) await this.cache?.delete(profileCacheKey(account.client.id))
    return deleted
  }

  async listAudits(clientId: bigint, filters: AuditFilters) {
    const where = {
      client_id: clientId,
      ...(filters.userId === undefined ? {} : { user_id: filters.userId }),
      ...(!filters.createdFrom && !filters.createdTo ? {} : {
        created_at: { ...(filters.createdFrom ? { gte: filters.createdFrom } : {}), ...(filters.createdTo ? { lte: filters.createdTo } : {}) },
      }),
    }
    const [total, audits] = await Promise.all([
      this.prisma.audits.count({ where }),
      this.prisma.audits.findMany({
        where, orderBy: { id: 'desc' }, skip: (filters.page - 1) * filters.perPage, take: filters.perPage,
      }),
    ])
    const userIds = [...new Set(audits.map((audit) => audit.user_id))]
    const users = await this.prisma.clientUsers.findMany({
      where: { client_id: clientId, id: { in: userIds } }, select: { id: true, name: true },
    })
    const names = new Map(users.map((user) => [user.id, user.name]))
    return {
      total,
      rows: audits.map((audit) => ({
        id: audit.id, type: audit.type, description: audit.description, userId: audit.user_id,
        userName: names.get(audit.user_id) ?? null, createdAt: audit.created_at,
      })),
    }
  }

  async getBillFormatId(clientId: bigint) {
    const setting = await this.prisma.billingSettings.findFirst({ where: { client_id: clientId }, select: { bill_format_number: true } })
    return setting?.bill_format_number || null
  }

  async updateBillFormat(account: Account, billFormatId: bigint) {
    return this.prisma.$transaction(async (transaction) => {
      const format = await transaction.billFormats.findFirst({
        where: { id: billFormatId, business_type_id: BigInt(account.client.businessTypeId), status: 1, trash: 0 }, select: { id: true },
      })
      if (!format) return 'format_invalid' as const
      const setting = await transaction.billingSettings.findFirst({ where: { client_id: account.client.id }, select: { id: true } })
      if (!setting) return 'settings_missing' as const
      const now = new Date()
      await transaction.billingSettings.update({
        where: { id: setting.id }, data: { bill_format_number: billFormatId.toString(), updated_by: Number(account.user.id), updated_at: now },
      })
      await transaction.audits.create({ data: {
        client_id: account.client.id, user_id: account.user.id, type: 'update',
        description: `Bill format changed to ${billFormatId}`, created_at: now, updated_at: now,
      } })
      return 'updated' as const
    })
  }

  async updateProfile(account: Account, profile: ProfileUpdate, logoPath?: string) {
    const result = await this.prisma.$transaction(async (transaction) => {
      const current = await transaction.users.findFirst({ where: { id: account.client.id, trash: 0 } })
      if (!current) return { status: 'profile_missing' as const }
      const [businessType, state, emailDuplicate, mobileDuplicate] = await Promise.all([
        transaction.businessTypes.findFirst({ where: { id: BigInt(profile.businessTypeId), status: 1, trash: 0 }, select: { id: true } }),
        transaction.states.findFirst({ where: { id: BigInt(profile.stateId), status: 1, trash: 0 }, select: { id: true } }),
        transaction.users.findFirst({ where: { email: profile.email, id: { not: account.client.id } }, select: { id: true } }),
        transaction.users.findFirst({ where: { mobile: profile.mobile, id: { not: account.client.id } }, select: { id: true } }),
      ])
      if (!businessType) return { status: 'business_type_invalid' as const }
      if (!state) return { status: 'state_invalid' as const }
      if (emailDuplicate) return { status: 'email_duplicate' as const }
      if (mobileDuplicate) return { status: 'mobile_duplicate' as const }
      const now = new Date()
      await transaction.users.update({ where: { id: account.client.id }, data: {
        name: '', mobile: profile.mobile, email: profile.email, business_name: profile.businessName,
        business_type_id: profile.businessTypeId, contact_person: profile.contactPerson,
        alternate_mobile: profile.alternateMobile, state_id: profile.stateId, city: profile.city,
        pincode: profile.pincode, website_url: profile.websiteUrl, address: profile.address,
        gst_number: profile.gstNumber, gst_code: profile.gstCode, pan_number: profile.panNumber,
        fssai_number: profile.fssaiNumber, upi_id: profile.upiId, trade_license_number: profile.tradeLicenseNumber,
        ...(logoPath ? { logo: logoPath } : {}), updated_by: Number(account.user.id), updated_at: now,
      } })
      await transaction.clientUsers.updateMany({ where: { id: account.user.id, client_id: account.client.id }, data: {
        name: profile.contactPerson, email: profile.email, mobile: profile.mobile,
        updated_by: Number(account.user.id), updated_at: now,
      } })
      await transaction.audits.create({ data: {
        client_id: account.client.id, user_id: account.user.id, type: 'update',
        description: `${profile.businessName} profile updated.`, created_at: now, updated_at: now,
      } })
      return { status: 'updated' as const, oldLogo: current.logo }
    })
    if (result.status === 'updated') await this.cache?.delete(profileCacheKey(account.client.id))
    return result
  }
}
