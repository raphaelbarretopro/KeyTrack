import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

import { authService } from '../../services/authService'
import type { AppUser, AuthResult } from '../../types/domain'

interface AuthContextValue {
  user: AppUser | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<AuthResult>
  verifyMfa: (code: string) => Promise<AppUser>
  logout: () => Promise<void>
  markMfaVerified: (user: AppUser) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export { AuthContext }

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = authService.subscribe((nextUser) => {
      setUser(nextUser)
      setIsLoading(false)
    })

    return unsubscribe
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      signIn: async (email, password) => {
        const result = await authService.signIn(email, password)
        setUser(result.user)
        return result
      },
      verifyMfa: async (code) => {
        const verifiedUser = await authService.verifyMfa(code)
        setUser(verifiedUser)
        return verifiedUser
      },
      logout: async () => {
        await authService.logout()
        setUser(null)
      },
      markMfaVerified: (verifiedUser) => {
        setUser(verifiedUser)
      },
    }),
    [isLoading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
