import { QrCode, ScanLine } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Modal } from '../../../components/shared/Modal'
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

export const CheckoutModal = ({ currentUserId, availableKeys, keyRecord = null, onClose, onSubmit }: CheckoutModalProps) => {
  const [resolvedKey, setResolvedKey] = useState<KeyRecord | null>(keyRecord)
  const [actorEnrollment, setActorEnrollment] = useState('')
  const [expectedReturnAt, setExpectedReturnAt] = useState('')
  const [notes, setNotes] = useState('')
  const [photoDataUrl, setPhotoDataUrl] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [showQrScanner, setShowQrScanner] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const previewLabel = useMemo(() => expectedReturnAt || 'Sem prazo definido', [expectedReturnAt])
  const modalTitle = resolvedKey ? `Retirada da chave ${resolvedKey.label}` : 'Registrar retirada por QR code'

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

    setResolvedKey(matchedKey)
    setShowQrScanner(false)
    setError('')
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

  return (
    <>
      <Modal title={modalTitle} onClose={onClose}>
        <form className="space-y-5" onSubmit={handleSubmit}>
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

          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <label className="space-y-2">
              <span className="text-sm font-medium text-brand-ink">Matrícula</span>
              <input
                value={actorEnrollment}
                onChange={(event) => setActorEnrollment(event.target.value)}
                className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
                placeholder="Ex.: 2026001234"
                required
              />
            </label>

            <div className="rounded-[1.5rem] border border-brand-ink/10 bg-white px-4 py-3 text-sm text-brand-ink/70">
              <p className="font-medium text-brand-ink">2. Vincular por matrícula</p>
              <p className="mt-2">O MVP usa a matrícula como identificador obrigatório do instrutor. O nome pode ser resolvido por integração em uma etapa posterior.</p>
            </div>
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

      {showQrScanner ? (
        <ScanKeyQrDialog
          onClose={() => setShowQrScanner(false)}
          onScan={handleResolveQrCode}
        />
      ) : null}
    </>
  )
}