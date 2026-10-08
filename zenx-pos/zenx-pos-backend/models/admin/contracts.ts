export type AdminIdentity = { id: bigint; name: string; mobile: string; passwordHash: string; status: number }

export type AdminResource =
  | 'admins' | 'businessTypes' | 'features' | 'subFeatures'
  | 'keyMappings' | 'billColumns' | 'couponUsageTypes' | 'billFormats'

export type AdminRow = Record<string, unknown> & { id: bigint }

export interface AdminStore {
  findAdminByMobile(mobile: string): Promise<AdminIdentity | null>
  findAdminById(id: bigint): Promise<AdminIdentity | null>
  updatePassword(id: bigint, expectedHash: string, passwordHash: string): Promise<boolean>
  list(resource: AdminResource, searchFields: string[], search: string, status: number | undefined, filters: Record<string, bigint>, page: number, take: number): Promise<{ items: AdminRow[]; total: number }>
  find(resource: AdminResource, id: bigint): Promise<AdminRow | null>
  findDuplicate(resource: AdminResource, values: Record<string, unknown>, excludeId?: bigint): Promise<boolean>
  create(resource: AdminResource, data: Record<string, unknown>, actorId: bigint): Promise<AdminRow>
  update(resource: AdminResource, id: bigint, data: Record<string, unknown>, actorId: bigint): Promise<AdminRow | null>
  softDelete(resource: AdminResource, id: bigint, actorId: bigint): Promise<boolean>
  activeParent(resource: 'features' | 'businessTypes', id: bigint): Promise<boolean>
}
