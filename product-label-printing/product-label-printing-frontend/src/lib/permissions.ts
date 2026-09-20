import type { Role } from '../types'

// RBAC (§19)
export type Permission =
  | 'products.view'
  | 'products.manage'
  | 'batches.manage'
  | 'print'
  | 'printers.manage'
  | 'templates.manage'
  | 'identity.manage'
  | 'analytics.basic'
  | 'analytics.full'
  | 'audit.view'
  | 'users.manage'
  | 'settings.manage'

const ALL: Permission[] = [
  'products.view',
  'products.manage',
  'batches.manage',
  'print',
  'printers.manage',
  'templates.manage',
  'identity.manage',
  'analytics.basic',
  'analytics.full',
  'audit.view',
  'users.manage',
  'settings.manage',
]

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: ALL,
  ADMIN: ['products.view', 'products.manage', 'batches.manage', 'print', 'templates.manage', 'identity.manage', 'analytics.basic'],
  STAFF: ['products.view', 'print'],
  VIEWER: ['products.view', 'analytics.basic'],
}

export const ROLE_META: Record<Role, { color: string; summary: string[] }> = {
  OWNER: { color: 'gold', summary: ['Manage products', 'Manage printers', 'Manage templates', 'Analytics', 'Users', 'Settings', 'Audit logs'] },
  ADMIN: { color: 'green', summary: ['Products', 'Printing', 'Templates', 'Basic analytics'] },
  STAFF: { color: 'cyan', summary: ['Search products', 'Queue labels', 'Print', 'View print status'] },
  VIEWER: { color: 'default', summary: ['Read-only'] },
}

export function can(role: Role, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(perm)
}
