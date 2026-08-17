import { Badge, CheckCircle2, ChevronRight, LoaderCircle, QrCode, ScanFace, ScanLine } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Modal } from '../../../components/shared/Modal'
import { badgeOcrService } from '../../../services/badgeOcrService'
import { faceValidationService } from '../../../services/faceValidationService'
import type { CheckoutPayload, KeyRecord } from '../../../types/domain'
import { buildCheckoutActorName } from '../../../utils/checkoutActor'
import { CapturePhotoDialog } from './CapturePhotoDialog'
import { ScanKeyQrDialog } from './ScanKeyQrDialog'

interface CheckoutModalProps {
  currentUserId: string
  availableKeys: KeyRecord[]
  keyRecord?: KeyRecord | null
  onClose: () => void
  onSubmit: (payload: CheckoutPayload) => Promise<void>
}

const normalizeQrCode = (value: string) => value.trim().toUpperCase()

const checkoutSteps = [
  '1. Ler QR da sala',
  '2. Capturar foto facial',
  '3. Preencher matrícula',
  '4. Confirmar retirada',
] as const

export const CheckoutModal = ({ currentUserId, availableKeys, keyRecord = null, onClose, onSubmit }: CheckoutModalProps) => {
  const autoOpenedFaceCaptureForKeyRef = useRef<string | null>(null)
  const [resolvedKey, setResolvedKey] = useState<KeyRecord | null>(keyRecord)
  const [actorEnrollment, setActorEnrollment] = useState('')
  const [expectedReturnAt, setExpectedReturnAt] = useState('')
  const [notes, setNotes] = useState('')
  const [photoDataUrl, setPhotoDataUrl] = useState('')
  const [badgePhotoDataUrl, setBadgePhotoDataUrl] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [showBadgeCamera, setShowBadgeCamera] = useState(false)
  const [showQrScanner, setShowQrScanner] = useState(false)
  const [error, setError] = useState('')
  const [faceValidationStatus, setFaceValidationStatus] = useState<'idle' | 'validating' | 'validated' | 'fallback' | 'error'>(
    'idle',
  )
  const [faceValidationMessage, setFaceValidationMessage] = useState('')
  const [badgeReadStatus, setBadgeReadStatus] = useState<'idle' | 'reading' | 'success' | 'error'>('idle')
  const [badgeReadMessage, setBadgeReadMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const previewLabel = useMemo(() => expectedReturnAt || 'Sem prazo definido', [expectedReturnAt])
  const modalTitle = resolvedKey ? `Retirada da chave ${resolvedKey.label}` : 'Registrar retirada por QR code'
  const isFaceStepComplete = !!photoDataUrl && (faceValidationStatus === 'validated' || faceValidationStatus === 'fallback')
  const isEnrollmentStepComplete = actorEnrollment.trim().length > 0
  const currentStep = !resolvedKey ? 1 : !isFaceStepComplete ? 2 : !isEnrollmentStepComplete ? 3 : 4

  useEffect(() => {
    if (!resolvedKey || showCamera || showQrScanner || photoDataUrl || faceValidationStatus !== 'idle') {
      return
    }

    if (autoOpenedFaceCaptureForKeyRef.current === resolvedKey.id) {
      return
    }

    autoOpenedFaceCaptureForKeyRef.current = resolvedKey.id
    setShowCamera(true)
  }, [faceValidationStatus, photoDataUrl, resolvedKey, showCamera, showQrScanner])

  const resetInstructorFlow = () => {
    setActorEnrollment('')
    setPhotoDataUrl('')
    setBadgePhotoDataUrl('')
    setFaceValidationStatus('idle')
    setFaceValidationMessage('')
    setBadgeReadStatus('idle')
    setBadgeReadMessage('')
    setShowBadgeCamera(false)
    setShowCamera(false)
  }

  const handleResolveQrCode = (qrCodeId: string) => {
    const matchedKey = availableKeys.find((item) => normalizeQrCode(item.qrCodeId) === normalizeQrCode(qrCodeId))

    if (!matchedKey) {
      setError('Nenhuma chave correspondente a este QR code foi encontrada na unidade ativa.')
      setShowQrScanner(false)
      return
    }

    if (matchedKey.statusCurrent !== 'available') {
      setError(`A chave ${matchedKey.label} não está disponível para retirada no momento.`)
      setShowQrScanner(false)
      return
    }

    resetInstructorFlow()
    setResolvedKey(matchedKey)
    setShowQrScanner(false)
    setError('')
    autoOpenedFaceCaptureForKeyRef.current = null
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedEnrollment = actorEnrollment.trim()

    if (!resolvedKey) {
      setError('Leia o QR code da chave ou selecione uma chave disponível antes de continuar.')
      return
    }

    if (!normalizedEnrollment) {
      setError('Informe a matrícula do instrutor para registrar a retirada.')
      return
    }

    if (!photoDataUrl) {
      setError('Capture a foto do instrutor antes de confirmar a retirada.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      await onSubmit({
        keyId: resolvedKey.id,
        actorName: buildCheckoutActorName(normalizedEnrollment),
        actorEnrollment: normalizedEnrollment,
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

  const handleCaptureBadge = async (photo: string) => {
    setBadgePhotoDataUrl(photo)
    setShowBadgeCamera(false)
    setBadgeReadStatus('reading')
    setBadgeReadMessage('Lendo matrícula no crachá...')
    setError('')

    try {
      const result = await badgeOcrService.extractEnrollmentFromPhoto(photo)
      setActorEnrollment(result.enrollment)
      setBadgeReadStatus('success')
      setBadgeReadMessage(`Matrícula ${result.enrollment} identificada automaticamente.`)
    } catch (ocrError) {
      setBadgeReadStatus('error')
      setBadgeReadMessage(ocrError instanceof Error ? ocrError.message : 'Falha ao ler a matrícula no crachá.')
    }
  }

  const handleCaptureFace = async (photo: string) => {
    setPhotoDataUrl(photo)
    setFaceValidationStatus('validating')
    setFaceValidationMessage('Validando presença facial na foto obrigatória...')
    setError('')

    try {
      const result = await faceValidationService.validateInstructorPhoto(photo)
      setFaceValidationStatus(result.status)
      setFaceValidationMessage(result.message)
      setShowCamera(false)
      setShowBadgeCamera(true)
    } catch (validationError) {
      setPhotoDataUrl('')
      setFaceValidationStatus('error')
      const message = validationError instanceof Error ? validationError.message : 'Falha ao validar o rosto do instrutor na foto.'
      setFaceValidationMessage(message)
      throw validationError instanceof Error ? validationError : new Error(message)
    }
  }

  const getPanelStateClassName = (enabled: boolean) =>
    enabled ? 'border-brand-ink/10 bg-white' : 'border-brand-ink/10 bg-slate-50/80 opacity-60'

  return (
    <>
      <Modal title={modalTitle} onClose={onClose}>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-4">
            {checkoutSteps.map((step, index) => {
              const stepNumber = index + 1
              const isComplete = currentStep > stepNumber
              const isActive = currentStep === stepNumber

              return (
                <div
                  key={step}
                  className={`rounded-[1.25rem] border px-4 py-3 text-sm ${
                    isComplete
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : isActive
                        ? 'border-brand-teal/30 bg-brand-teal/10 text-brand-ink'
                        : 'border-brand-ink/10 bg-slate-50 text-brand-ink/55'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-[11px]">{stepNumber}</span>}
                    <span>{step}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rounded-[1.5rem] border border-brand-ink/10 bg-brand-sand p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-brand-ink">1. Identificação da chave</p>
                {resolvedKey ? (
                  <div className="space-y-1 text-sm text-brand-ink/70">
                    <p className="text-lg font-semibold text-brand-ink">{resolvedKey.label}</p>
                    <p>{resolvedKey.description}</p>
                    <p className="flex items-center gap-2 text-brand-ink"><QrCode className="h-4 w-4 text-brand-teal" />{resolvedKey.qrCodeId}</p>
                    <p>{resolvedKey.location}</p>
                  </div>
                ) : (
                  <div className="space-y-1 text-sm text-brand-ink/70">
                    <p>Use o leitor para identificar automaticamente a sala antes de informar a matrícula.</p>
                    <p>Se preferir, você pode digitar o código do QR manualmente dentro do leitor.</p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowQrScanner(true)}
                className="inline-flex items-center gap-2 rounded-full border border-brand-ink/10 px-4 py-2 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
              >
                <ScanLine className="h-4 w-4" />
                {resolvedKey && !keyRecord ? 'Ler outro QR code' : 'Ler QR code'}
              </button>
            </div>
          </div>

          <div className={`rounded-[1.5rem] border p-4 transition ${getPanelStateClassName(!!resolvedKey)}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2 text-sm text-brand-ink/70">
                <p className="font-medium text-brand-ink">2. Foto facial obrigatória</p>
                <p>Após identificar a sala, capture a foto do instrutor. A validação facial mockada confere se há um único rosto visível no quadro.</p>
              </div>

              <button
                type="button"
                disabled={!resolvedKey}
                onClick={() => setShowCamera(true)}
                className="inline-flex items-center gap-2 rounded-full border border-brand-ink/10 px-4 py-2 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ScanFace className="h-4 w-4" />
                {photoDataUrl ? 'Refazer foto facial' : 'Capturar foto facial'}
              </button>
            </div>

            {faceValidationStatus !== 'idle' ? (
              <div
                className={`mt-4 rounded-[1.25rem] px-4 py-3 text-sm ${
                  faceValidationStatus === 'validated'
                    ? 'bg-emerald-50 text-emerald-700'
                    : faceValidationStatus === 'fallback'
                      ? 'bg-amber-50 text-amber-700'
                      : faceValidationStatus === 'validating'
                        ? 'bg-sky-50 text-sky-700'
                        : 'bg-rose-50 text-rose-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  {faceValidationStatus === 'validating' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ScanFace className="h-4 w-4" />}
                  <span>{faceValidationMessage}</span>
                </div>
              </div>
            ) : null}

            {photoDataUrl ? (
              <img
                src={photoDataUrl}
                alt="Prévia facial do instrutor"
                className="mt-4 max-h-64 w-full rounded-[1.25rem] object-cover"
              />
            ) : null}
          </div>

          <div className={`grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] rounded-[1.5rem] border p-4 transition ${getPanelStateClassName(isFaceStepComplete)}`}>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!isFaceStepComplete}
                  onClick={() => setShowBadgeCamera(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-brand-ink/10 px-4 py-2 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Badge className="h-4 w-4" />
                  {badgePhotoDataUrl ? 'Ler crachá novamente' : 'Ler crachá por foto'}
                </button>
              </div>

              <p className="text-sm text-brand-ink/65">
                Após a foto facial, a leitura do crachá é aberta automaticamente. Se o instrutor estiver sem crachá, digite a matrícula manualmente logo abaixo.
              </p>

              {badgeReadStatus !== 'idle' ? (
                <div
                  className={`rounded-[1.25rem] px-4 py-3 text-sm ${
                    badgeReadStatus === 'success'
                      ? 'bg-emerald-50 text-emerald-700'
                      : badgeReadStatus === 'reading'
                        ? 'bg-sky-50 text-sky-700'
                        : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {badgeReadStatus === 'reading' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Badge className="h-4 w-4" />}
                    <span>{badgeReadMessage}</span>
                  </div>
                </div>
              ) : null}

              {badgePhotoDataUrl ? (
                <img
                  src={badgePhotoDataUrl}
                  alt="Prévia do crachá do instrutor"
                  className="max-h-52 w-full rounded-[1.25rem] border border-brand-ink/10 object-cover"
                />
              ) : null}

              <label className="space-y-2">
                <span className="text-sm font-medium text-brand-ink">Matrícula</span>
                <input
                  value={actorEnrollment}
                  onChange={(event) => setActorEnrollment(event.target.value)}
                  disabled={!isFaceStepComplete}
                  className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal disabled:cursor-not-allowed disabled:bg-slate-50"
                  placeholder="Ex.: 2026001234"
                  required
                />
              </label>
            </div>

            <div className="rounded-[1.5rem] border border-brand-ink/10 bg-white px-4 py-3 text-sm text-brand-ink/70">
              <p className="font-medium text-brand-ink">Leitura da matrícula</p>
              <p className="mt-2">Primeiro o sistema exige a foto facial do instrutor. Em seguida, o leitor do crachá abre automaticamente para preencher a matrícula quando o número for identificado.</p>
              <div className="mt-4 flex items-center gap-2 text-brand-ink/55">
                <ChevronRight className="h-4 w-4" />
                <span>Se o instrutor não estiver com o crachá, a digitação manual continua liberada abaixo do leitor.</span>
              </div>
            </div>
          </div>

          <div className={`space-y-5 rounded-[1.5rem] border p-4 transition ${getPanelStateClassName(isFaceStepComplete && isEnrollmentStepComplete)}`}>
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-brand-ink">4. Previsão de devolução</span>
                <input
                  type="datetime-local"
                  value={expectedReturnAt}
                  disabled={!isFaceStepComplete || !isEnrollmentStepComplete}
                  onChange={(event) => setExpectedReturnAt(event.target.value)}
                  className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </label>

              <div className="rounded-[1.5rem] border border-brand-ink/10 bg-brand-sand px-4 py-3 text-sm text-brand-ink/70">
                <p className="font-medium text-brand-ink">Resumo do fluxo</p>
                <p className="mt-2">Prazo: {previewLabel}</p>
                <p className="mt-2">Foto facial: {isFaceStepComplete ? 'Capturada e validada' : 'Pendente'}</p>
                <p className="mt-2">Matrícula: {actorEnrollment.trim() || 'Pendente'}</p>
              </div>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-brand-ink">Observações</span>
              <textarea
                rows={3}
                value={notes}
                disabled={!isFaceStepComplete || !isEnrollmentStepComplete}
                onChange={(event) => setNotes(event.target.value)}
                className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal disabled:cursor-not-allowed disabled:bg-slate-50"
                placeholder="Laboratório, turma ou detalhe adicional"
              />
            </label>
          </div>

          {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

          <div className="sticky bottom-0 flex flex-wrap gap-3 border-t border-brand-ink/10 bg-white pt-4">
            <button
              type="submit"
              disabled={isSubmitting || !resolvedKey || !isFaceStepComplete || !isEnrollmentStepComplete}
              className="rounded-full bg-brand-teal px-5 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Registrando...' : 'Confirmar retirada'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-brand-ink/10 px-5 py-3 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {showCamera ? (
        <CapturePhotoDialog
          title="Capturar foto facial do instrutor"
          helperText="Posicione apenas o rosto do instrutor no quadro. A validação mockada exige um único rosto visível para liberar a próxima etapa."
          captureLabel="Capturar foto facial"
          uploadLabel="Enviar foto facial"
          onClose={() => setShowCamera(false)}
          onCapture={(photo) => {
            void handleCaptureFace(photo)
          }}
        />
      ) : null}

      {showBadgeCamera ? (
        <CapturePhotoDialog
          title="Ler crachá do instrutor"
          helperText="Posicione o crachá de forma legível, com a matrícula visível e bem iluminada antes de capturar."
          captureLabel="Capturar crachá"
          uploadLabel="Enviar foto do crachá"
          onClose={() => setShowBadgeCamera(false)}
          onCapture={(photo) => {
            void handleCaptureBadge(photo)
          }}
        />
      ) : null}

      {showQrScanner ? (
        <ScanKeyQrDialog
          onClose={() => setShowQrScanner(false)}
          onScan={handleResolveQrCode}
        />
      ) : null}
    </>
  )
}