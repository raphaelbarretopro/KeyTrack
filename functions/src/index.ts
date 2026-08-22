import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

initializeApp()

type UserRole = 'super_admin' | 'admin' | 'reception'

interface CreateUserRequest {
  name: string
  email: string
  password: string
  role: UserRole
  unidadeId?: string
}

export const createUser = onCall<CreateUserRequest>(async (request) => {
  const callerClaims = request.auth?.token
  const callerRole = callerClaims?.role as UserRole | undefined

  if (!request.auth || (callerRole !== 'admin' && callerRole !== 'super_admin')) {
    throw new HttpsError('permission-denied', 'Apenas administradores podem cadastrar usuários.')
  }

  const tenantId = callerClaims?.tenantId as string | undefined
  if (!tenantId) {
    throw new HttpsError('failed-precondition', 'O administrador não possui um tenant ativo.')
  }

  const { name, email, password, role } = request.data

  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    throw new HttpsError('invalid-argument', 'Informe nome, email e uma senha com ao menos 6 caracteres.')
  }

  if (role !== 'super_admin' && role !== 'admin' && role !== 'reception') {
    throw new HttpsError('invalid-argument', 'Nível de acesso inválido.')
  }

  // Um admin de unidade só pode criar usuários de recepção, e sempre na própria unidade.
  if (callerRole === 'admin' && role !== 'reception') {
    throw new HttpsError('permission-denied', 'Administradores de unidade só podem cadastrar usuários de recepção.')
  }

  const callerUnidadeId = callerClaims?.unidadeId as string | undefined
  const unidadeId = role === 'super_admin' ? undefined : (callerRole === 'admin' ? callerUnidadeId : request.data.unidadeId)

  if (role !== 'super_admin' && !unidadeId) {
    throw new HttpsError('invalid-argument', 'Informe a unidade do usuário.')
  }

  const auth = getAuth()
  const firestore = getFirestore()

  const userRecord = await auth.createUser({
    email: email.trim(),
    password,
    displayName: name.trim(),
  })

  await auth.setCustomUserClaims(userRecord.uid, {
    role,
    tenantId,
    ...(unidadeId ? { unidadeId } : {}),
  })

  await firestore.doc(`tenants/${tenantId}/users/${userRecord.uid}`).set({
    uid: userRecord.uid,
    email: email.trim(),
    name: name.trim(),
    tenantId,
    role,
    ...(unidadeId ? { unidadeId } : {}),
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  return { uid: userRecord.uid }
})
