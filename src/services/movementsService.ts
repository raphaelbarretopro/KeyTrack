import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'

import { useMockData } from '../config/env'
import { db } from '../lib/firebase/client'
import { applyMockCheckout, applyMockReturn } from './keysService'
import { storageService } from './storageService'
import type { CheckoutPayload, MovementRecord, ReturnPayload } from '../types/domain'

const createMovementId = () => `mov-${crypto.randomUUID()}`

export const movementsService = {
  async createCheckout(tenantId: string, payload: CheckoutPayload) {
    const movementId = createMovementId()
    const createdAt = new Date().toISOString()
    const uploaded = await storageService.uploadCheckoutPhoto(
      tenantId,
      payload.keyId,
      movementId,
      payload.photoDataUrl,
    )

    if (!db || useMockData) {
      const movement: MovementRecord = {
        id: movementId,
        keyId: payload.keyId,
        action: 'checkout',
        actorUserId: payload.actorUserId,
        actorEnrollment: payload.actorEnrollment,
        actorName: payload.actorName,
        checkoutAt: createdAt,
        expectedReturnAt: payload.expectedReturnAt,
        capturedPhotoPath: uploaded.path,
        capturedPhotoUrl: uploaded.url,
        notes: payload.notes,
        createdAt,
      }

      applyMockCheckout(movement)
      return movement
    }

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
      capturedPhotoPath: uploaded.path,
      capturedPhotoUrl: uploaded.url,
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
      capturedPhotoPath: uploaded.path,
      capturedPhotoUrl: uploaded.url,
      notes: payload.notes,
      createdAt,
    } satisfies MovementRecord
  },

  async returnKey(tenantId: string, payload: ReturnPayload) {
    const returnedAt = new Date().toISOString()

    if (!db || useMockData) {
      applyMockReturn(payload.movementId, returnedAt, payload.notes)
      return
    }

    const batch = writeBatch(db)
    const movementRef = doc(db, `tenants/${tenantId}/movements/${payload.movementId}`)
    const keyRef = doc(db, `tenants/${tenantId}/keys/${payload.keyId}`)

    batch.update(movementRef, {
      returnedAt,
      notes: payload.notes ?? null,
    })

    batch.update(keyRef, {
      statusCurrent: 'available',
      lastMovementId: payload.movementId,
      updatedAt: serverTimestamp(),
    })

    await batch.commit()
  },

  async findOpenMovementByQrCode(tenantId: string, qrCodeId: string) {
    if (!db || useMockData) {
      return null
    }

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