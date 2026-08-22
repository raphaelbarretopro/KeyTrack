/**
 * Remove do Firebase Authentication as contas que não têm perfil no Firestore.
 *
 * Excluir um usuário pela tela apaga só o documento em tenants/{tenantId}/users
 * (o navegador não tem permissão para apagar a conta de login). Este script faz
 * a faxina do outro lado, deixando o Auth em sincronia com o Firestore.
 *
 * Por padrão roda em modo simulação. Use --confirm para apagar de verdade.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : path.join(projectRoot, 'serviceAccountKey.json')

const tenantId = 'senai-crti'
const shouldDelete = process.argv.includes('--confirm')

const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'))

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount), projectId: 'keytrack-senai-crti' })
}

const auth = getAuth()
const firestore = getFirestore()

const profiles = await firestore.collection(`tenants/${tenantId}/users`).get()
const knownUids = new Set(profiles.docs.map((document) => document.id))

const orphans = []
let pageToken

do {
  const page = await auth.listUsers(1000, pageToken)
  for (const user of page.users) {
    if (!knownUids.has(user.uid)) orphans.push(user)
  }
  pageToken = page.pageToken
} while (pageToken)

if (!orphans.length) {
  console.log('Nenhuma conta órfã encontrada — Auth e Firestore estão em sincronia.')
  process.exit(0)
}

console.log(`Contas sem perfil no Firestore (${orphans.length}):`)
for (const user of orphans) {
  console.log(`  - ${user.email || '(sem email)'} | uid ${user.uid} | criada em ${user.metadata.creationTime}`)
}

if (!shouldDelete) {
  console.log('\nModo simulação. Rode novamente com --confirm para apagar essas contas.')
  process.exit(0)
}

for (const user of orphans) {
  await auth.deleteUser(user.uid)
  console.log(`Removida: ${user.email || user.uid}`)
}

console.log(`\n${orphans.length} conta(s) removida(s) do Firebase Authentication.`)
