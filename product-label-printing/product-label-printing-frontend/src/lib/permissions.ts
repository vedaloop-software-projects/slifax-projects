import type { Role } from '../types'

// RBAC (§19)
export type Permission =
  | 'clients.manage'
  | 'products.view'
  | 'products.manage'
  | 'batches.manage'
  | 'print'
  | 'print.packedDate'
  | 'printers.manage'
  | 'templates.manage'
  | 'identity.manage'
  | 'analytics.basic'
  | 'analytics.full'
  | 'audit.view'
  | 'users.manage'
  | 'settings.manage'

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  // Legacy barcode sessions may still contain SUPER_ADMIN. They use the same
  // workspace as an admin now that client onboarding lives in zenx-pos.
  SUPER_ADMIN: [
    'products.view',
    'print',
    'print.packedDate',
    'printers.manage',
    'templates.manage',
    'analytics.basic',
    'analytics.full',
    'audit.view',
  ],
  // A client's admin / manager: designs label templates, sees printing analytics.
  // Creating products and users is a super-admin job and is not shown in the workspace.
  // printers.manage stays: someone in the shop has to add the printer before anyone can print.
  ADMIN: [
    'products.view',
    'print',
    // Change the packed date printed on a label (today or earlier).
    'print.packedDate',
    'printers.manage',
    'templates.manage',
    'analytics.basic',
    'analytics.full',
    'audit.view',
  ],
  // Prints barcodes. Nothing else, so the screen stays simple.
  USER: ['print', 'print.packedDate'],
}

export const ROLE_META: Record<Role, { label: string; color: string; summary: string[] }> = {
  SUPER_ADMIN: { label: 'Admin', color: 'gold', summary: ['Design & create label templates', 'Printers', 'Printing analytics', 'Print history & audit logs'] },
  ADMIN: { label: 'Admin', color: 'gold', summary: ['Design & create label templates', 'Printers', 'Printing analytics', 'Print history & audit logs'] },
  USER: { label: 'User', color: 'cyan', summary: ['Search or scan products', 'Queue labels', 'Print'] },
}

/**
 * Older sessions and stored demo data used OWNER / STAFF / VIEWER, and older backends
 * return the raw zenx-pos role title ("Store Manager"). Same rule as the backend:
 * a title containing the word Admin or Manager is ADMIN, anything else USER.
 */
export function normalizeRole(role: unknown): Role {
  const raw = String(role ?? '').trim()
  const r = raw.toUpperCase().replace(/[\s-]+/g, '_')
  if (r === 'SUPER_ADMIN' || r === 'SUPERADMIN') return 'SUPER_ADMIN'
  if (r === 'OWNER' || /\b(admin|manager)\b/i.test(raw.replace(/_/g, ' '))) return 'ADMIN'
  return 'USER'
}

/** Where each role lands after sign-in and from "home" links. */
export function homePath(role: Role | undefined): string {
  return role ? '/dashboard' : '/login'
}

export function can(role: Role, perm: Permission): boolean {
  return ROLE_PERMISSIONS[normalizeRole(role)].includes(perm)
}
