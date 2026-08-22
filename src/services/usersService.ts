import { deleteApp, initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword, deleteUser, getAuth, signOut } from 'firebase/auth'
import { collection, deleteDoc, doc, getDocs, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore'

import { env } from '../config/env'
import { db } from '../lib/firebase/client'
import type { UserRole } from '../types/domain'

export interface TenantUser {
  id: string
  name: string
  email: string
  role: UserRole
  unidadeId?: string
  active: boolean
}

interface CreateUserPayload {
  name: string
  email: string
  password: string
  role: UserRole
  unidadeId?: string
}

interface UpdateUserPayload {
  name: string
  role: UserRole
  unidadeId?: string
}

const translateAuthError = (error: unknown) => {
  const code = (error as { code?: string } | null)?.code

  switch (code) {
    case 'auth/email-already-in-use':
      return 'Este email já está cadastrado no sistema.'
    case 'auth/invalid-email':
      return 'Email inválido.'
    case 'auth/weak-password':
      return 'A senha é muito fraca. Use ao menos 6 caracteres.'
    default:
      return error instanceof Error ? error.message : 'Falha ao cadastrar o usuário.'
  }
}

export const usersService = {
  async listUsers(tenantId: string, unidadeId?: string) {
    if (!db) throw new Error('Firebase não está configurado para carregar os usuários.')

    const constraints = unidadeId ? [where('unidadeId', '==', unidadeId)] : []
    const usersRef = query(collection(db, `tenants/${tenantId}/users`), ...constraints, orderBy('name'))
    const snapshot = await getDocs(usersRef)

    return snapshot.docs.map((item) => {
      const data = item.data() as Partial<TenantUser>
      return {
        id: item.id,
        name: data.name || '',
        email: data.email || '',
        role: data.role || 'reception',
        unidadeId: data.unidadeId,
        active: data.active ?? true,
      } satisfies TenantUser
    })
  },

  /**
   * Cria a conta de acesso sem depender de Cloud Functions.
   *
   * A conta é criada numa instância SECUNDÁRIA do Firebase para não derrubar a
   * sessão do administrador que está cadastrando. O papel/unidade vão para o
   * documento do Firestore, gravado com a permissão do próprio administrador.
   * Se essa gravação falhar, a conta recém-criada é desfeita para não sobrar
   * um login órfão sem acesso a nada.
   */
  async createUser(tenantId: string, payload: CreateUserPayload) {
    if (!db) throw new Error('Firebase não está configurado para cadastrar usuários.')

    const provisioningApp = initializeApp(env.firebase, `user-provisioning-${Date.now()}`)
    const provisioningAuth = getAuth(provisioningApp)

    try {
      const credential = await createUserWithEmailAndPassword(
        provisioningAuth,
        payload.email,
        payload.password,
      ).catch((error) => {
        throw new Error(translateAuthError(error), { cause: error })
      })

      const uid = credential.user.uid
      const createdAt = new Date().toISOString()

      try {
        await setDoc(doc(db, `tenants/${tenantId}/users/${uid}`), {
          uid,
          name: payload.name,
          email: payload.email,
          tenantId,
          role: payload.role,
          ...(payload.unidadeId ? { unidadeId: payload.unidadeId } : {}),
          active: true,
          createdAt,
          updatedAt: createdAt,
        })
      } catch (profileError) {
        // Desfaz a conta para não deixar um login sem perfil (e com o email preso).
        await deleteUser(credential.user).catch(() => undefined)
        throw new Error(
          'A conta não pôde ser vinculada ao sistema (permissão negada ao gravar o perfil) e foi desfeita.',
          { cause: profileError },
        )
      }

      return { uid }
    } finally {
      await signOut(provisioningAuth).catch(() => undefined)
      await deleteApp(provisioningApp).catch(() => undefined)
    }
  },

  async updateUser(tenantId: string, userId: string, payload: UpdateUserPayload) {
    if (!db) throw new Error('Firebase não está configurado para atualizar o usuário.')

    await updateDoc(doc(db, `tenants/${tenantId}/users/${userId}`), {
      name: payload.name,
      role: payload.role,
      ...(payload.unidadeId ? { unidadeId: payload.unidadeId } : {}),
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * Remove o perfil do usuário — o acesso é cortado imediatamente.
   * A conta em si continua no Firebase Authentication: o navegador não tem
   * permissão para apagá-la. Para liberar o email é preciso um script Admin SDK.
   */
  async removeUser(tenantId: string, userId: string) {
    if (!db) throw new Error('Firebase não está configurado para excluir o usuário.')

    await deleteDoc(doc(db, `tenants/${tenantId}/users/${userId}`))
  },
}
