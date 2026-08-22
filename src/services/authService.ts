import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

import { env } from '../config/env'
import { auth, db } from '../lib/firebase/client'
import type { AppUser, AuthResult, UserRole } from '../types/domain'

const demoUser: AppUser = {
  uid: 'demo-reception',
  email: 'raphael.boliveira@gmail.com',
  name: 'SETEP CRTI',
  enrollment: 'SENAI-0001',
  tenantId: 'senai-crti',
  role: 'reception',
  mfaRequired: true,
  mfaVerified: false,
}

let demoSession = demoUser

interface FirestoreUserProfile {
  name?: string
  enrollment?: string
  role?: UserRole
  unidadeId?: string
  mfaRequired?: boolean
}

/**
 * O papel/unidade vivem no documento do usuário (e não em custom claims),
 * porque o cadastro precisa funcionar direto do navegador, sem Cloud Functions.
 * Um usuário autenticado sem documento fica sem permissão nenhuma — as regras
 * do Firestore recusam tudo nesse caso, o que é o comportamento desejado.
 */
const loadAppUser = async (): Promise<AppUser | null> => {
  if (!auth?.currentUser) return null

  const firebaseUser = auth.currentUser
  const tenantId = env.tenantId

  let profile: FirestoreUserProfile = {}

  if (db) {
    try {
      const snapshot = await getDoc(doc(db, `tenants/${tenantId}/users/${firebaseUser.uid}`))
      if (snapshot.exists()) {
        profile = snapshot.data() as FirestoreUserProfile
      }
    } catch {
      // Sem perfil acessível o usuário fica sem permissões; o app trata isso na UI.
    }
  }

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    name: profile.name || firebaseUser.displayName || firebaseUser.email || 'Usuário SENAI',
    enrollment: profile.enrollment || 'SEM-MATRICULA',
    tenantId,
    role: profile.role || 'reception',
    unidadeId: profile.unidadeId || undefined,
    mfaRequired: !!profile.mfaRequired,
    mfaVerified: !profile.mfaRequired,
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

      callback(await loadAppUser())
    })
  },

  async signIn(email: string, password: string): Promise<AuthResult> {
    if (!auth) {
      demoSession = {
        ...demoUser,
        email,
        name: demoUser.name,
        mfaVerified: false,
      }

      return { status: 'requires-mfa', user: demoSession }
    }

    await signInWithEmailAndPassword(auth, email, password)
    const user = await loadAppUser()

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

    const user = await loadAppUser()
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