import { Navigate, Outlet } from 'react-router-dom'

import type { UserRole } from '../../../types/domain'
import { useAuth } from '../useAuth'

interface RequireRoleProps {
  allow: UserRole[]
}

export const RequireRole = ({ allow }: RequireRoleProps) => {
  const { user } = useAuth()

  if (!user || !allow.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
