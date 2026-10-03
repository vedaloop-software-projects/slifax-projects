import { useCallback, useEffect, useState } from 'react'
import { can as canRole, type Permission } from '../lib/permissions'
import type { User } from '../types'

function readUser(): User | null {
  try {
    const raw = localStorage.getItem('sl-user')
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function useSession() {
  const [user, setUser] = useState<User | null>(() => readUser())

  useEffect(() => {
    const interval = setInterval(() => {
      const next = readUser()
      setUser((prev) => (prev?.id === next?.id ? prev : next))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const can = useCallback((p: Permission) => !!user && canRole(user.role, p), [user])

  return { user, can }
}