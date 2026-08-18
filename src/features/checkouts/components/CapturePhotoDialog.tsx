import { RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import * as faceapi from '@vladmandic/face-api'

import { Modal } from '../../../components/shared/Modal'
import { loadFaceModels, recognizeFace } from '../../../services/faceValidationService'
import type { Instructor } from '../../../types/domain'

interface CapturePhotoDialogProps {
  onClose: () => void
  onCapture: (photoDataUrl: string, recognizedInstructor?: Instructor) => void | Promise<void>
  tenantId?: string
  title?: string
  helperText?: string
}

export const CapturePhotoDialog = ({
  onClose,
  onCapture,
  tenantId,
  title = 'Identificação Biométrica',
  //helperText = 'Aguarde o carregamento das redes neurais.',
}: CapturePhotoDialogProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  
  const isScanningRef = useRef(false)
  const [error, setError] = useState('')
  const [cameraState, setCameraState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [modelsReady, setModelsReady] = useState(false)
  const [cameraSessionKey, setCameraSessionKey] = useState(0)

  const isAutoScanEnabled = Boolean(tenantId)

  useEffect(() => {
    loadFaceModels()
      .then(() => setModelsReady(true))
      .catch(() => setError('Erro ao carregar arquivos da Inteligência Artificial.'))
  }, [])

  useEffect(() => {
    let cancelled = false
    const stopStream = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
    }

    const startCamera = async () => {
      setCameraState('loading')
      setError('')
      stopStream()

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('error')
        setError('Navegador sem suporte à câmera.')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
          audio: false 
        })
        if (cancelled) return stopStream()
        
        streamRef.current = stream
        if (!videoRef.current) return stopStream()
        
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play()
            if (!cancelled) setCameraState('ready')
          } catch {
            setCameraState('error')
            setError('Falha ao reproduzir o vídeo da câmera.')
          }
        }
      } catch {
        setCameraState('error')
        setError('Permissão da câmera negada.')
      }
    }
    void startCamera()
    return () => { cancelled = true; stopStream() }
  }, [cameraSessionKey])

  const captureFrameBase64 = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) return null
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.95)
  }

  useEffect(() => {
    if (!modelsReady || cameraState !== 'ready') return

    const stopStream = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    const scanInterval = window.setInterval(async () => {
      if (isScanningRef.current || !videoRef.current || !canvasRef.current) return
      isScanningRef.current = true

      try {
        const video = videoRef.current
        const canvas = canvasRef.current
        
        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor()

        const displaySize = { width: video.videoWidth, height: video.videoHeight }
        faceapi.matchDimensions(canvas, displaySize)

        if (detection) {
          const resizedDetections = faceapi.resizeResults(detection, displaySize)
          const context = canvas.getContext('2d')
          context?.clearRect(0, 0, canvas.width, canvas.height)
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)

          if (isAutoScanEnabled && tenantId) {
            const recognizedInstructor = await recognizeFace(detection.descriptor, tenantId)
            
            if (recognizedInstructor) {
              window.clearInterval(scanInterval)
              
              // CORREÇÃO: Tira a foto PRIMEIRO
              const frame = captureFrameBase64()
              
              // DEPOIS desliga o vídeo
              stopStream()
              
              if (frame) await onCapture(frame, recognizedInstructor)
            }
          }
        } else {
          canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
        }
      } catch (e) {
        console.error(e)
      } finally {
        isScanningRef.current = false
      }
    }, 150)

    return () => window.clearInterval(scanInterval)
  }, [cameraState, modelsReady, isAutoScanEnabled, onCapture, tenantId])

  return (
    <Modal title={title} onClose={onClose}>
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

          <canvas
            ref={canvasRef}
            className="absolute inset-0 z-10 aspect-video max-h-[60vh] w-full object-cover"
          />

          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 px-6">
            <div className="relative flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
              <div className="absolute inset-0 rounded-[4rem] shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]" />
            </div>

            {cameraState === 'ready' && modelsReady ? (
              <p className="animate-pulse rounded-full bg-brand-teal px-5 py-2 text-center text-sm font-semibold text-white shadow-lg">
                {isAutoScanEnabled ? 'Escaneando biometria...' : 'Posicione-se no centro'}
              </p>
            ) : null}
          </div>

          {cameraState !== 'ready' || !modelsReady ? (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-brand-ink/80 px-6 text-center text-sm text-white/80">
              {!modelsReady ? 'Carregando Redes Neurais de Biometria (Aguarde)...' : 'Ligando câmera...'}
            </div>
          ) : null}
        </div>

        {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

        {cameraState === 'error' && (
          <button
            type="button"
            onClick={() => setCameraSessionKey((c) => c + 1)}
            className="w-full inline-flex justify-center items-center gap-2 rounded-full border border-brand-ink/10 px-5 py-3 text-sm text-brand-ink transition hover:border-brand-teal"
          >
            <RefreshCw className="h-4 w-4" /> Tentar ligar câmera
          </button>
        )}

        {!isAutoScanEnabled && cameraState === 'ready' && modelsReady && (
          <button
            type="button"
            onClick={() => {
              const frame = captureFrameBase64()
              if (frame) void onCapture(frame)
            }}
            className="w-full rounded-full bg-brand-teal px-5 py-3 font-semibold text-white transition hover:bg-teal-700"
          >
            Capturar Foto e Extrair Biometria
          </button>
        )}
      </div>
    </Modal>
  )
}