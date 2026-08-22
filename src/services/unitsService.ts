import { addDoc, collection, getDocs, orderBy, query } from 'firebase/firestore'

import { db } from '../lib/firebase/client'
import type { Unit } from '../types/domain'

type FirestoreUnitData = Partial<Unit>

const toUnit = (id: string, data: FirestoreUnitData): Unit => ({
  id,
  nome: data.nome || '',
  descricao: data.descricao || '',
  createdAt: data.createdAt || '',
  updatedAt: data.updatedAt || '',
})

export const unitsService = {
  async getUnits(tenantId: string) {
    if (!db) throw new Error('Firebase não está configurado para carregar as unidades.')

    const unitsRef = query(collection(db, `tenants/${tenantId}/unidades`), orderBy('nome'))
    const snapshot = await getDocs(unitsRef)

    return snapshot.docs.map((item) => toUnit(item.id, item.data() as FirestoreUnitData))
  },

  async addUnit(tenantId: string, payload: { nome: string; descricao: string }) {
    if (!db) throw new Error('Firebase não está configurado para salvar a unidade.')

    const unitsRef = collection(db, `tenants/${tenantId}/unidades`)
    const createdAt = new Date().toISOString()
    const data = { ...payload, createdAt, updatedAt: createdAt }

    const document = await addDoc(unitsRef, data)

    return {
      id: document.id,
      ...data,
    } satisfies Unit
  },
}
