import type { PropsWithChildren } from 'react'

import { AuthProvider } from '../../features/auth/AuthContext'

export const AppProviders = ({ children }: PropsWithChildren) => <AuthProvider>{children}</AuthProvider>