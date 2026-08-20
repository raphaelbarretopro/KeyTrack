import jsQR from 'jsqr'
import { Power, RefreshCw, ScanLine } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface QrScannerPanelProps {
  onScan: (qrCodeId: string) => void
  externalError?: string
  viewportClassName?: string
  frameClassName?: string
}

const normalizeQrCode = (value: string) => value.trim().toUpperCase()

export const QrScannerPanel = ({
  onScan,
  externalError = '',
  viewportClassName = 'aspect-video max-h-[34vh]',
  frameClassName = 'w-full',
}: QrScannerPanelProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [error, setError] = useState('')
  const [cameraState, setCameraState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [cameraSessionKey, setCameraSessionKey] = useState(0)
  const [cameraDiagnostics, setCameraDiagnostics] = useState('')
  const [isScannerEnabled, setIsScannerEnabled] = useState(false)

  const getCameraErrorMessage = (mediaError: unknown) => {
    if (!(mediaError instanceof DOMException)) {
      return 'Não foi possível acessar a câmera para ler o QR code.'
    }

    if (mediaError.name === 'NotAllowedError') {
      return 'Permissão da câmera negada. Verifique a permissão do navegador e recarregue a página.'
    }

    if (mediaError.name === 'NotFoundError' || mediaError.message.includes('Requested device not found')) {
      return 'A câmera preferida não foi encontrada. Tente novamente para usar a câmera padrão do dispositivo.'
    }

    return `Não foi possível acessar a câmera para ler o QR code. ${mediaError.message ? `Detalhe: ${mediaError.message}` : ''}`.trim()
  }

  const requestCameraStream = async () => {
    const preferredConstraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    }

    try {
      return await navigator.mediaDevices.getUserMedia(preferredConstraints)
    } catch (preferredError) {
      if (!(preferredError instanceof DOMException)) {
        throw preferredError
      }

      if (preferredError.name !== 'NotFoundError' && !preferredError.message.includes('Requested device not found')) {
        throw preferredError
      }

      return navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    }
  }

  const stopScanner = () => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }

    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  useEffect(() => {
    let cancelled = false

    if (!isScannerEnabled) {
      stopScanner()
      return undefined
    }

    const scanFrame = () => {
      if (cancelled) return

      const video = videoRef.current
      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
        frameRef.current = requestAnimationFrame(scanFrame)
        return
      }

      const canvas = canvasRef.current ?? document.createElement('canvas')
      canvasRef.current = canvas
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) {
        setCameraState('error')
        setError('Não foi possível inicializar a leitura do QR code nesta sessão.')
        return
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const image = context.getImageData(0, 0, canvas.width, canvas.height)
      const result = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })

      if (result?.data) {
        stopScanner()
        setCameraState('idle')
        setCameraDiagnostics('')
        setIsScannerEnabled(false)
        onScan(normalizeQrCode(result.data))
        return
      }

      frameRef.current = requestAnimationFrame(scanFrame)
    }

    const startCamera = async () => {
      setCameraState('loading')
      setError('')
      setCameraDiagnostics('')
      stopScanner()

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('error')
        setError('Este navegador não oferece suporte ao leitor de câmera para QR code.')
        return
      }

      try {
        const stream = await requestCameraStream()

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
        ].filter(Boolean)

        setCameraDiagnostics(detailParts.join(' • '))

        if (!videoRef.current) {
          setCameraState('error')
          setError('Elemento de vídeo não encontrado para o leitor de QR code.')
          stopScanner()
          return
        }

        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play()
            if (!cancelled) {
              setCameraState('ready')
              scanFrame()
            }
          } catch (playError) {
            setCameraState('error')
            setError(
              `A câmera foi autorizada, mas a leitura do vídeo falhou. ${playError instanceof Error ? `Detalhe: ${playError.message}` : ''}`,
            )
          }
        }
      } catch (mediaError) {
        setCameraState('error')
        setError(getCameraErrorMessage(mediaError))
      }
    }

    void startCamera()

    return () => {
      cancelled = true
      stopScanner()
    }
  }, [cameraSessionKey, isScannerEnabled, onScan])

  const handleEnableScanner = () => {
    setError('')
    setCameraSessionKey((current) => current + 1)
    setIsScannerEnabled(true)
  }

  const handleDisableScanner = () => {
    stopScanner()
    setIsScannerEnabled(false)
    setCameraState('idle')
    setCameraDiagnostics('')
  }

  const displayError = error || externalError

  return (
    <div className="space-y-5">
      <div className={`relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-black ${frameClassName}`}>
        {isScannerEnabled ? (
          <video
            key={cameraSessionKey}
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`${viewportClassName} w-full bg-black object-cover`}
          />
        ) : (
          <div className={`${viewportClassName} w-full bg-black`} />
        )}

        {isScannerEnabled ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="h-44 w-full max-w-sm rounded-[2rem] border-2 border-dashed border-white/80 bg-white/5 shadow-[0_0_0_999px_rgba(15,23,42,0.18)]" />
          </div>
        ) : null}

        {!isScannerEnabled ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <button
              type="button"
              onClick={handleEnableScanner}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <ScanLine className="h-4 w-4" />
              Ativar scanner
            </button>
          </div>
        ) : null}

        {isScannerEnabled && cameraState !== 'ready' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-brand-ink/82 px-6 text-center text-sm text-white/80">
            {cameraState === 'loading'
              ? 'Conectando à câmera e iniciando o leitor de QR code...'
              : 'Falha ao carregar o leitor. Revise a permissão da câmera e tente novamente.'}
          </div>
        ) : null}
      </div>

      {isScannerEnabled || cameraDiagnostics ? (
        <div className="rounded-[1.5rem] border border-brand-ink/10 bg-brand-sand p-4 text-sm text-brand-ink/70">
          {isScannerEnabled ? <p className="font-medium text-brand-ink">Aproxime o QR code da chave até ele caber na área demarcada.</p> : null}
          {cameraDiagnostics ? <p className={isScannerEnabled ? 'mt-2 text-brand-ink/55' : 'text-brand-ink/55'}>{cameraDiagnostics}</p> : null}
        </div>
      ) : null}

      {displayError ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{displayError}</p> : null}

      {isScannerEnabled ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleEnableScanner}
            className="inline-flex items-center gap-2 rounded-full border border-brand-ink/10 px-5 py-3 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
          >
            <RefreshCw className="h-4 w-4" />
            Reiniciar leitura
          </button>
          <button
            type="button"
            onClick={handleDisableScanner}
            className="inline-flex items-center gap-2 rounded-full border border-brand-ink/10 px-5 py-3 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
          >
            <Power className="h-4 w-4" />
            Desligar câmera
          </button>
        </div>
      ) : null}

      
    </div>
  )
}