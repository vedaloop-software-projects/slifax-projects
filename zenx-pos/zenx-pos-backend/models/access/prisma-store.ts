import type { PrismaClient } from '@prisma/client'
import type { Account } from '../auth/contracts.ts'
import type { AccessSave, AccessStore, PermissionValue } from './contracts.ts'

const empty = (): PermissionValue => ({ status: 0, isAdd: 0, isEdit: 0, isView: 0 })
const permission = (row: { status: number; is_add: number; is_edit: number; is_view: number } | undefined) => row ? { status: row.status, isAdd: row.is_add, isEdit: row.is_edit, isView: row.is_view } : empty()

export class PrismaAccessStore implements AccessStore {
  private readonly prisma: PrismaClient
  constructor(prisma: PrismaClient) { this.prisma = prisma }

  async getRoleAccess(clientId: bigint, roleId: bigint) {
    const role = await this.prisma.clientRoles.findFirst({ where: { id: roleId, client_id: clientId, status: 1, trash: 0 } }); if (!role) return null
    const enabled = await this.prisma.clientFeatures.findMany({ where: { client_id: clientId, status: 1 } })
    const featureIds = [...new Set(enabled.map((row) => row.feature_id))]
    const [features, subFeatures, grants, billing] = await Promise.all([
      this.prisma.features.findMany({ where: { id: { in: featureIds }, status: 1, trash: 0 }, orderBy: { priority: 'asc' } }),
      this.prisma.subFeatures.findMany({ where: { feature_id: { in: featureIds }, status: 1, trash: 0 }, orderBy: { priority: 'asc' } }),
      this.prisma.clientRoleFeatures.findMany({ where: { client_id: clientId, role_id: roleId, trash: 0 } }),
      this.prisma.clientRoleBillingAccess.findFirst({ where: { client_id: clientId, role_id: roleId } }),
    ])
    const grantMap = new Map(grants.map((row) => [`${row.feature_id}:${row.sub_feature_id}`, row]))
    return {
      billingAccess: { allowDiscount: billing?.allow_discount ?? 0, allowPriceOverride: billing?.allow_price_override ?? 0, allowRefund: billing?.allow_refund ?? 0 },
      features: features.map((feature) => {
        const subs = subFeatures.filter((sub) => sub.feature_id === feature.id).map((sub) => ({ subFeatureId: sub.id, subFeatureName: sub.sub_feature, ...permission(grantMap.get(`${feature.id}:${sub.id}`)) }))
        const direct = permission(grantMap.get(`${feature.id}:0`)); const status = subs.some((sub) => sub.status === 1) ? 1 : direct.status
        return { featureId: feature.id, featureName: feature.feature, ...direct, status, subFeatures: subs }
      }),
    }
  }

  async saveRoleAccess(account: Account, value: AccessSave) {
    return this.prisma.$transaction(async (transaction) => {
      const role = await transaction.clientRoles.findFirst({ where: { id: value.roleId, client_id: account.client.id, status: 1, trash: 0 } }); if (!role) return 'role_missing' as const
      const enabled = await transaction.clientFeatures.findMany({ where: { client_id: account.client.id, status: 1 } }); const enabledIds = new Set(enabled.map((row) => row.feature_id.toString()))
      const featureIds = value.features.map((item) => item.featureId); if (featureIds.some((featureId) => !enabledIds.has(featureId.toString()))) return 'feature_invalid' as const
      const subs = await transaction.subFeatures.findMany({ where: { feature_id: { in: featureIds }, status: 1, trash: 0 } }); const subMap = new Map(subs.map((sub) => [sub.id.toString(), sub.feature_id]))
      if (value.features.some((feature) => feature.subFeatures.some((sub) => subMap.get(sub.subFeatureId.toString()) !== feature.featureId))) return 'subfeature_invalid' as const
      const now = new Date(); const submitted: { featureId: bigint; subFeatureId: bigint; value: PermissionValue }[] = []
      for (const feature of value.features) {
        if (feature.subFeatures.length) for (const sub of feature.subFeatures) submitted.push({ featureId: feature.featureId, subFeatureId: sub.subFeatureId, value: sub })
        else submitted.push({ featureId: feature.featureId, subFeatureId: 0n, value: feature })
      }
      const existing = await transaction.clientRoleFeatures.findMany({ where: { client_id: account.client.id, role_id: value.roleId, trash: 0 } })
      const keep = new Set(submitted.map((item) => `${item.featureId}:${item.subFeatureId}`))
      for (const row of existing.filter((item) => !keep.has(`${item.feature_id}:${item.sub_feature_id}`))) await transaction.clientRoleFeatures.update({ where: { id: row.id }, data: { status: 0, is_add: 0, is_edit: 0, is_view: 0, updated_by: Number(account.user.id), updated_at: now } })
      for (const item of submitted) {
        const grant = item.value.status === 0 ? empty() : item.value; const current = existing.find((row) => row.feature_id === item.featureId && row.sub_feature_id === item.subFeatureId)
        const data = { status: grant.status, is_add: grant.isAdd, is_edit: grant.isEdit, is_view: grant.isView, trash: 0, updated_by: Number(account.user.id), updated_at: now }
        if (current) await transaction.clientRoleFeatures.update({ where: { id: current.id }, data })
        else await transaction.clientRoleFeatures.create({ data: { client_id: account.client.id, role_id: value.roleId, feature_id: item.featureId, sub_feature_id: item.subFeatureId, ...data, created_by: Number(account.user.id), created_at: now } })
      }
      const billing = await transaction.clientRoleBillingAccess.findFirst({ where: { client_id: account.client.id, role_id: value.roleId } })
      const billingData = { allow_discount: value.billingAccess.allowDiscount, allow_price_override: value.billingAccess.allowPriceOverride, allow_refund: value.billingAccess.allowRefund, updated_by: Number(account.user.id), updated_at: now }
      if (billing) await transaction.clientRoleBillingAccess.update({ where: { id: billing.id }, data: billingData })
      else await transaction.clientRoleBillingAccess.create({ data: { client_id: account.client.id, role_id: value.roleId, ...billingData, created_by: Number(account.user.id), created_at: now } })
      await transaction.audits.create({ data: { client_id: account.client.id, user_id: account.user.id, type: 'add/update', description: `${role.role_title ?? 'Role'} access levels and billing access updated`, created_at: now, updated_at: now } })
      return 'saved' as const
    })
  }
}
