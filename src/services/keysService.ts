import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'

import { useMockData } from '../config/env'
import { db } from '../lib/firebase/client'
import { mockKeysSeed, mockMovementsSeed } from '../features/keys/data/mockKeys'
import type { DashboardKey, KeyRecord, MovementRecord } from '../types/domain'

let mockKeys = [...mockKeysSeed]
let mockMovements = [...mockMovementsSeed]

const listeners = new Set<(data: DashboardKey[]) => void>()

const keyPresentationById: Record<string, Pick<KeyRecord, 'label' | 'description'>> = {
  'key-lab-ai': {
    label: 'Espaço IA',
    description: 'Espaço de inteligência artificial aplicada',
  },
  'key-lab-redes': {
    label: 'Laboratório Redes',
    description: 'Ambiente de práticas de infraestrutura e conectividade',
  },
  'key-lab-1': {
    label: 'Laboratório Software 01',
    description: 'Ambiente de desenvolvimento de software 01',
  },
  'key-lab-2': {
    label: 'Laboratório Software 02',
    description: 'Ambiente de desenvolvimento de software 02',
  },
  'key-lab-3': {
    label: 'Laboratório Software 03',
    description: 'Ambiente de desenvolvimento de software 03',
  },
  'key-lab-4': {
    label: 'Laboratório Software 04',
    description: 'Ambiente de desenvolvimento de software 04',
  },
  'key-lab-5': {
    label: 'Laboratório Software 05',
    description: 'Ambiente de desenvolvimento de software 05',
  },
  'key-lab-6': {
    label: 'Laboratório Software 06',
    description: 'Ambiente de desenvolvimento de software 06',
  },
  'key-lab-7': {
    label: 'Laboratório Software 07',
    description: 'Ambiente de desenvolvimento de software 07',
  },
  'key-lab-8': {
    label: 'Laboratório Software 08',
    description: 'Ambiente de desenvolvimento de software 08',
  },
}

const normalizeKeyPresentation = (key: KeyRecord): KeyRecord => {
  const normalized = keyPresentationById[key.id]
  return normalized ? { ...key, ...normalized } : key
}

const buildDashboard = (keys: KeyRecord[], movements: MovementRecord[]) =>
  keys.map((key) => ({
    key: normalizeKeyPresentation(key),
    activeMovement: movements.find(
      (movement) =>
        movement.keyId === key.id &&
        movement.action === 'checkout' &&
        !movement.returnedAt,
    ),
  }))

const emitMock = () => {
  const payload = buildDashboard(mockKeys, mockMovements)
  listeners.forEach((listener) => listener(payload))
}

export const keysService = {
  subscribeDashboard(tenantId: string, callback: (data: DashboardKey[]) => void) {
    if (!db || useMockData) {
      listeners.add(callback)
      callback(buildDashboard(mockKeys, mockMovements))

      return () => {
        listeners.delete(callback)
      }
    }

    const keysRef = query(collection(db, `tenants/${tenantId}/keys`), orderBy('label'))
    const movementsRef = query(
      collection(db, `tenants/${tenantId}/movements`),
      orderBy('createdAt', 'desc'),
    )

    let currentKeys: KeyRecord[] = []
    let currentMovements: MovementRecord[] = []

    const unsubscribeKeys = onSnapshot(keysRef, (snapshot) => {
      currentKeys = snapshot.docs.map(
        (item) => ({ id: item.id, ...item.data() }) as KeyRecord,
      )
      callback(buildDashboard(currentKeys, currentMovements))
    })

    const unsubscribeMovements = onSnapshot(movementsRef, (snapshot) => {
      currentMovements = snapshot.docs.map(
        (item) => ({ id: item.id, ...item.data() }) as MovementRecord,
      )
      callback(buildDashboard(currentKeys, currentMovements))
    })

    return () => {
      unsubscribeKeys()
      unsubscribeMovements()
    }
  },
}

export const applyMockCheckout = (movement: MovementRecord) => {
  mockMovements = [movement, ...mockMovements]
  mockKeys = mockKeys.map((key) =>
    key.id === movement.keyId
      ? {
          ...key,
          statusCurrent: 'occupied',
          lastMovementId: movement.id,
          updatedAt: movement.createdAt,
        }
      : key,
  )

  emitMock()
}

export const applyMockReturn = (movementId: string, returnedAt: string, notes?: string) => {
  const returnedMovement = mockMovements.find((movement) => movement.id === movementId)
  if (!returnedMovement) return

  mockMovements = mockMovements.map((movement) =>
    movement.id === movementId ? { ...movement, returnedAt, notes: notes || movement.notes } : movement,
  )

  mockKeys = mockKeys.map((key) =>
    key.id === returnedMovement.keyId
      ? {
          ...key,
          statusCurrent: 'available',
          lastMovementId: movementId,
          updatedAt: returnedAt,
        }
      : key,
  )

  emitMock()
}