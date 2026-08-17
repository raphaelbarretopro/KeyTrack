import { useMemo, useState } from 'react'

import { Modal } from '../../../components/shared/Modal'
import type { CheckoutPayload, KeyRecord } from '../../../types/domain'
import { CapturePhotoDialog } from './CapturePhotoDialog'

interface CheckoutModalProps {
  currentUserId: string
  keyRecord: KeyRecord
  onClose: () => void
  onSubmit: (payload: CheckoutPayload) => Promise<void>
}

export const CheckoutModal = ({ currentUserId, keyRecord, onClose, onSubmit }: CheckoutModalProps) => {
  const [actorName, setActorName] = useState('')
  const [actorEnrollment, setActorEnrollment] = useState('')
  const [expectedReturnAt, setExpectedReturnAt] = useState('')
  const [notes, setNotes] = useState('')
  const [photoDataUrl, setPhotoDataUrl] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const previewLabel = useMemo(() => expectedReturnAt || 'Sem prazo definido', [expectedReturnAt])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!photoDataUrl) {
      setError('Capture a foto do instrutor antes de confirmar a retirada.')
      return
    }

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
    <>
      <Modal title={`Retirada da chave ${keyRecord.label}`} onClose={onClose}>
        <form className="space-y-5" onSubmit={handleSubmit}>
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
              <div>
                <p className="text-sm font-medium text-brand-ink">Foto obrigatória</p>
                <p className="text-sm text-brand-ink/65">Prazo: {previewLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                className="rounded-full border border-brand-ink/10 px-4 py-2 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
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
                Nenhuma foto capturada.
              </p>
            )}
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
          onClose={() => setShowCamera(false)}
          onCapture={(photo) => {
            setPhotoDataUrl(photo)
            setShowCamera(false)
          }}
        />
      ) : null}
    </>
  )
}