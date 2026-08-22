import type { PropsWithChildren } from 'react'

import { AuthProvider } from '../../features/auth/AuthContext'
import { ActiveUnidadeProvider } from '../../features/units/ActiveUnidadeContext'

export const AppProviders = ({ children }: PropsWithChildren) => (
  <AuthProvider>
    <ActiveUnidadeProvider>{children}</ActiveUnidadeProvider>
  </AuthProvider>
)