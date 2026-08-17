import { Camera, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Modal } from '../../../components/shared/Modal'

interface CapturePhotoDialogProps {
  onClose: () => void
  onCapture: (photoDataUrl: string) => void | Promise<void>
  onBack?: () => void
  embedded?: boolean
  title?: string
  helperText?: string
  captureLabel?: string
  uploadLabel?: string
}

export const CapturePhotoDialog = ({
  onClose,
  onCapture,
  onBack,
  embedded = false,
  title = 'Capturar foto do instrutor',
  helperText = 'Pré-visualização ativa. Posicione o instrutor no quadro antes de capturar.',
  captureLabel = 'Capturar foto',
  uploadLabel = 'Enviar foto do dispositivo',
}: CapturePhotoDialogProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [error, setError] = useState('')
  const [isProcessingCapture, setIsProcessingCapture] = useState(false)
  const [cameraState, setCameraState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [cameraSessionKey, setCameraSessionKey] = useState(0)
  const [cameraDiagnostics, setCameraDiagnostics] = useState('')

  const getMediaErrorMessage = (mediaError: string | DOMException) =>
    typeof mediaError === 'string' ? mediaError : mediaError.message

  const isCanvasMostlyBlack = (canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return false

    const sampleSize = 24
    const sampleCanvas = document.createElement('canvas')
    sampleCanvas.width = sampleSize
    sampleCanvas.height = sampleSize
    const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true })

    if (!sampleContext) return false

    sampleContext.drawImage(canvas, 0, 0, sampleSize, sampleSize)
    const { data } = sampleContext.getImageData(0, 0, sampleSize, sampleSize)

    let totalLuminance = 0
    const pixels = data.length / 4

    for (let index = 0; index < data.length; index += 4) {
      totalLuminance += (data[index] + data[index + 1] + data[index + 2]) / 3
    }

    const averageLuminance = totalLuminance / pixels
    return averageLuminance < 12
  }

  const readFileAsDataUrl = async (file: File) =>
    await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'))
      reader.readAsDataURL(file)
    })

  useEffect(() => {
    let cancelled = false

    const stopStream = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null

      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }

    const startCamera = async () => {
      setCameraState('loading')
      setError('')
      setCameraDiagnostics('')
      stopStream()

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('error')
        setError('Este navegador não oferece suporte ao acesso à câmera via getUserMedia.')
        return
      }

      const attempts: MediaStreamConstraints[] = [
        {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        {
          video: true,
          audio: false,
        },
      ]

      let lastError = ''

      for (const constraints of attempts) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints)

          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop())
            return
          }

          streamRef.current = stream

          const videoTrack = stream.getVideoTracks()[0]
          const settings = videoTrack?.getSettings()
          const detailParts = [
            videoTrack?.label ? `Dispositivo: ${videoTrack.label}` : '',
            settings?.width && settings?.height ? `Resolução: ${settings.width}x${settings.height}` : '',
            typeof settings?.frameRate === 'number' ? `FPS: ${Math.round(settings.frameRate)}` : '',
            videoTrack ? `Track: ${videoTrack.readyState}` : '',
          ].filter(Boolean)

          setCameraDiagnostics(detailParts.join(' • '))

          if (!videoRef.current) {
            setCameraState('error')
            setError('Elemento de vídeo não encontrado para reproduzir a câmera.')
            stopStream()
            return
          }

          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = async () => {
            try {
              await videoRef.current?.play()
              if (!cancelled) {
                setCameraState('ready')
              }
            } catch (playError) {
              setCameraState('error')
              setError(
                `A câmera foi autorizada, mas a reprodução do vídeo falhou. ${playError instanceof Error ? `Detalhe: ${playError.message}` : ''}`,
              )
            }
          }

          return
        } catch (mediaError) {
          lastError = getMediaErrorMessage(mediaError as string | DOMException)
        }
      }

      setCameraState('error')
      setError(
        `Não foi possível acessar a câmera. Verifique a permissão do navegador, recarregue a página para aplicar a permissão e confirme se nenhum outro aplicativo está usando o dispositivo. ${lastError ? `Detalhe: ${lastError}` : ''}`,
      )
    }

    void startCamera()

    return () => {
      cancelled = true
      stopStream()
    }
  }, [cameraSessionKey])

  const handleCapture = async () => {
    if (cameraState !== 'ready') {
      setError('A câmera ainda não está pronta. Aguarde a pré-visualização carregar.')
      return
    }

    const video = videoRef.current

    if (!video || !video.videoWidth || !video.videoHeight) {
      setError('A câmera está conectada, mas não entregou frames válidos para captura.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')
    if (!context) {
      setError('Não foi possível inicializar a área de captura da imagem.')
      return
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    if (isCanvasMostlyBlack(canvas)) {
      setError(
        'A câmera está conectada, mas está entregando um quadro preto ou muito escuro. Isso normalmente indica tampa física, bloqueio do driver ou conflito com outro aplicativo. Use o envio de foto do dispositivo para continuar.',
      )
      return
    }

    const screenshot = canvas.toDataURL('image/webp', 0.92)

    if (!screenshot) {
      setError('Não foi possível capturar a imagem. Verifique a permissão da câmera e tente novamente.')
      return
    }

    setError('')
    setIsProcessingCapture(true)

    try {
      await onCapture(screenshot)
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'Falha ao processar a imagem capturada.')
    } finally {
      setIsProcessingCapture(false)
    }
  }

  const handleRetry = () => {
    setError('')
    setCameraState('loading')
    setCameraSessionKey((current) => current + 1)
  }

  const handleUploadFallback = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setError('')
      setIsProcessingCapture(true)
      const imageDataUrl = await readFileAsDataUrl(file)

      if (!imageDataUrl) {
        throw new Error('Não foi possível converter a imagem selecionada.')
      }

      await onCapture(imageDataUrl)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Falha ao carregar a imagem do dispositivo.')
    } finally {
      setIsProcessingCapture(false)
      event.target.value = ''
    }
  }

  const content = (
    <div className="space-y-5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={(event) => void handleUploadFallback(event)}
        className="hidden"
      />

      <div className="relative overflow-hidden rounded-[1.5rem] border border-brand-ink/10 bg-brand-ink">
        <video
          key={cameraSessionKey}
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="aspect-video max-h-[60vh] w-full bg-black object-cover"
        />

        {cameraState !== 'ready' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-brand-ink/80 px-6 text-center text-sm text-white/80">
            {cameraState === 'loading'
              ? 'Conectando à câmera e aguardando a pré-visualização...'
              : 'Falha ao carregar a câmera. Revise a permissão do navegador e tente novamente.'}
          </div>
        ) : null}
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {cameraState === 'ready' ? (
        <div className="space-y-1 text-sm text-brand-ink/65">
          <p>{helperText}</p>
          {cameraDiagnostics ? <p>{cameraDiagnostics}</p> : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleCapture()}
          disabled={cameraState !== 'ready' || isProcessingCapture}
          className="inline-flex items-center gap-2 rounded-full bg-brand-teal px-5 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Camera className="h-4 w-4" />
          {isProcessingCapture ? 'Processando...' : captureLabel}
        </button>
        <button
          type="button"
          onClick={handleRetry}
          className="inline-flex items-center gap-2 rounded-full border border-brand-ink/10 px-5 py-3 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-full border border-brand-ink/10 px-5 py-3 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
        >
          {uploadLabel}
        </button>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-brand-ink/10 px-5 py-3 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
          >
            Voltar
          </button>
        ) : null}
      </div>
    </div>
  )

  if (embedded) return content

  return (
    <Modal title={title} onClose={onClose}>
      {content}
    </Modal>
  )
}