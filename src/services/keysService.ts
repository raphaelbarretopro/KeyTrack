import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'

import { db } from '../lib/firebase/client'
import type { DashboardKey, KeyRecord, MovementRecord } from '../types/domain'

type FirestoreKeyData = Partial<KeyRecord> & {
  name?: string
  qrCode?: string
  status?: KeyRecord['statusCurrent']
}

const toKeyRecord = (id: string, data: FirestoreKeyData): KeyRecord => ({
  id,
  label: data.label || data.name || id,
  code: data.code || data.qrCode || '',
  qrCodeId: data.qrCodeId || data.qrCode || '',
  location: data.location || 'SENAI CRTI',
  description: data.description || '',
  active: data.active ?? true,
  statusCurrent: data.statusCurrent || data.status || 'available',
  ...(data.lastMovementId ? { lastMovementId: data.lastMovementId } : {}),
  createdAt: data.createdAt || '',
  updatedAt: data.updatedAt || '',
})

const buildDashboard = (keys: KeyRecord[], movements: MovementRecord[]) =>
  keys.map((key) => ({
    key,
    activeMovement: movements.find(
      (movement) =>
        movement.keyId === key.id &&
        movement.action === 'checkout' &&
        !movement.returnedAt,
    ),
  }))

export const keysService = {
  subscribeDashboard(tenantId: string, callback: (data: DashboardKey[]) => void) {
    if (!db) throw new Error('Firebase não está configurado para carregar as chaves.')

    const keysRef = query(collection(db, `tenants/${tenantId}/keys`), orderBy('label'))
    const movementsRef = query(
      collection(db, `tenants/${tenantId}/movements`),
      orderBy('createdAt', 'desc'),
    )

    let currentKeys: KeyRecord[] = []
    let currentMovements: MovementRecord[] = []

    const unsubscribeKeys = onSnapshot(keysRef, (snapshot) => {
      currentKeys = snapshot.docs.map(
        (item) => toKeyRecord(item.id, item.data() as FirestoreKeyData),
      )
      callback(buildDashboard(currentKeys, currentMovements))
    }, () => callback([]))

    const unsubscribeMovements = onSnapshot(movementsRef, (snapshot) => {
      currentMovements = snapshot.docs.map(
        (item) => ({ id: item.id, ...item.data() }) as MovementRecord,
      )
      callback(buildDashboard(currentKeys, currentMovements))
    }, () => callback([]))

    return () => {
      unsubscribeKeys()
      unsubscribeMovements()
    }
  },
}
