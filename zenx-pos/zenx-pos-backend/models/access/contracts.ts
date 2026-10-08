import type { Account } from '../auth/contracts.ts'

export type PermissionValue = { status: number; isAdd: number; isEdit: number; isView: number }
export type FeatureAccess = PermissionValue & {
  featureId: bigint
  featureName: string
  subFeatures: (PermissionValue & { subFeatureId: bigint; subFeatureName: string })[]
}
export type BillingAccess = { allowDiscount: number; allowPriceOverride: number; allowRefund: number }
export type AccessData = { billingAccess: BillingAccess; features: FeatureAccess[] }
export type AccessSave = { roleId: bigint; billingAccess: BillingAccess; features: (PermissionValue & { featureId: bigint; subFeatures: (PermissionValue & { subFeatureId: bigint })[] })[] }

export interface AccessStore {
  getRoleAccess(clientId: bigint, roleId: bigint): Promise<AccessData | null>
  saveRoleAccess(account: Account, value: AccessSave): Promise<'saved' | 'role_missing' | 'feature_invalid' | 'subfeature_invalid'>
}
