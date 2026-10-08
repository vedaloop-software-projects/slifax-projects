import { z } from 'zod'
import type { AccessStore } from '../../models/access/contracts.ts'
import type { Account, AuthStore } from '../../models/auth/contracts.ts'
import { ApiError } from '../auth/service.ts'

const id = z.number().int().positive().safe(), bit = z.union([z.literal(0), z.literal(1)])
const grant = { status: bit, isAdd: bit, isEdit: bit, isView: bit }
const getSchema = z.object({ roleId: id }).strict()
const saveSchema = z.object({
  roleId: id,
  billingAccess: z.object({ allowDiscount: bit, allowPriceOverride: bit, allowRefund: bit }).strict(),
  features: z.array(z.object({ featureId: id, ...grant, subFeatures: z.array(z.object({ subFeatureId: id, ...grant }).strict()).max(200) }).strict()).max(200),
}).strict().superRefine((value, context) => {
  const features = value.features.map((item) => item.featureId); if (new Set(features).size !== features.length) context.addIssue({ code: 'custom', message: 'Duplicate feature.' })
  for (const feature of value.features) { const subs = feature.subFeatures.map((item) => item.subFeatureId); if (new Set(subs).size !== subs.length) context.addIssue({ code: 'custom', message: 'Duplicate subfeature.' }) }
})

function safeId(value: bigint) { const result = Number(value); if (!Number.isSafeInteger(result)) throw new Error('Database ID exceeds JSON range.'); return result }
export class AccessService {
  private readonly store: AccessStore
  private readonly authStore: AuthStore
  constructor(store: AccessStore, authStore: AuthStore) { this.store = store; this.authStore = authStore }
  private async authorize(account: Account, action: 'view' | 'edit') {
    const rows = await this.authStore.listPermissions(account.client.id, account.user.roleId)
    if (!rows.some((row) => row[action] === 1 && /role|access/i.test(row.subFeature ?? row.feature))) throw new ApiError(403, 'You do not have permission to perform this action.')
  }
  async get(account: Account, input: unknown) {
    await this.authorize(account, 'view'); const parsed = getSchema.safeParse(input); if (!parsed.success) throw new ApiError(422, 'Invalid role ID.')
    const data = await this.store.getRoleAccess(account.client.id, BigInt(parsed.data.roleId)); if (!data) throw new ApiError(404, 'Invalid role.')
    return { billingAccess: data.billingAccess, features: data.features.map((feature) => ({ ...feature, featureId: safeId(feature.featureId), subFeatures: feature.subFeatures.map((sub) => ({ ...sub, subFeatureId: safeId(sub.subFeatureId) })) })) }
  }
  async save(account: Account, input: unknown) {
    await this.authorize(account, 'edit'); const parsed = saveSchema.safeParse(input); if (!parsed.success) throw new ApiError(422, 'Invalid access level details.')
    const result = await this.store.saveRoleAccess(account, { roleId: BigInt(parsed.data.roleId), billingAccess: parsed.data.billingAccess, features: parsed.data.features.map((feature) => ({ ...feature, featureId: BigInt(feature.featureId), subFeatures: feature.subFeatures.map((sub) => ({ ...sub, subFeatureId: BigInt(sub.subFeatureId) })) })) })
    if (result === 'role_missing') throw new ApiError(404, 'Invalid role.')
    if (result === 'feature_invalid') throw new ApiError(422, 'Feature is not enabled for this client.')
    if (result === 'subfeature_invalid') throw new ApiError(422, 'Subfeature does not belong to the selected feature.')
  }
}
