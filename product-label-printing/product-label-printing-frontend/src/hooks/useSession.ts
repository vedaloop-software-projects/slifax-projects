import { useCallback, useMemo } from 'react'
import { useDb } from '../mock/db'
import { can as canRole, type Permission } from '../lib/permissions'

export function useSession() {
  const db = useDb()
  const user = useMemo(() => db.users.find((u) => u.id === db.session.userId) ?? null, [db.users, db.session.userId])
  const can = useCallback((p: Permission) => !!user && canRole(user.role, p), [user])
  return { user, can }
}
