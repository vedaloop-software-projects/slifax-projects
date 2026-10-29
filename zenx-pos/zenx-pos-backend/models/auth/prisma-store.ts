import type { ClientUsers, Prisma, PrismaClient } from '@prisma/client'
import type { Account, AuthStore, PermissionRow, Profile } from './contracts.ts'
import type { JsonCache } from '../cache/cache-aside.ts'
import { profileCacheKey } from '../cache/cache-aside.ts'

type Client = PrismaClient | Prisma.TransactionClient

function logoUrl(path: string | null, baseUrl: string) {
  if (!path) return null
  if (/^https?:\/\//i.test(path) || !baseUrl) return path
  return `${baseUrl}/${path.replace(/^\//, '')}`
}

function dateDisplay(value: Date | null) {
  if (!value) return null
  const [year, month, day] = value.toISOString().slice(0, 10).split('-')
  return `${day}-${month}-${year}`
}

export class PrismaAuthStore implements AuthStore {
  private readonly prisma: PrismaClient
  private readonly publicBaseUrl: string
  private readonly cache?: JsonCache
  private readonly profileTtlSeconds: number

  constructor(prisma: PrismaClient, publicBaseUrl = '', cache?: JsonCache, profileTtlSeconds = 300) {
    this.prisma = prisma
    this.publicBaseUrl = publicBaseUrl
    this.cache = cache
    this.profileTtlSeconds = profileTtlSeconds
  }

  private async assemble(database: Client, user: ClientUsers | null): Promise<Account | null> {
    if (!user) return null
    const [client, role] = await Promise.all([
      database.users.findFirst({ where: { id: user.client_id, status: 1, trash: 0 } }),
      database.clientRoles.findFirst({ where: { id: BigInt(user.role_id), client_id: user.client_id, status: 1, trash: 0 } }),
    ])
    if (!client || !role) return null
    const businessType = await database.businessTypes.findFirst({
      where: { id: BigInt(client.business_type_id), status: 1, trash: 0 },
    })
    return {
      user: {
        id: user.id, clientId: user.client_id, name: user.name, mobile: user.mobile, email: user.email,
        passwordHash: user.password, roleId: user.role_id, isAdmin: user.is_admin, updatedAt: user.updated_at,
      },
      client: {
        id: client.id, businessTypeId: client.business_type_id, businessName: client.business_name,
        logo: logoUrl(client.logo, this.publicBaseUrl), address: client.address, city: client.city,
        startDate: client.start_date, endDate: client.end_date, timeZone: client.time_zone,
      },
      businessType: businessType?.business_type ?? null,
      roleTitle: role.role_title,
    }
  }

  async findAccountByLogin(login: string) {
    const user = await this.prisma.clientUsers.findFirst({
      where: { OR: [{ email: login }, { mobile: login }], status: 1, trash: 0 },
    })
    return this.assemble(this.prisma, user)
  }

  async findAccountByIdentity(userId: bigint, clientId: bigint) {
    const user = await this.prisma.clientUsers.findFirst({
      where: { id: userId, client_id: clientId, status: 1, trash: 0 },
    })
    return this.assemble(this.prisma, user)
  }

  async listPermissions(clientId: bigint, roleId: number): Promise<PermissionRow[]> {
    const [rawGrants, enabled] = await Promise.all([
      this.prisma.clientRoleFeatures.findMany({ where: { client_id: clientId, role_id: BigInt(roleId), status: 1, trash: 0 } }),
      this.prisma.clientFeatures.findMany({ where: { client_id: clientId, status: 1 } }),
    ])
    const grants = rawGrants.filter((grant) => enabled.some((item) => item.feature_id === grant.feature_id && (item.sub_feature_id === 0n || item.sub_feature_id === grant.sub_feature_id)))
    const featureIds = [...new Set(grants.map((item) => item.feature_id))]
    const subFeatureIds = [...new Set(grants.filter((item) => item.sub_feature_id !== 0n).map((item) => item.sub_feature_id))]
    const [features, subFeatures] = await Promise.all([
      this.prisma.features.findMany({ where: { id: { in: featureIds }, status: 1, trash: 0 } }),
      this.prisma.subFeatures.findMany({ where: { id: { in: subFeatureIds }, status: 1, trash: 0 } }),
    ])
    const featureMap = new Map(features.map((item) => [item.id, item]))
    const subFeatureMap = new Map(subFeatures.map((item) => [item.id, item]))
    return grants.flatMap((grant): PermissionRow[] => {
      const feature = featureMap.get(grant.feature_id)
      if (!feature) return []
      const subFeature = subFeatureMap.get(grant.sub_feature_id)
      return [{
        featureId: feature.id, feature: feature.feature, featurePriority: feature.priority,
        subFeatureId: subFeature?.id ?? null, subFeature: subFeature?.sub_feature ?? null,
        subFeaturePriority: subFeature?.priority ?? null,
        view: grant.is_view, add: grant.is_add, edit: grant.is_edit,
      }]
    }).sort((a, b) => a.featurePriority - b.featurePriority || (a.subFeaturePriority ?? 0) - (b.subFeaturePriority ?? 0))
  }

  async getProfile(clientId: bigint): Promise<Profile | null> {
    const key = profileCacheKey(clientId)
    const cached = await this.cache?.get<Profile>(key)
    if (cached) return cached
    const user = await this.prisma.users.findFirst({ where: { id: clientId, trash: 0 } })
    if (!user) return null
    const [state, businessType] = await Promise.all([
      this.prisma.states.findFirst({ where: { id: BigInt(user.state_id) } }),
      this.prisma.businessTypes.findFirst({ where: { id: BigInt(user.business_type_id) } }),
    ])
    const profile = {
      id: Number(user.id), name: user.name, mobile: user.mobile, email: user.email,
      businessName: user.business_name, businessTypeId: user.business_type_id,
      businessTypeTitle: businessType?.business_type ?? null, contactPerson: user.contact_person,
      alternateMobile: user.alternate_mobile, stateId: user.state_id, stateName: state?.state_name ?? null,
      city: user.city, pincode: user.pincode, websiteUrl: user.website_url, address: user.address,
      gstNumber: user.gst_number, gstCode: user.gst_code, panNumber: user.pan_number,
      fssaiNumber: user.fssai_number, upiId: user.upi_id, tradeLicenseNumber: user.trade_license_number,
      logo: logoUrl(user.logo, this.publicBaseUrl) ?? '', amount: user.amount,
      discountType: user.discount_type, discountValue: user.discount_value, gst: user.gst,
      gstValue: user.gst_value, finalAmount: user.final_amount, subscriptionDuration: user.subscription_duration,
      subscriptionAmount: user.subscription_amount, subscriptionDiscountType: user.subscription_discount_type,
      subscriptionDiscountValue: user.subscription_discount_value, subscriptionGst: user.subscription_gst,
      subscriptionGstValue: user.subscription_gst_value, subscriptionFinalAmount: user.subscription_final_amount,
      paidAmount: user.paid_amount, startDate: dateDisplay(user.start_date), endDate: dateDisplay(user.end_date), status: user.status,
    }
    await this.cache?.set(key, profile, this.profileTtlSeconds)
    return profile
  }

  async recordAudit(account: Account, type: string, description: string) {
    const now = new Date()
    await this.prisma.audits.create({ data: {
      client_id: account.user.clientId, user_id: account.user.id, type, description, created_at: now, updated_at: now,
    } })
  }

  async setTimeZone(clientId: bigint, timeZone: string) {
    await this.prisma.users.updateMany({ where: { id: clientId }, data: { time_zone: timeZone } })
  }

  async changePassword(account: Account, expectedHash: string, passwordHash: string) {
    const changedAt = new Date()
    await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.clientUsers.updateMany({
        where: { id: account.user.id, client_id: account.user.clientId, password: expectedHash, status: 1, trash: 0 },
        data: { password: passwordHash, updated_at: changedAt, updated_by: Number(account.user.id) },
      })
      if (result.count !== 1) throw new Error('PASSWORD_UPDATE_CONFLICT')
      await transaction.audits.create({ data: {
        client_id: account.user.clientId, user_id: account.user.id, type: 'password_change',
        description: `${account.user.name ?? 'User'} changed password`, created_at: changedAt, updated_at: changedAt,
      } })
    })
    return changedAt
  }
}
