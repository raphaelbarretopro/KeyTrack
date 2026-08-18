import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : path.join(projectRoot, 'serviceAccountKey.json')

const tenantId = 'senai-crti'
const email = process.env.SEED_ADMIN_EMAIL || 'raphael.boliveira@gmail.com'
const password = process.env.SEED_ADMIN_PASSWORD

if (!password) {
  throw new Error('Defina SEED_ADMIN_PASSWORD antes de executar o seed.')
}

const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'))

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'keytrack-senai-crti',
  })
}

const auth = getAuth()
const firestore = getFirestore()

let user

try {
  user = await auth.getUserByEmail(email)
  console.log(`Usuario existente localizado: ${user.uid}`)
} catch (error) {
  if (error?.code !== 'auth/user-not-found') throw error

  user = await auth.createUser({
    email,
    password,
    displayName: 'Administrador CRTI',
    emailVerified: true,
  })
  console.log(`Usuario criado: ${user.uid}`)
}

await auth.setCustomUserClaims(user.uid, {
  tenantId,
  role: 'admin',
})

await firestore.doc(`tenants/${tenantId}/users/${user.uid}`).set(
  {
    uid: user.uid,
    email,
    name: user.displayName || 'Administrador CRTI',
    tenantId,
    role: 'admin',
    active: true,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  },
  { merge: true },
)

console.log(`Admin configurado para o tenant ${tenantId}: ${email}`)