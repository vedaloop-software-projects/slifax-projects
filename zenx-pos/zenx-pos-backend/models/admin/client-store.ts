import { hash } from 'bcryptjs'
import type { Prisma, PrismaClient } from '@prisma/client'
import type { AdminIdentity } from './contracts.ts'
import type { ClientAdminStore, ClientInput, ClientListFilter, PaymentInput } from './client-contracts.ts'

type Db = PrismaClient | Prisma.TransactionClient
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
function totals(input: ClientInput) {
  const discounted = Math.max(0, input.amount - (input.discountType === 1 ? input.discountValue : input.discountType === 2 ? input.amount * input.discountValue / 100 : 0))
  const subscriptionDiscounted = Math.max(0, input.subscriptionAmount - (input.subscriptionDiscountType === 1 ? input.subscriptionDiscountValue : input.subscriptionDiscountType === 2 ? input.subscriptionAmount * input.subscriptionDiscountValue / 100 : 0))
  return { gstValue: money(discounted * input.gst / 100), final: money(discounted * (1 + input.gst / 100)), subscriptionGstValue: money(subscriptionDiscounted * input.subscriptionGst / 100), subscriptionFinal: money(subscriptionDiscounted * (1 + input.subscriptionGst / 100)) }
}
function data(input: ClientInput) {
  const calculated = totals(input)
  return { name: '', business_name: input.businessName, business_type_id: input.businessTypeId, email: input.email, mobile: input.mobile, contact_person: input.contactPerson, alternate_mobile: input.alternateMobile, state_id: input.stateId, city: input.city, pincode: input.pincode, website_url: input.websiteUrl, address: input.address, gst_number: input.gstNumber, gst_code: input.gstCode, pan_number: input.panNumber, fssai_number: input.fssaiNumber, trade_license_number: input.licenseNumber, amount: input.amount, discount_type: input.discountType, discount_value: input.discountValue, gst: input.gst, gst_value: calculated.gstValue, final_amount: calculated.final, start_date: input.startDate, end_date: input.endDate, subscription_duration: input.subscriptionDuration, subscription_amount: input.subscriptionAmount, subscription_discount_type: input.subscriptionDiscountType, subscription_discount_value: input.subscriptionDiscountValue, subscription_gst: input.subscriptionGst, subscription_gst_value: calculated.subscriptionGstValue, subscription_final_amount: calculated.subscriptionFinal, status: input.status, max_users: input.maxUsers }
}

