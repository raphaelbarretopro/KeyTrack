import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { keyInventory } from './keyInventory.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : path.join(projectRoot, 'serviceAccountKey.json')

const tenantId = 'senai-crti'

const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'))

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'keytrack-senai-crti',
  })
}

const firestore = getFirestore()
const keysCollection = firestore.collection(`tenants/${tenantId}/keys`)
const existingKeys = await keysCollection.get()
const batchSize = 400

for (let index = 0; index < existingKeys.docs.length; index += batchSize) {
  const batch = firestore.batch()

  for (const keyDocument of existingKeys.docs.slice(index, index + batchSize)) {
    batch.delete(keyDocument.ref)
  }

  await batch.commit()
}

for (let index = 0; index < keyInventory.length; index += batchSize) {
  const batch = firestore.batch()

  for (const key of keyInventory.slice(index, index + batchSize)) {
    batch.set(keysCollection.doc(key.id), {
      label: key.name,
      code: key.qrCode,
      qrCodeId: key.qrCode,
      location: 'SENAI CRTI',
      description: `Chave da sala ${key.name}`,
      active: true,
      statusCurrent: 'available',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  await batch.commit()
}

console.log(`Inventário do tenant ${tenantId} recriado com ${keyInventory.length} chaves.`)