import { CheckCircle2, Clock3, QrCode, ScanFace } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Modal } from '../../../components/shared/Modal'
import type { CheckoutPayload, KeyRecord } from '../../../types/domain'
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

  if ([year, month, day, hours, minutes].some((part) => Number.isNaN(part))) {
    return null
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0)
}

const getDefaultExpectedReturnAt = (reference = new Date()) => {
  for (const hour of standardReturnHours) {
    const candidate = new Date(reference)
    candidate.setHours(hour, 0, 0, 0)

    if (reference <= candidate) {
      return toDateTimeLocalValue(candidate)
    }
  }

  const nextMorning = new Date(reference)
  nextMorning.setDate(nextMorning.getDate() + 1)
  nextMorning.setHours(standardReturnHours[0], 0, 0, 0)
  return toDateTimeLocalValue(nextMorning)
}

export const CheckoutModal = ({ currentUserId, availableKeys, keyRecord = null, onClose, onSubmit }: CheckoutModalProps) => {
  const autoOpenedCameraForKeyRef = useRef<string | null>(null)
  const [resolvedKey, setResolvedKey] = useState<KeyRecord | null>(keyRecord)
  const [actorEnrollment, setActorEnrollment] = useState('')
  const [expectedReturnAt, setExpectedReturnAt] = useState(() => getDefaultExpectedReturnAt())
  const [notes, setNotes] = useState('')
  const [photoDataUrl, setPhotoDataUrl] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const previewLabel = useMemo(() => expectedReturnAt || 'Sem prazo definido', [expectedReturnAt])
  const modalTitle = resolvedKey ? `Retirada da chave ${resolvedKey.label}` : 'Registrar retirada por QR code'
  const isQrStepComplete = Boolean(resolvedKey)
  const isPhotoStepComplete = Boolean(photoDataUrl)
  const isDetailsStepComplete = actorEnrollment.trim().length > 0
  const selectedReturnDate = useMemo(() => parseDateTimeLocalValue(expectedReturnAt), [expectedReturnAt])

  const applyStandardReturnHour = (hour: (typeof standardReturnHours)[number]) => {
    const baseDate = selectedReturnDate ?? new Date()
    const nextValue = new Date(baseDate)
    nextValue.setHours(hour, 0, 0, 0)
    setExpectedReturnAt(toDateTimeLocalValue(nextValue))
  }

  useEffect(() => {
    if (!resolvedKey || photoDataUrl || showCamera) {
      return
    }

    if (autoOpenedCameraForKeyRef.current === resolvedKey.id) {
      return
    }

    autoOpenedCameraForKeyRef.current = resolvedKey.id
    setShowCamera(true)
  }, [photoDataUrl, resolvedKey, showCamera])

  useEffect(() => {
    if (!photoDataUrl) {
      setShowDetailsDialog(false)
      return
    }

    setShowDetailsDialog(true)
  }, [photoDataUrl])

  const handleResolveQrCode = (qrCodeId: string) => {
    const matchedKey = availableKeys.find((item) => normalizeQrCode(item.qrCodeId) === normalizeQrCode(qrCodeId))

    if (!matchedKey) {
      setError('Nenhuma chave correspondente a este QR code foi encontrada na unidade ativa.')
      return
    }

    if (matchedKey.statusCurrent !== 'available') {
      setError(`A chave ${matchedKey.label} não está disponível para retirada no momento.`)
      return
    }

    setResolvedKey(matchedKey)
    setPhotoDataUrl('')
    setExpectedReturnAt(getDefaultExpectedReturnAt())
    setActorEnrollment('')
    setNotes('')
    setError('')
    autoOpenedCameraForKeyRef.current = null
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedEnrollment = actorEnrollment.trim()

    if (!resolvedKey) {
      setError('Leia o QR code da chave antes de continuar ou abra a retirada a partir de uma sala disponível.')
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

  return (
    <>
      <Modal title={modalTitle} onClose={onClose}>
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className={`rounded-[1.25rem] border px-4 py-3 text-sm ${isQrStepComplete ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-brand-teal/25 bg-brand-teal/10 text-brand-ink'}`}>
              <div className="flex items-center gap-2">
                {isQrStepComplete ? <CheckCircle2 className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
                <span>1. Ler QR da chave</span>
              </div>
            </div>
            <div className={`rounded-[1.25rem] border px-4 py-3 text-sm ${isPhotoStepComplete ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : isQrStepComplete ? 'border-brand-teal/25 bg-brand-teal/10 text-brand-ink' : 'border-brand-ink/10 bg-slate-50 text-brand-ink/55'}`}>
              <div className="flex items-center gap-2">
                {isPhotoStepComplete ? <CheckCircle2 className="h-4 w-4" /> : <ScanFace className="h-4 w-4" />}
                <span>2. Capturar foto</span>
              </div>
            </div>
            <div className={`rounded-[1.25rem] border px-4 py-3 text-sm ${isDetailsStepComplete ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : isPhotoStepComplete ? 'border-brand-teal/25 bg-brand-teal/10 text-brand-ink' : 'border-brand-ink/10 bg-slate-50 text-brand-ink/55'}`}>
              <div className="flex items-center gap-2">
                {isDetailsStepComplete ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                <span>3. Informar dados</span>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-brand-ink/10 bg-brand-sand p-4">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-brand-ink">1. Identificação da chave</p>
                <p className="mt-1 text-sm text-brand-ink/65">Primeiro leia o QR code para identificar qual chave será entregue.</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-ink/70">
                <QrCode className="h-4 w-4 text-brand-teal" />
                QR ativo
              </span>
            </div>

            {resolvedKey ? (
              <div className="mb-4 rounded-[1.25rem] border border-brand-ink/10 bg-white p-4 text-sm text-brand-ink/70">
                <p className="text-lg font-semibold text-brand-ink">{resolvedKey.label}</p>
                <p className="mt-1">{resolvedKey.description}</p>
                <p className="mt-2 flex items-center gap-2 text-brand-ink"><QrCode className="h-4 w-4 text-brand-teal" />{resolvedKey.qrCodeId}</p>
                <p className="mt-1">{resolvedKey.location}</p>
              </div>
            ) : null}

            <QrScannerPanel
              onScan={handleResolveQrCode}
              externalError={error && !resolvedKey ? error : ''}
              viewportClassName="aspect-video max-h-[28vh]"
            />
          </div>

          <div className={`rounded-[1.5rem] border p-4 ${isQrStepComplete ? 'border-brand-ink/10 bg-brand-sand' : 'border-brand-ink/10 bg-slate-50/80 opacity-60'}`}>
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-brand-ink">2. Foto obrigatória</p>
                <p className="text-sm text-brand-ink/65">
                  {isQrStepComplete
                    ? photoDataUrl
                      ? 'Foto capturada. Agora os dados da retirada serão solicitados em uma nova janela.'
                      : 'Após ler o QR code, capture a foto do instrutor para abrir a próxima etapa.'
                    : 'Leia o QR code da chave para liberar a foto.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                disabled={!isQrStepComplete}
                className="rounded-full border border-brand-ink/10 px-4 py-2 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal disabled:cursor-not-allowed disabled:opacity-50"
              >
                {photoDataUrl ? 'Refazer foto' : 'Abrir câmera'}
              </button>
            </div>

            {photoDataUrl ? (
              <img
                src={photoDataUrl}
                alt="Prévia do instrutor"
                className="max-h-72 w-full rounded-[1.25rem] object-cover sm:max-h-80"
              />
            ) : (
              <p className="rounded-[1.25rem] border border-dashed border-brand-ink/15 px-4 py-10 text-center text-sm text-brand-ink/55">
                {isQrStepComplete ? 'Nenhuma foto capturada.' : 'A captura será liberada depois da leitura do QR code.'}
              </p>
            )}
          </div>

          {error && resolvedKey ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

          <div className="sticky bottom-0 flex flex-wrap gap-3 border-t border-brand-ink/10 bg-white pt-4">
            <button
              type="button"
              onClick={() => setShowDetailsDialog(true)}
              disabled={!isPhotoStepComplete}
              className="rounded-full bg-brand-teal px-5 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Continuar com dados da retirada
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-brand-ink/10 px-5 py-3 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      {showCamera ? (
        <CapturePhotoDialog
          onClose={() => setShowCamera(false)}
          onCapture={(photo) => {
            setPhotoDataUrl(photo)
            setShowCamera(false)
          }}
        />
      ) : null}

      {showDetailsDialog && resolvedKey ? (
        <Modal title={`Dados da retirada ${resolvedKey.label}`} onClose={() => setShowDetailsDialog(false)}>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="rounded-[1.5rem] border border-brand-ink/10 bg-brand-sand p-4 text-sm text-brand-ink/75">
              <p className="font-medium text-brand-ink">3. Informações finais da retirada</p>
              <p className="mt-2">Confirme a matrícula, ajuste a previsão de devolução se necessário e mantenha observações relevantes do uso da chave.</p>
            </div>

            <div className="rounded-[1.5rem] border border-brand-ink/10 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-brand-ink">Foto do instrutor</p>
                  <p className="text-sm text-brand-ink/65">Se necessário, a foto pode ser refeita antes de concluir.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailsDialog(false)
                    setShowCamera(true)
                  }}
                  className="rounded-full border border-brand-ink/10 px-4 py-2 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
                >
                  Refazer foto
                </button>
              </div>

              <img
                src={photoDataUrl}
                alt="Prévia do instrutor"
                className="max-h-72 w-full rounded-[1.25rem] object-cover sm:max-h-80"
              />
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-brand-ink">Matrícula do instrutor</span>
              <input
                value={actorEnrollment}
                onChange={(event) => setActorEnrollment(event.target.value)}
                className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
                placeholder="Ex.: 2026001234"
                required
              />
            </label>

            <div className="space-y-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-brand-ink">Previsão de devolução</span>
                <input
                  type="datetime-local"
                  value={expectedReturnAt}
                  onChange={(event) => setExpectedReturnAt(event.target.value)}
                  className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
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
                      className={`rounded-full px-4 py-2 text-sm transition ${isActive ? 'bg-brand-teal text-white' : 'border border-brand-ink/10 bg-white text-brand-ink'}`}
                    >
                      {padTimePart(hour)}:00
                    </button>
                  )
                })}
              </div>

              <p className="text-sm text-brand-ink/60">
                Sugestões padrão de devolução: 12:00h, 17:00h e 22:00h. Se necessário, o instrutor pode escolher outro horário no campo acima.
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-brand-ink">Observações</span>
              <textarea
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
                placeholder="Laboratório, turma ou detalhe adicional"
              />
            </label>

            {error && isQrStepComplete ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

            <div className="sticky bottom-0 flex flex-wrap gap-3 border-t border-brand-ink/10 bg-white pt-4">
              <button
                type="submit"
                disabled={isSubmitting || !isQrStepComplete || !isPhotoStepComplete || !isDetailsStepComplete}
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
      ) : null}
    </>
  )
}