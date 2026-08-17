interface FaceValidationResult {
  status: 'validated' | 'fallback'
  message: string
}

const loadImage = (photoDataUrl: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Não foi possível preparar a imagem para validação facial.'))
    image.src = photoDataUrl
  })

export const faceValidationService = {
  async validateInstructorPhoto(photoDataUrl: string): Promise<FaceValidationResult> {
    if (typeof window === 'undefined') {
      return {
        status: 'fallback',
        message: 'Validação facial mockada concluída sem análise do navegador.',
      }
    }

    const BrowserFaceDetector = (window as Window & {
      FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => { detect: (image: CanvasImageSource) => Promise<Array<unknown>> }
    }).FaceDetector as
      | (new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => { detect: (image: CanvasImageSource) => Promise<Array<unknown>> })
      | undefined

    if (!BrowserFaceDetector) {
      return {
        status: 'fallback',
        message: 'Foto obrigatória capturada. O navegador atual não oferece detecção facial nativa, então a validação mockada foi aceita.',
      }
    }

    const image = await loadImage(photoDataUrl)
    const detector = new BrowserFaceDetector({ fastMode: true, maxDetectedFaces: 2 })
    const faces = await detector.detect(image)

    if (!faces.length) {
      throw new Error('Nenhum rosto foi detectado na foto. Refaça a captura com o rosto centralizado e bem iluminado.')
    }

    if (faces.length > 1) {
      throw new Error('Mais de um rosto foi detectado na foto. Capture apenas o instrutor para seguir com a retirada.')
    }

    return {
      status: 'validated',
      message: 'Rosto do instrutor validado com sucesso para a foto obrigatória.',
    }
  },
}