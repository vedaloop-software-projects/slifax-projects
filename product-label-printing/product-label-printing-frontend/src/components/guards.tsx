import type { ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { Button, Result } from 'antd'
import { useSession } from '../hooks/useSession'
import type { Permission } from '../lib/permissions'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useSession()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return children
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { user } = useSession()
  return user ? <Navigate to="/dashboard" replace /> : children
}

export function Guard({ perm, children }: { perm: Permission | Permission[]; children: ReactNode }) {
  const { can } = useSession()
  const navigate = useNavigate()
  const ok = Array.isArray(perm) ? perm.some(can) : can(perm)
  if (ok) return children
  return (
    <Result
      status="403"
      title="No access"
      subTitle="Your role doesn’t include this area. Ask the owner if you need it."
      extra={<Button type="primary" onClick={() => navigate('/dashboard')}>Back to dashboard</Button>}
    />
  )
}

export function NotFound() {
  const navigate = useNavigate()
  return <Result status="404" title="Page not found" extra={<Button type="primary" onClick={() => navigate('/dashboard')}>Go to dashboard</Button>} />
}