export class PrismaClientAdminStore implements ClientAdminStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }
  async prerequisites() {
    const [businessTypes, states, features, subFeatures] = await Promise.all([
      this.prisma.businessTypes.findMany({ where: { status: 1, trash: 0 }, orderBy: { business_type: 'asc' } }),
      this.prisma.states.findMany({ where: { status: 1, trash: 0 }, orderBy: { state_name: 'asc' } }),
      this.prisma.features.findMany({ where: { status: 1, trash: 0 }, orderBy: { priority: 'asc' } }),
      this.prisma.subFeatures.findMany({ where: { status: 1, trash: 0 }, orderBy: { priority: 'asc' } }),
    ])
    return { businessTypes, states, features: features.map((feature) => ({ ...feature, subFeatures: subFeatures.filter((sub) => sub.feature_id === feature.id) })) }
  }
  async list(filters: ClientListFilter) {
    const where: Prisma.UsersWhereInput = { trash: 0 }
    if (filters.search) where.OR = [{ business_name: { startsWith: filters.search } }, { mobile: { startsWith: filters.search } }, { contact_person: { startsWith: filters.search } }, { email: { startsWith: filters.search } }]
    if (filters.businessTypeId) where.business_type_id = filters.businessTypeId
    if (filters.status !== undefined) where.status = filters.status
    if (filters.subscriptionDuration) where.subscription_duration = filters.subscriptionDuration
    const today = new Date(), inThirtyDays = new Date()
    today.setUTCHours(0, 0, 0, 0)
    inThirtyDays.setUTCDate(today.getUTCDate() + 30)
    inThirtyDays.setUTCHours(23, 59, 59, 999)
    const base = { trash: 0 } as const
    const [rows, total, all, active, expiring, expired] = await Promise.all([
      this.prisma.users.findMany({ where, orderBy: { id: 'desc' }, skip: (filters.page - 1) * filters.take, take: filters.take }),
      this.prisma.users.count({ where }),
      this.prisma.users.count({ where: base }),
      this.prisma.users.count({ where: { ...base, status: 1 } }),
      this.prisma.users.count({ where: { ...base, status: 1, end_date: { gte: today, lte: inThirtyDays } } }),
      this.prisma.users.count({ where: { ...base, end_date: { lt: today } } }),
    ])
    const userCounts = rows.length ? await this.prisma.clientUsers.groupBy({
      by: ['client_id', 'status'], where: { client_id: { in: rows.map((row) => row.id) }, trash: 0 }, _count: { _all: true },
    }) : []
    const counts = new Map<string, number>(), activeCounts = new Map<string, number>()
    for (const item of userCounts) {
      const key = item.client_id.toString()
      counts.set(key, (counts.get(key) ?? 0) + item._count._all)
      if (item.status === 1) activeCounts.set(key, (activeCounts.get(key) ?? 0) + item._count._all)
    }
    return {
      // active_user_count is what max_users limits.
      rows: rows.map((row) => ({ ...row, user_count: counts.get(row.id.toString()) ?? 0, active_user_count: activeCounts.get(row.id.toString()) ?? 0 })),
      total,
      summary: { total: all, active, expiring, expired },
    }
  }
  find(id: bigint) { return this.prisma.users.findFirst({ where: { id, trash: 0 } }) as Promise<Record<string, unknown> | null> }
  async identityAvailable(email: string, mobile: string, excludeId?: bigint) { return !await this.prisma.users.findFirst({ where: { trash: 0, ...(excludeId ? { id: { not: excludeId } } : {}), OR: [{ email }, { mobile }] } }) }
  async validateReferences(input: ClientInput) { const [business, state] = await Promise.all([this.prisma.businessTypes.findFirst({ where: { id: BigInt(input.businessTypeId), status: 1, trash: 0 } }), this.prisma.states.findFirst({ where: { id: BigInt(input.stateId), status: 1, trash: 0 } })]); return Boolean(business && state) }
  async selected(db: Db, featureIds: bigint[], subFeatureIds: bigint[]) {
    const requestedFeatures = [...new Set(featureIds.map(String))].map(BigInt), requestedSubs = [...new Set(subFeatureIds.map(String))].map(BigInt)
    const subs = await db.subFeatures.findMany({ where: { id: { in: requestedSubs }, status: 1, trash: 0 } })
    if (subs.length !== requestedSubs.length) throw new Error('INVALID_FEATURE_SELECTION')
    const allFeatureIds = [...new Set([...requestedFeatures, ...subs.map((sub) => sub.feature_id)].map(String))].map(BigInt)
    const features = await db.features.findMany({ where: { id: { in: allFeatureIds }, status: 1, trash: 0 } })
    if (features.length !== allFeatureIds.length) throw new Error('INVALID_FEATURE_SELECTION')
    return { features, subs }
  }
  private async applyFeatures(db: Db, id: bigint, selected: { features: Array<{ id: bigint }>; subs: Array<{ id: bigint; feature_id: bigint }> }, actor: AdminIdentity) {
    const roles = await db.clientRoles.findMany({ where: { client_id: id, status: 1, trash: 0 } }), now = new Date()
    const entries = selected.features.flatMap((feature) => {
      const subs = selected.subs.filter((item) => item.feature_id === feature.id)
      return subs.length ? subs.map((sub) => ({ featureId: feature.id, subFeatureId: sub.id })) : [{ featureId: feature.id, subFeatureId: 0n }]
    })
    const [existingFeatures, existingGrants] = await Promise.all([
      db.clientFeatures.findMany({ where: { client_id: id } }),
      db.clientRoleFeatures.findMany({ where: { client_id: id } }),
    ])
    await db.clientFeatures.updateMany({ where: { client_id: id }, data: { status: 0, updated_by: Number(actor.id), updated_at: now } })
    await db.clientRoleFeatures.updateMany({ where: { client_id: id }, data: { status: 0, updated_by: Number(actor.id), updated_at: now } })
    const featureKey = (featureId: bigint, subFeatureId: bigint) => `${featureId}:${subFeatureId}`
    const existingFeatureMap = new Map(existingFeatures.map((row) => [featureKey(row.feature_id, row.sub_feature_id), row]))
    const selectedFeatureIds = entries.map((entry) => existingFeatureMap.get(featureKey(entry.featureId, entry.subFeatureId))?.id).filter((value): value is bigint => value !== undefined)
    if (selectedFeatureIds.length) await db.clientFeatures.updateMany({ where: { id: { in: selectedFeatureIds } }, data: { status: 1, updated_by: Number(actor.id), updated_at: now } })
    const newFeatures = entries.filter((entry) => !existingFeatureMap.has(featureKey(entry.featureId, entry.subFeatureId)))
    if (newFeatures.length) await db.clientFeatures.createMany({ data: newFeatures.map((entry) => ({ client_id: id, feature_id: entry.featureId, sub_feature_id: entry.subFeatureId, status: 1, created_by: Number(actor.id), updated_by: Number(actor.id), created_at: now, updated_at: now })) })

    const grantKey = (roleId: bigint, featureId: bigint, subFeatureId: bigint) => `${roleId}:${featureId}:${subFeatureId}`
    const existingGrantMap = new Map(existingGrants.map((row) => [grantKey(row.role_id, row.feature_id, row.sub_feature_id), row]))
    const wantedGrants = roles.flatMap((role) => entries.map((entry) => ({ roleId: role.id, ...entry })))
    const selectedGrantIds = wantedGrants.map((entry) => existingGrantMap.get(grantKey(entry.roleId, entry.featureId, entry.subFeatureId))?.id).filter((value): value is bigint => value !== undefined)
    if (selectedGrantIds.length) await db.clientRoleFeatures.updateMany({ where: { id: { in: selectedGrantIds } }, data: { is_add: 1, is_edit: 1, is_view: 1, status: 1, updated_by: Number(actor.id), updated_at: now } })
    const newGrants = wantedGrants.filter((entry) => !existingGrantMap.has(grantKey(entry.roleId, entry.featureId, entry.subFeatureId)))
    if (newGrants.length) await db.clientRoleFeatures.createMany({ data: newGrants.map((entry) => ({ client_id: id, role_id: entry.roleId, feature_id: entry.featureId, sub_feature_id: entry.subFeatureId, is_add: 1, is_edit: 1, is_view: 1, status: 1, trash: 0, created_by: Number(actor.id), updated_by: Number(actor.id), created_at: now, updated_at: now })) })
  }
  async create(input: ClientInput & { password: string }, actor: AdminIdentity, featureIds: bigint[], subFeatureIds: bigint[], logoPath?: string, initialPayments: Omit<PaymentInput, 'clientId' | 'extendContract'>[] = []) {
    const [selected, password] = await Promise.all([this.selected(this.prisma, featureIds, subFeatureIds), hash(input.password, 12)])
    return this.prisma.$transaction(async (tx) => {
      const now = new Date()
      const subscriptionPaid = money(initialPayments.filter((payment) => payment.type === 2).reduce((sum, payment) => sum + payment.amount, 0))
      const client = await tx.users.create({ data: { ...data(input), paid_amount: subscriptionPaid, ...(logoPath ? { logo: logoPath } : {}), password: null, trash: 0, created_by: Number(actor.id), updated_by: Number(actor.id), created_at: now, updated_at: now } })
      const role = await tx.clientRoles.create({ data: { client_id: client.id, role_title: 'Admin', status: 1, trash: 0, created_by: Number(actor.id), updated_by: Number(actor.id), created_at: now, updated_at: now } })
      const user = await tx.clientUsers.create({ data: { client_id: client.id, name: input.contactPerson, email: input.email, mobile: input.mobile, password, role_id: Number(role.id), is_admin: 1, status: 1, trash: 0, created_by: Number(actor.id), updated_by: Number(actor.id), created_at: now, updated_at: now } })
      const entries = selected.features.flatMap((feature) => { const subs = selected.subs.filter((sub) => sub.feature_id === feature.id); return subs.length ? subs.map((sub) => ({ feature: feature.id, sub: sub.id })) : [{ feature: feature.id, sub: 0n }] })
      if (entries.length) {
        await tx.clientFeatures.createMany({ data: entries.map((item) => ({ client_id: client.id, feature_id: item.feature, sub_feature_id: item.sub, status: 1, created_by: Number(actor.id), updated_by: Number(actor.id), created_at: now, updated_at: now })) })
        await tx.clientRoleFeatures.createMany({ data: entries.map((item) => ({ client_id: client.id, role_id: role.id, feature_id: item.feature, sub_feature_id: item.sub, is_add: 1, is_edit: 1, is_view: 1, status: 1, trash: 0, created_by: Number(user.id), updated_by: Number(user.id), created_at: now, updated_at: now })) })
      }
      if (initialPayments.length) await tx.clientPayments.createMany({ data: initialPayments.map((payment) => ({ client_id: client.id, paid_amount: payment.amount, payment_mode: payment.mode, reference_number: payment.reference, payment_date: payment.date, payment_type: payment.type, subscription_duration: input.subscriptionDuration, created_by: Number(actor.id), updated_by: Number(actor.id), created_at: now, updated_at: now })) })
      await tx.audits.create({ data: { client_id: client.id, user_id: user.id, type: 'add', description: 'Admin role access levels added during secure client provisioning', created_at: now, updated_at: now } })
      return client.id
    })
  }
  async update(id: bigint, input: ClientInput, actor: AdminIdentity, logoPath?: string, featureIds?: bigint[], subFeatureIds: bigint[] = []) {
    const [selected, password] = await Promise.all([
      featureIds === undefined ? Promise.resolve(undefined) : this.selected(this.prisma, featureIds, subFeatureIds),
      input.password ? hash(input.password, 12) : Promise.resolve(undefined),
    ])
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.users.findFirst({ where: { id, trash: 0 }, select: { logo: true } })
      if (!current) return { updated: false, oldLogo: null }
      const result = await tx.users.updateMany({ where: { id, trash: 0 }, data: { ...data(input), ...(logoPath ? { logo: logoPath } : {}), updated_by: Number(actor.id), updated_at: new Date() } })
      if (result.count !== 1) return { updated: false, oldLogo: null }
      await tx.clientUsers.updateMany({ where: { client_id: id, is_admin: 1, trash: 0 }, data: { name: input.contactPerson, email: input.email, mobile: input.mobile, ...(password ? { password } : {}), updated_by: Number(actor.id), updated_at: new Date() } })
      if (selected) await this.applyFeatures(tx, id, selected, actor)
      return { updated: true, oldLogo: current.logo }
    })
  }
  async setStatus(id: bigint, status: number, actor: AdminIdentity) { const result=await this.prisma.users.updateMany({where:{id,trash:0},data:{status,updated_by:Number(actor.id),updated_at:new Date()}});return result.count===1 }
  async softDelete(id: bigint, actor: AdminIdentity) { return this.prisma.$transaction(async (tx) => { const result = await tx.users.updateMany({ where: { id, trash: 0 }, data: { trash: 1, status: 0, updated_by: Number(actor.id), updated_at: new Date() } }); if (result.count !== 1) return false; await tx.clientUsers.updateMany({ where: { client_id: id }, data: { trash: 1, status: 0, updated_by: Number(actor.id), updated_at: new Date() } }); return true }) }
  async features(id: bigint) { const client = await this.prisma.users.findFirst({ where: { id, trash: 0 } }); if (!client) return null; const [catalog, clientFeatures] = await Promise.all([this.prerequisites(), this.prisma.clientFeatures.findMany({ where: { client_id: id } })]); return { client, features: catalog.features, clientFeatures } }
  async updateFeatures(id: bigint, featureIds: bigint[], subFeatureIds: bigint[], actor: AdminIdentity) {
    return this.prisma.$transaction(async (tx) => {
      if (!await tx.users.findFirst({ where: { id, trash: 0 } })) return false
      const selected = await this.selected(tx, featureIds, subFeatureIds)
      await this.applyFeatures(tx, id, selected, actor)
      return true
    })
  }
  async payments(id: bigint) { const client = await this.prisma.users.findFirst({ where: { id, trash: 0 } }); if (!client) return null; const all = await this.prisma.clientPayments.findMany({ where: { client_id: id }, orderBy: { id: 'desc' } }), software = all.filter((x) => x.payment_type === 1), mmc = all.filter((x) => x.payment_type === 2), softwareReceived = money(software.reduce((sum, x) => sum + x.paid_amount, 0)); return { softwarePayments: software, mmcPayments: mmc, softwareTotal: client.final_amount, softwareReceived, softwareBalance: Math.max(0, money(client.final_amount - softwareReceived)), amcTotal: client.subscription_final_amount, amcReceived: client.paid_amount, amcBalance: Math.max(0, money(client.subscription_final_amount - client.paid_amount)) } }
  async storePayment(input: PaymentInput, actor: AdminIdentity) { return this.prisma.$transaction(async (tx) => { const client = await tx.users.findFirst({ where: { id: input.clientId, trash: 0 } }); if (!client) return false; await tx.clientPayments.create({ data: { client_id: input.clientId, paid_amount: input.amount, payment_mode: input.mode, reference_number: input.reference, payment_date: input.date, payment_type: input.type, subscription_duration: client.subscription_duration, created_by: Number(actor.id), updated_by: Number(actor.id), created_at: new Date(), updated_at: new Date() } }); if (input.type === 2) { const end = new Date(client.end_date ?? new Date()); if (input.extendContract) end.setUTCMonth(end.getUTCMonth() + ({ 1: 3, 2: 6, 3: 12 }[client.subscription_duration] ?? 0)); await tx.users.updateMany({ where: { id: input.clientId, trash: 0 }, data: { paid_amount: input.extendContract ? input.amount : client.paid_amount + input.amount, ...(input.extendContract ? { end_date: end } : {}), updated_by: Number(actor.id), updated_at: new Date() } }) } return true }) }
  async collections(from: Date | undefined, to: Date | undefined, page: number, take: number) {
    const where: Prisma.ClientPaymentsWhereInput = { ...(from || to ? { payment_date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) }
    const now = new Date(), today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), week = new Date(today)
    week.setUTCDate(week.getUTCDate() - 6)
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), year = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
    const [payments,total,t,w,m,y] = await Promise.all([
      this.prisma.clientPayments.findMany({ where, orderBy:{id:'desc'},skip:(page-1)*take,take }),
      this.prisma.clientPayments.count({where}),
      this.prisma.clientPayments.aggregate({_sum:{paid_amount:true},where:{payment_date:{gte:today}}}),
      this.prisma.clientPayments.aggregate({_sum:{paid_amount:true},where:{payment_date:{gte:week,lte:today}}}),
      this.prisma.clientPayments.aggregate({_sum:{paid_amount:true},where:{payment_date:{gte:month}}}),
      this.prisma.clientPayments.aggregate({_sum:{paid_amount:true},where:{payment_date:{gte:year}}}),
    ])
    const clients = payments.length ? await this.prisma.users.findMany({ where: { id: { in: [...new Set(payments.map((row) => row.client_id))] } }, select: { id: true, business_name: true, business_type_id: true } }) : []
    const businessTypeIds = [...new Set(clients.map((client) => client.business_type_id))]
    const businessTypes = businessTypeIds.length ? await this.prisma.businessTypes.findMany({ where: { id: { in: businessTypeIds.map(BigInt) } }, select: { id: true, business_type: true } }) : []
    const clientMap = new Map(clients.map((client) => [client.id.toString(), client])), typeMap = new Map(businessTypes.map((type) => [Number(type.id), type.business_type]))
    const rows = payments.map((payment) => { const client=clientMap.get(payment.client_id.toString()); return { ...payment, business_name: client?.business_name ?? null, business_type: client ? typeMap.get(client.business_type_id) ?? null : null } })
    return { rows,total,today:t._sum.paid_amount??0,week:w._sum.paid_amount??0,month:m._sum.paid_amount??0,year:y._sum.paid_amount??0 }
  }
}
