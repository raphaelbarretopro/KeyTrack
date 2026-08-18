import { Clock3, QrCode, ScanFace } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Modal } from '../../../components/shared/Modal'
import { useAuth } from '../../auth/useAuth'
import type { CheckoutPayload, Instructor, KeyRecord } from '../../../types/domain'
import { buildCheckoutActorName } from '../../../utils/checkoutActor'
import { CapturePhotoDialog } from './CapturePhotoDialog'
import { QrScannerPanel } from './QrScannerPanel'

interface CheckoutModalProps {
  currentUserId: string
  availableKeys: KeyRecord[]
  keyRecord?: KeyRecord | null
  onClose: () => void
  onSubmit: (payload: CheckoutPayload) => Promise<void>
}

const normalizeQrCode = (value: string) => value.trim().toUpperCase()
const standardReturnHours = [12, 17, 22] as const
const padTimePart = (value: number) => value.toString().padStart(2, '0')

const toDateTimeLocalValue = (date: Date) => {
  const year = date.getFullYear()
  const month = padTimePart(date.getMonth() + 1)
  const day = padTimePart(date.getDate())
  const hours = padTimePart(date.getHours())
  const minutes = padTimePart(date.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const parseDateTimeLocalValue = (value: string) => {
  const [datePart, timePart] = value.split('T')
  if (!datePart || !timePart) return null
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  if ([year, month, day, hours, minutes].some((part) => Number.isNaN(part))) return null
  return new Date(year, month - 1, day, hours, minutes, 0, 0)
}

const getDefaultExpectedReturnAt = (reference = new Date()) => {
  for (const hour of standardReturnHours) {
    const candidate = new Date(reference)
    candidate.setHours(hour, 0, 0, 0)
    if (reference <= candidate) return toDateTimeLocalValue(candidate)
  }
  const nextMorning = new Date(reference)
  nextMorning.setDate(nextMorning.getDate() + 1)
  nextMorning.setHours(standardReturnHours[0], 0, 0, 0)
  return toDateTimeLocalValue(nextMorning)
}

export const CheckoutModal = ({ currentUserId, availableKeys, keyRecord = null, onClose, onSubmit }: CheckoutModalProps) => {
  const { user } = useAuth()
  const autoOpenedCameraForKeyRef = useRef<string | null>(null)
  
  const [resolvedKey, setResolvedKey] = useState<KeyRecord | null>(keyRecord)
  const [recognizedInstructor, setRecognizedInstructor] = useState<Instructor | null>(null)
  const [expectedReturnAt, setExpectedReturnAt] = useState(() => getDefaultExpectedReturnAt())
  const [notes, setNotes] = useState('')
  const [photoDataUrl, setPhotoDataUrl] = useState('')
  
  const [showCamera, setShowCamera] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const modalTitle = resolvedKey ? `Retirada da chave ${resolvedKey.label}` : 'Registrar retirada'
  const isQrStepComplete = Boolean(resolvedKey)
  const isPhotoStepComplete = Boolean(photoDataUrl)
  const isDetailsStepComplete = Boolean(recognizedInstructor)
  const selectedReturnDate = useMemo(() => parseDateTimeLocalValue(expectedReturnAt), [expectedReturnAt])

  const applyStandardReturnHour = (hour: (typeof standardReturnHours)[number]) => {
    const baseDate = selectedReturnDate ?? new Date()
    const nextValue = new Date(baseDate)
    nextValue.setHours(hour, 0, 0, 0)
    setExpectedReturnAt(toDateTimeLocalValue(nextValue))
  }

  // Auto-abre a câmera quando a chave é lida
  useEffect(() => {
    if (!resolvedKey || photoDataUrl || showCamera) return
    if (autoOpenedCameraForKeyRef.current === resolvedKey.id) return

    autoOpenedCameraForKeyRef.current = resolvedKey.id
    setShowCamera(true)
  }, [photoDataUrl, resolvedKey, showCamera])

  const handleResolveQrCode = (qrCodeId: string) => {
    const matchedKey = availableKeys.find((item) => normalizeQrCode(item.qrCodeId) === normalizeQrCode(qrCodeId))
    if (!matchedKey) {
      setError('Chave não encontrada.')
      return
    }
    if (matchedKey.statusCurrent !== 'available') {
      setError(`A chave ${matchedKey.label} não está disponível.`)
      return
    }
    setResolvedKey(matchedKey)
    setPhotoDataUrl('')
    setShowDetailsDialog(false)
    setExpectedReturnAt(getDefaultExpectedReturnAt())
    setRecognizedInstructor(null)
    setNotes('')
    setError('')
    autoOpenedCameraForKeyRef.current = null
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!resolvedKey || !recognizedInstructor || !photoDataUrl) {
      setError('Complete todos os passos da biometria antes de confirmar.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      await onSubmit({
        keyId: resolvedKey.id,
        actorName: recognizedInstructor.name || buildCheckoutActorName(recognizedInstructor.matricula),
        actorEnrollment: recognizedInstructor.matricula,
        expectedReturnAt: expectedReturnAt ? new Date(expectedReturnAt).toISOString() : undefined,
        notes,
        photoDataUrl,
        actorUserId: currentUserId,
      })
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao registrar a retirada.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Modal title={modalTitle} onClose={onClose}>
        <div className="space-y-5">
          {/* Timeline */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className={`rounded-[1.25rem] border px-4 py-3 text-sm ${isQrStepComplete ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-brand-teal/25 bg-brand-teal/10 text-brand-ink'}`}>
              <div className="flex items-center gap-2"><QrCode className="h-4 w-4" /><span>1. Ler QR</span></div>
            </div>
            <div className={`rounded-[1.25rem] border px-4 py-3 text-sm ${isPhotoStepComplete ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : isQrStepComplete ? 'border-brand-teal/25 bg-brand-teal/10 text-brand-ink' : 'border-brand-ink/10 bg-slate-50 text-brand-ink/55'}`}>
              <div className="flex items-center gap-2"><ScanFace className="h-4 w-4" /><span>2. Biometria</span></div>
            </div>
            <div className={`rounded-[1.25rem] border px-4 py-3 text-sm ${isDetailsStepComplete ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : isPhotoStepComplete ? 'border-brand-teal/25 bg-brand-teal/10 text-brand-ink' : 'border-brand-ink/10 bg-slate-50 text-brand-ink/55'}`}>
              <div className="flex items-center gap-2"><Clock3 className="h-4 w-4" /><span>3. Confirmar</span></div>
            </div>
          </div>

          {/* Passo 1: QR */}
          <div className="rounded-[1.5rem] border border-brand-ink/10 bg-brand-sand p-4">
            {resolvedKey ? (
              <div className="mb-4 rounded-[1.25rem] border border-brand-ink/10 bg-white p-4 text-sm text-brand-ink/70">
                <p className="text-lg font-semibold text-brand-ink">{resolvedKey.label}</p>
                <p className="mt-1">{resolvedKey.location}</p>
              </div>
            ) : (
              <QrScannerPanel onScan={handleResolveQrCode} externalError={error} viewportClassName="aspect-video max-h-[28vh]" />
            )}
          </div>

          {/* Passo 2: Foto */}
          <div className={`rounded-[1.5rem] border p-4 ${isQrStepComplete ? 'border-brand-ink/10 bg-brand-sand' : 'border-brand-ink/10 bg-slate-50/80 opacity-60'}`}>
            <div className="mb-3 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm font-medium text-brand-ink">2. Escaneamento Facial</p>
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                disabled={!isQrStepComplete}
                className="rounded-full bg-brand-ink text-white px-5 py-2 text-sm font-semibold shadow-md transition hover:bg-black disabled:opacity-50"
              >
                {photoDataUrl ? 'Refazer Biometria' : 'Iniciar Scanner'}
              </button>
            </div>
            {photoDataUrl && (
              <img src={photoDataUrl} alt="Instrutor" className="max-h-48 w-full rounded-[1.25rem] object-cover" />
            )}
          </div>

          <div className="sticky bottom-0 flex justify-end gap-3 border-t border-brand-ink/10 bg-white pt-4">
            <button
              type="button"
              onClick={() => setShowDetailsDialog(true)}
              disabled={!isPhotoStepComplete}
              className="rounded-full bg-brand-teal px-6 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
            >
              Avançar
            </button>
          </div>
        </div>
      </Modal>

      {/* Câmera Invisível/Automática */}
      {showCamera && user && (
        <CapturePhotoDialog
          onClose={() => setShowCamera(false)}
          tenantId={user.tenantId}
          onCapture={(photo, instructor) => {
            // CORREÇÃO AQUI: Em vez de usar o frame tremido da câmera, usa a foto bonita do cadastro!
            const finalPhoto = instructor && instructor.photoBase64 
              ? `data:image/jpeg;base64,${instructor.photoBase64}` 
              : photo;

            setPhotoDataUrl(finalPhoto)
            setRecognizedInstructor(instructor ?? null)
            setShowCamera(false)
            setShowDetailsDialog(true)
          }}
        />
      )}

      {/* Passo 3: Confirmação Final com Dados Preenchidos */}
      {showDetailsDialog && resolvedKey && (
        <Modal title={`Confirmar ${resolvedKey.label}`} onClose={() => setShowDetailsDialog(false)}>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-brand-ink">Nome (Automático)</span>
                <input
                  value={recognizedInstructor?.name ?? ''}
                  readOnly
                  disabled
                  className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-semibold text-emerald-800 outline-none"
                  placeholder="Aguardando IA..."
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-brand-ink">Matrícula (Automático)</span>
                <input
                  value={recognizedInstructor?.matricula ?? ''}
                  readOnly
                  disabled
                  className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-semibold text-emerald-800 outline-none"
                  placeholder="Aguardando IA..."
                />
              </label>
            </div>

            <div className="space-y-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-brand-ink">Previsão de devolução</span>
                <input
                  type="datetime-local"
                  value={expectedReturnAt}
                  onChange={(e) => setExpectedReturnAt(e.target.value)}
                  className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none"
                />
              </label>
              
              <div className="flex flex-wrap gap-2">
                {standardReturnHours.map((hour) => {
                  const isActive = selectedReturnDate?.getHours() === hour && selectedReturnDate?.getMinutes() === 0
                  return (
                    <button 
                      key={hour} 
                      type="button" 
                      onClick={() => applyStandardReturnHour(hour)} 
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        isActive 
                          ? 'bg-brand-teal text-white border border-transparent' 
                          : 'border border-brand-ink/10 bg-white text-brand-ink hover:border-brand-teal hover:text-brand-teal'
                      }`}
                    >
                      {padTimePart(hour)}:00
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-brand-ink">Observações</span>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-2xl border px-4 py-3 outline-none" />
            </label>

            <div className="flex flex-wrap justify-end gap-3 pt-4">
              <button type="submit" disabled={isSubmitting} className="rounded-full bg-brand-teal px-6 py-3 font-semibold text-white transition hover:bg-teal-700">
                {isSubmitting ? 'Registrando...' : 'Finalizar Retirada'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}