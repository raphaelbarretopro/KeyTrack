import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

import { env, isFirebaseConfigured } from '../../config/env'

const app = isFirebaseConfigured ? initializeApp(env.firebase) : null

export const firebaseApp = app
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
