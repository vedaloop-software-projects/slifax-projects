import type { ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { Button, Result } from 'antd'
import { useSession } from '../hooks/useSession'
import { homePath, type Permission } from '../lib/permissions'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useSession()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return children
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { user } = useSession()
  return user ? <Navigate to={homePath(user.role)} replace /> : children
}

/** Sends signed-in users to the barcode workspace. */
export function RoleHome() {
  const { user } = useSession()
  return <Navigate to={homePath(user?.role)} replace />
}

/** Pages that belong to the signed-in client's workspace. */
export function ClientOnly({ children }: { children: ReactNode }) {
  return children
}

export function Guard({ perm, children }: { perm: Permission | Permission[]; children: ReactNode }) {
  const { user, can } = useSession()
  const navigate = useNavigate()
  const ok = Array.isArray(perm) ? perm.some(can) : can(perm)
  if (ok) return children
  return (
    <Result
      status="403"
      title="No access"
      subTitle="Your role doesn’t include this area. Ask your admin if you need it."
      extra={<Button type="primary" onClick={() => navigate(homePath(user?.role))}>Back to home</Button>}
    />
  )
}

export function NotFound() {
  const { user } = useSession()
  const navigate = useNavigate()
  return <Result status="404" title="Page not found" extra={<Button type="primary" onClick={() => navigate(homePath(user?.role))}>Go to home</Button>} />
}
