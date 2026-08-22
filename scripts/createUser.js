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

const parseArgs = (argv) => {
  const args = {}
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token.startsWith('--')) {
      const key = token.slice(2)
      const value = argv[index + 1]
      args[key] = value
      index += 1
    }
  }
  return args
}

const args = parseArgs(process.argv.slice(2))
const name = args.name
const email = args.email
const password = args.password
const role = args.role
const unidadeId = args.unidade

if (!name || !email || !password || !role) {
  console.error(
    'Uso: node scripts/createUser.js --name "Nome Completo" --email usuario@exemplo.com --password "senha123" --role super_admin|admin|reception [--unidade id-da-unidade]',
  )
  process.exit(1)
}

if (role !== 'super_admin' && role !== 'admin' && role !== 'reception') {
  throw new Error('--role deve ser "super_admin", "admin" ou "reception".')
}

if (role !== 'super_admin' && !unidadeId) {
  throw new Error('--unidade é obrigatório para os papéis "admin" e "reception".')
}

if (password.length < 6) {
  throw new Error('A senha deve ter ao menos 6 caracteres.')
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
  console.log(`Usuário existente localizado: ${user.uid}. Atualizando senha e nome.`)
  user = await auth.updateUser(user.uid, { password, displayName: name })
} catch (error) {
  if (error?.code !== 'auth/user-not-found') throw error

  user = await auth.createUser({
    email,
    password,
    displayName: name,
    emailVerified: true,
  })
  console.log(`Usuário criado: ${user.uid}`)
}

const claims = { tenantId, role, ...(unidadeId ? { unidadeId } : {}) }
await auth.setCustomUserClaims(user.uid, claims)

await firestore.doc(`tenants/${tenantId}/users/${user.uid}`).set(
  {
    uid: user.uid,
    email,
    name,
    tenantId,
    role,
    ...(unidadeId ? { unidadeId } : {}),
    active: true,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  },
  { merge: true },
)

console.log(
  `Usuário "${name}" (${email}) configurado como "${role}"${unidadeId ? ` na unidade "${unidadeId}"` : ''} no tenant ${tenantId}.`,
)
