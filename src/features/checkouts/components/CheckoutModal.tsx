import { useState } from 'react'

import { Modal } from '../../../components/shared/Modal'
import type { CheckoutPayload, KeyRecord } from '../../../types/domain'
import { CapturePhotoDialog } from './CapturePhotoDialog'
import { QrScannerPanel } from './QrScannerPanel'

type Step = 'qr' | 'photo' | 'form'

interface CheckoutModalProps {
  currentUserId: string
  keyRecord: KeyRecord
  onClose: () => void
  onSubmit: (payload: CheckoutPayload) => Promise<void>
}

const STEP_LABELS: Record<Step, string> = {
  qr: '1. Leitura do QR code',
  photo: '2. Foto do instrutor',
  form: '3. Dados e confirmação',
}

const STEPS: Step[] = ['qr', 'photo', 'form']

export const CheckoutModal = ({ currentUserId, keyRecord, onClose, onSubmit }: CheckoutModalProps) => {
  const [step, setStep] = useState<Step>('qr')
  const [qrError, setQrError] = useState('')
  const [actorName, setActorName] = useState('')
  const [actorEnrollment, setActorEnrollment] = useState('')
  const [expectedReturnAt, setExpectedReturnAt] = useState('')
  const [notes, setNotes] = useState('')
  const [photoDataUrl, setPhotoDataUrl] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleQrScan = (scannedId: string) => {
    if (scannedId !== keyRecord.id) {
      setQrError(`O QR code lido (${scannedId}) não corresponde à chave selecionada (${keyRecord.id}). Tente novamente.`)
      return
    }
    setQrError('')
    setStep('photo')
  }

  const handlePhotoCapture = (photo: string) => {
    setPhotoDataUrl(photo)
    setStep('form')
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await onSubmit({
        keyId: keyRecord.id,
        actorName,
        actorEnrollment,
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
    <Modal title={`Retirada da chave ${keyRecord.label}`} onClose={onClose}>
      <div className="mb-6 flex items-center gap-2 overflow-x-auto">
        {STEPS.map((s, index) => (
          <div key={s} className="flex items-center gap-2">
            {index > 0 ? <span className="text-brand-ink/30">›</span> : null}
            <span
              className={`whitespace-nowrap text-sm font-medium ${
                s === step ? 'text-brand-teal' : STEPS.indexOf(step) > index ? 'text-brand-ink/50 line-through' : 'text-brand-ink/30'
              }`}
            >
              {STEP_LABELS[s]}
            </span>
          </div>
        ))}
      </div>

      {step === 'qr' ? (
        <div className="space-y-5">
          <p className="text-sm text-brand-ink/70">
            Aproxime o QR code fixado na chave <strong>{keyRecord.label}</strong> da câmera para confirmar a identidade física da chave antes de prosseguir.
          </p>
          <QrScannerPanel onScan={handleQrScan} externalError={qrError} />
          <div className="flex flex-wrap gap-3 border-t border-brand-ink/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-brand-ink/10 px-5 py-3 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {step === 'photo' ? (
        <CapturePhotoDialog
          embedded
          onClose={onClose}
          onCapture={handlePhotoCapture}
          onBack={() => setStep('qr')}
        />
      ) : null}

      {step === 'form' ? (
        <form className="space-y-5" onSubmit={(e) => void handleSubmit(e)}>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-brand-ink">Nome do instrutor</span>
              <input
                value={actorName}
                onChange={(event) => setActorName(event.target.value)}
                className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-brand-ink">Matrícula</span>
              <input
                value={actorEnrollment}
                onChange={(event) => setActorEnrollment(event.target.value)}
                className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
                required
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-brand-ink">Previsão de devolução</span>
            <input
              type="datetime-local"
              value={expectedReturnAt}
              onChange={(event) => setExpectedReturnAt(event.target.value)}
              className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
            />
          </label>

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

          <div className="rounded-[1.5rem] border border-brand-ink/10 bg-brand-sand p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-brand-ink">Foto do instrutor</p>
              <button
                type="button"
                onClick={() => setStep('photo')}
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

          {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

          <div className="sticky bottom-0 flex flex-wrap gap-3 border-t border-brand-ink/10 bg-white pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-brand-teal px-5 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Registrando...' : 'Confirmar retirada'}
            </button>
            <button
              type="button"
              onClick={() => setStep('photo')}
              className="rounded-full border border-brand-ink/10 px-5 py-3 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
            >
              Voltar
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
      ) : null}
    </Modal>
  )
}