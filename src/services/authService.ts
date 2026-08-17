import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'

import { auth } from '../lib/firebase/client'
import type { AppUser, AuthResult } from '../types/domain'

const demoUser: AppUser = {
  uid: 'demo-reception',
  email: 'recepcao@crti.senai.br',
  name: 'Recepção CRTI',
  enrollment: 'SENAI-0001',
  tenantId: 'senai-crti',
  role: 'reception',
  mfaRequired: true,
  mfaVerified: false,
}

let demoSession = demoUser

const fromClaims = async (): Promise<AppUser | null> => {
  if (!auth?.currentUser) return null

  const tokenResult = await auth.currentUser.getIdTokenResult()
  const claims = tokenResult.claims as Record<string, unknown>

  return {
    uid: auth.currentUser.uid,
    email: auth.currentUser.email ?? '',
    name: (claims.name as string) || auth.currentUser.displayName || auth.currentUser.email || 'Usuário SENAI',
    enrollment: (claims.enrollment as string) || 'SEM-MATRICULA',
    tenantId: (claims.tenantId as string) || 'sem-tenant',
    role: ((claims.role as 'admin' | 'reception') || 'reception'),
    mfaRequired: !!claims.mfaRequired,
    mfaVerified: !claims.mfaRequired,
  }
}

export const authService = {
  subscribe(callback: (user: AppUser | null) => void) {
    if (!auth) {
      callback(demoSession)
      return () => undefined
    }

    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        callback(null)
        return
      }

      callback(await fromClaims())
    })
  },

  async signIn(email: string, password: string): Promise<AuthResult> {
    if (!auth) {
      demoSession = {
        ...demoUser,
        email,
        name: email.split('@')[0] || demoUser.name,
        mfaVerified: false,
      }

      return { status: 'requires-mfa', user: demoSession }
    }

    await signInWithEmailAndPassword(auth, email, password)
    const user = await fromClaims()

    if (!user) {
      throw new Error('Não foi possível carregar a sessão autenticada.')
    }

    return {
      status: user.mfaRequired ? 'requires-mfa' : 'authenticated',
      user,
    }
  },

  async verifyMfa(code: string): Promise<AppUser> {
    if (code.trim().length !== 6) {
      throw new Error('Informe um código TOTP com 6 dígitos.')
    }

    if (!auth) {
      demoSession = { ...demoSession, mfaVerified: true }
      return demoSession
    }

    const user = await fromClaims()
    if (!user) {
      throw new Error('Sessão inválida para concluir o MFA.')
    }

    return { ...user, mfaVerified: true }
  },

  async logout() {
    if (!auth) {
      demoSession = { ...demoUser, mfaVerified: false }
      return
    }

    await signOut(auth)
  },
}