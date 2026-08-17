import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../useAuth'

export const ProtectedRoute = () => {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-brand-ink">Carregando sessão...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user.mfaRequired && !user.mfaVerified) {
    return <Navigate to="/mfa" replace state={{ from: location }} />
  }

  return <Outlet />
}