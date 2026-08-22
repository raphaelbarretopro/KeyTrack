const requiredFirebaseKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const

const getValue = (key: string) => import.meta.env[key]?.toString().trim() ?? ''

export const env = {
  appName: getValue('VITE_APP_NAME') || 'KeyTrack SENAI',
  ghPagesBase: getValue('VITE_GH_PAGES_BASE') || '/KeyTrack/',
  tenantId: getValue('VITE_TENANT_ID') || 'senai-crti',
  firebase: {
    apiKey: getValue('VITE_FIREBASE_API_KEY'),
    authDomain: getValue('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getValue('VITE_FIREBASE_PROJECT_ID'),
    messagingSenderId: getValue('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getValue('VITE_FIREBASE_APP_ID'),
    measurementId: getValue('VITE_FIREBASE_MEASUREMENT_ID'),
  },
}

export const isFirebaseConfigured = requiredFirebaseKeys.every((key) => getValue(key).length > 0)