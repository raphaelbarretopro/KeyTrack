import { getDownloadURL, ref, uploadString } from 'firebase/storage'

import { useMockData } from '../config/env'
import { storage } from '../lib/firebase/client'

export const storageService = {
  async uploadCheckoutPhoto(tenantId: string, keyId: string, movementId: string, photoDataUrl: string) {
    const storagePath = `tenants/${tenantId}/checkouts/${keyId}/${movementId}.webp`

    if (!storage || useMockData) {
      return {
        path: storagePath,
        url: photoDataUrl,
      }
    }

    const photoRef = ref(storage, storagePath)
    await uploadString(photoRef, photoDataUrl, 'data_url')
    const url = await getDownloadURL(photoRef)

    return {
      path: storagePath,
      url,
    }
  },
}