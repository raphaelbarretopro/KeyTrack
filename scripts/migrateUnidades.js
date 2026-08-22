import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : path.join(projectRoot, 'serviceAccountKey.json')

const tenantId = 'senai-crti'
const defaultUnidadeId = 'senai-crti'

const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'))

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'keytrack-senai-crti',
  })
}

const firestore = getFirestore()

const unidadeRef = firestore.doc(`tenants/${tenantId}/unidades/${defaultUnidadeId}`)
const unidadeSnapshot = await unidadeRef.get()

if (unidadeSnapshot.exists) {
  console.log(`Unidade padrão "${defaultUnidadeId}" já existe, mantendo como está.`)
} else {
  await unidadeRef.set({
    nome: 'SENAI CRTI',
    descricao: 'Unidade padrão criada na migração para o modelo multi-unidade.',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
  console.log(`Unidade padrão "${defaultUnidadeId}" criada.`)
}

const migrateCollection = async (collectionName, skip = () => false) => {
  const snapshot = await firestore.collection(`tenants/${tenantId}/${collectionName}`).get()
  const pending = snapshot.docs.filter((document) => !document.data().unidadeId && !skip(document.data()))

  if (!pending.length) {
    console.log(`${collectionName}: nenhum documento sem unidadeId (${snapshot.size} no total).`)
    return
  }

  const batchSize = 400
  for (let index = 0; index < pending.length; index += batchSize) {
    const batch = firestore.batch()
    for (const document of pending.slice(index, index + batchSize)) {
      batch.update(document.ref, { unidadeId: defaultUnidadeId, updatedAt: FieldValue.serverTimestamp() })
    }
    await batch.commit()
  }

  console.log(`${collectionName}: ${pending.length} documento(s) migrado(s) para a unidade "${defaultUnidadeId}".`)
}

await migrateCollection('keys')
await migrateCollection('instructors')
await migrateCollection('movements')
// O super_admin é global: precisa continuar sem unidade vinculada.
await migrateCollection('users', (data) => data.role === 'super_admin')

console.log('Migração concluída.')
