import {
  collection,
  doc,
  deleteField,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'

import { db } from '../lib/firebase/client'
import type { CheckoutPayload, MovementRecord, ReturnPayload } from '../types/domain'

const createMovementId = () => `mov-${crypto.randomUUID()}`
const maxPhotoDimension = 640
const maxPhotoBase64Length = 900_000

const loadImage = async (photoDataUrl: string) =>
  await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Não foi possível processar a foto capturada.'))
    image.src = photoDataUrl
  })

const toCompactPhotoBase64 = async (photoDataUrl: string) => {
  const image = await loadImage(photoDataUrl)
  const scale = Math.min(1, maxPhotoDimension / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Não foi possível preparar a foto para armazenamento.')

  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const compressedPhotoDataUrl = canvas.toDataURL('image/jpeg', 0.7)
  const photoBase64 = compressedPhotoDataUrl.replace(/^data:image\/jpeg;base64,/, '')

  if (photoBase64.length > maxPhotoBase64Length) {
    throw new Error('A foto excede o limite permitido. Capture uma imagem com menor resolução.')
  }

  return photoBase64
}

export const movementsService = {
  async createCheckout(tenantId: string, payload: CheckoutPayload) {
    const movementId = createMovementId()
    const createdAt = new Date().toISOString()
    const capturedPhotoBase64 = await toCompactPhotoBase64(payload.photoDataUrl)

    if (!db) throw new Error('Firebase não está configurado para registrar a retirada.')

    const batch = writeBatch(db)
    const movementRef = doc(db, `tenants/${tenantId}/movements/${movementId}`)
    const keyRef = doc(db, `tenants/${tenantId}/keys/${payload.keyId}`)

    batch.set(movementRef, {
      keyId: payload.keyId,
      action: 'checkout',
      actorUserId: payload.actorUserId,
      actorEnrollment: payload.actorEnrollment,
      actorName: payload.actorName,
      checkoutAt: createdAt,
      expectedReturnAt: payload.expectedReturnAt ?? null,
      capturedPhotoBase64,
      notes: payload.notes ?? null,
      createdAt: serverTimestamp(),
    })

    batch.update(keyRef, {
      statusCurrent: 'occupied',
      lastMovementId: movementId,
      updatedAt: serverTimestamp(),
    })

    await batch.commit()

    return {
      id: movementId,
      keyId: payload.keyId,
      action: 'checkout',
      actorUserId: payload.actorUserId,
      actorEnrollment: payload.actorEnrollment,
      actorName: payload.actorName,
      checkoutAt: createdAt,
      expectedReturnAt: payload.expectedReturnAt,
      capturedPhotoBase64,
      notes: payload.notes,
      createdAt,
    } satisfies MovementRecord
  },

  async returnKey(tenantId: string, payload: ReturnPayload) {
    const returnedAt = new Date().toISOString()

    if (!db) throw new Error('Firebase não está configurado para registrar a devolução.')

    const batch = writeBatch(db)
    const movementRef = doc(db, `tenants/${tenantId}/movements/${payload.movementId}`)
    const keyRef = doc(db, `tenants/${tenantId}/keys/${payload.keyId}`)

    batch.update(movementRef, {
      returnedAt,
      notes: payload.notes ?? null,
      capturedPhotoBase64: deleteField(),
    })

    batch.update(keyRef, {
      statusCurrent: 'available',
      lastMovementId: payload.movementId,
      updatedAt: serverTimestamp(),
    })

    await batch.commit()
  },

  async findOpenMovementByQrCode(tenantId: string, qrCodeId: string) {
    if (!db) throw new Error('Firebase não está configurado para consultar a chave.')

    const keysRef = query(
      collection(db, `tenants/${tenantId}/keys`),
      where('qrCodeId', '==', qrCodeId),
      limit(1),
    )
    const snapshot = await getDocs(keysRef)
    const keyDoc = snapshot.docs[0]
    if (!keyDoc) return null

    return {
      keyId: keyDoc.id,
      key: keyDoc.data(),
    }
  },
}