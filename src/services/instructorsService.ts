import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore'

import { db } from '../lib/firebase/client'
import type { Instructor } from '../types/domain'

type FirestoreInstructorData = Omit<Instructor, 'id'>

// O BUG ESTAVA AQUI! Nós não estávamos lendo o faceDescriptor de volta do banco.
const toInstructor = (id: string, data: Partial<FirestoreInstructorData>): Instructor => ({
  id,
  name: data.name || '',
  matricula: data.matricula || '',
  photoBase64: data.photoBase64 || '',
  faceDescriptor: data.faceDescriptor || [], // <--- A PEÇA QUE FALTAVA!
})

export const instructorsService = {
  async getInstructors(tenantId: string) {
    if (!db) throw new Error('Firebase não está configurado para carregar os instrutores.')

    const instructorsRef = query(collection(db, `tenants/${tenantId}/instructors`), orderBy('name'))
    const snapshot = await getDocs(instructorsRef)

    return snapshot.docs.map((item) => toInstructor(item.id, item.data() as FirestoreInstructorData))
  },

  async addInstructor(tenantId: string, payload: Omit<Instructor, 'id'>) {
    if (!db) throw new Error('Firebase não está configurado para salvar o instrutor.')

    const instructorsRef = collection(db, `tenants/${tenantId}/instructors`)
    const document = await addDoc(instructorsRef, payload)

    return {
      id: document.id,
      ...payload,
    } satisfies Instructor
  },

  async deleteInstructor(tenantId: string, instructorId: string) {
    if (!db) throw new Error('Firebase não está configurado para remover o instrutor.')

    await deleteDoc(doc(db, `tenants/${tenantId}/instructors/${instructorId}`))
  },
}