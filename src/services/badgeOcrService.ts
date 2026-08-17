const enrollmentPattern = /\b\d{4,12}\b/g

const normalizeEnrollment = (value: string) => value.replace(/\D/g, '')

const resolveBestEnrollmentCandidate = (text: string) => {
  const matches = text.match(enrollmentPattern) ?? []
  const normalized = matches.map(normalizeEnrollment).filter((value) => value.length >= 4)

  if (!normalized.length) {
    return ''
  }

  return normalized.sort((left, right) => right.length - left.length)[0]
}

export const badgeOcrService = {
  async extractEnrollmentFromPhoto(photoDataUrl: string) {
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('eng')

    try {
      const result = await worker.recognize(photoDataUrl)
      const rawText = result.data.text || ''
      const enrollment = resolveBestEnrollmentCandidate(rawText)

      if (!enrollment) {
        throw new Error('Não foi possível identificar uma matrícula válida na foto do crachá. Tente aproximar mais o número ou preencha manualmente.')
      }

      return {
        enrollment,
        rawText,
      }
    } finally {
      await worker.terminate()
    }
  },
}