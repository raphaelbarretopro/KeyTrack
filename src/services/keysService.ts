import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore'

import { db } from '../lib/firebase/client'
import type { DashboardKey, KeyRecord, KeyStatus, MovementRecord } from '../types/domain'

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
  unidadeId: data.unidadeId || '',
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
  subscribeDashboard(tenantId: string, unidadeId: string, callback: (data: DashboardKey[]) => void) {
    if (!db) throw new Error('Firebase não está configurado para carregar as chaves.')

    const keysRef = query(
      collection(db, `tenants/${tenantId}/keys`),
      where('unidadeId', '==', unidadeId),
      orderBy('label'),
    )
    const movementsRef = query(
      collection(db, `tenants/${tenantId}/movements`),
      where('unidadeId', '==', unidadeId),
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

  async getKeyLabels(tenantId: string, unidadeId: string) {
    if (!db) throw new Error('Firebase não está configurado para carregar as chaves.')

    const keysRef = query(collection(db, `tenants/${tenantId}/keys`), where('unidadeId', '==', unidadeId))
    const snapshot = await getDocs(keysRef)

    return snapshot.docs.reduce<Record<string, string>>((labels, item) => {
      const data = item.data() as FirestoreKeyData
      labels[item.id] = data.label || data.name || item.id
      return labels
    }, {})
  },

  async addKey(
    tenantId: string,
    payload: { label: string; code: string; location: string; description: string; unidadeId: string },
  ) {
    if (!db) throw new Error('Firebase não está configurado para salvar a sala.')

    const keysRef = collection(db, `tenants/${tenantId}/keys`)
    const createdAt = new Date().toISOString()

    await addDoc(keysRef, {
      label: payload.label,
      code: payload.code,
      qrCodeId: payload.code,
      location: payload.location,
      description: payload.description,
      unidadeId: payload.unidadeId,
      active: true,
      statusCurrent: 'available' as KeyStatus,
      createdAt,
      updatedAt: createdAt,
    })
  },

  async updateKeyStatus(tenantId: string, keyId: string, status: KeyStatus) {
    if (!db) throw new Error('Firebase não está configurado para atualizar a sala.')

    await updateDoc(doc(db, `tenants/${tenantId}/keys/${keyId}`), {
      statusCurrent: status,
      updatedAt: new Date().toISOString(),
    })
  },

  async updateKey(
    tenantId: string,
    keyId: string,
    payload: { label: string; code: string; location: string; description: string },
  ) {
    if (!db) throw new Error('Firebase não está configurado para atualizar a sala.')

    await updateDoc(doc(db, `tenants/${tenantId}/keys/${keyId}`), {
      label: payload.label,
      code: payload.code,
      qrCodeId: payload.code,
      location: payload.location,
      description: payload.description,
      updatedAt: new Date().toISOString(),
    })
  },

  async deleteKey(tenantId: string, keyId: string) {
    if (!db) throw new Error('Firebase não está configurado para excluir a sala.')

    await deleteDoc(doc(db, `tenants/${tenantId}/keys/${keyId}`))
  },
}
