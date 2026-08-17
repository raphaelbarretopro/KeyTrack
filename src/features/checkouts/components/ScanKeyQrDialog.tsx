import jsQR from 'jsqr'
import { Keyboard, RefreshCw, ScanLine } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Modal } from '../../../components/shared/Modal'

interface ScanKeyQrDialogProps {
  onClose: () => void
  onScan: (qrCodeId: string) => void
}

const normalizeQrCode = (value: string) => value.trim().toUpperCase()

export const ScanKeyQrDialog = ({ onClose, onScan }: ScanKeyQrDialogProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [error, setError] = useState('')
  const [cameraState, setCameraState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [cameraSessionKey, setCameraSessionKey] = useState(0)
  const [cameraDiagnostics, setCameraDiagnostics] = useState('')
  const [manualQrCode, setManualQrCode] = useState('')

  useEffect(() => {
    let cancelled = false

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
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })

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
        setError(
          `Não foi possível acessar a câmera para ler o QR code. ${mediaError instanceof Error ? `Detalhe: ${mediaError.message}` : ''}`,
        )
      }
    }

    void startCamera()

    return () => {
      cancelled = true
      stopScanner()
    }
  }, [cameraSessionKey, onScan])

  const handleRetry = () => {
    setManualQrCode('')
    setError('')
    setCameraState('loading')
    setCameraSessionKey((current) => current + 1)
  }

  const handleManualSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = normalizeQrCode(manualQrCode)

    if (!normalized) {
      setError('Informe o código do QR para localizar a chave.')
      return
    }

    onScan(normalized)
  }

  return (
    <Modal title="Ler QR code da chave" onClose={onClose}>
      <div className="space-y-5">
        <div className="relative overflow-hidden rounded-[1.5rem] border border-brand-ink/10 bg-brand-ink">
          <video
            key={cameraSessionKey}
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="aspect-video max-h-[60vh] w-full bg-black object-cover"
          />

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="h-44 w-full max-w-sm rounded-[2rem] border-2 border-dashed border-white/80 bg-white/5 shadow-[0_0_0_999px_rgba(15,23,42,0.18)]" />
          </div>

          {cameraState !== 'ready' ? (
            <div className="absolute inset-0 flex items-center justify-center bg-brand-ink/82 px-6 text-center text-sm text-white/80">
              {cameraState === 'loading'
                ? 'Conectando à câmera e iniciando o leitor de QR code...'
                : 'Falha ao carregar o leitor. Revise a permissão da câmera e tente novamente.'}
            </div>
          ) : null}
        </div>

        <div className="rounded-[1.5rem] border border-brand-ink/10 bg-brand-sand p-4 text-sm text-brand-ink/70">
          <p className="font-medium text-brand-ink">Aproxime o QR code da chave até ele caber na área demarcada.</p>
          <p className="mt-1">A leitura identifica a sala automaticamente e libera o restante do registro apenas com a matrícula do instrutor.</p>
          {cameraDiagnostics ? <p className="mt-2 text-brand-ink/55">{cameraDiagnostics}</p> : null}
        </div>

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-2 rounded-full border border-brand-ink/10 px-5 py-3 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
          >
            <RefreshCw className="h-4 w-4" />
            Reiniciar leitura
          </button>
        </div>

        <form className="space-y-3 rounded-[1.5rem] border border-brand-ink/10 p-4" onSubmit={handleManualSubmit}>
          <div className="flex items-center gap-2 text-sm font-medium text-brand-ink">
            <Keyboard className="h-4 w-4 text-brand-teal" />
            Inserir QR code manualmente
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={manualQrCode}
              onChange={(event) => setManualQrCode(event.target.value)}
              placeholder="Ex.: QR-CRT-203"
              className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-teal px-5 py-3 font-semibold text-white transition hover:bg-teal-700"
            >
              <ScanLine className="h-4 w-4" />
              Usar código
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}