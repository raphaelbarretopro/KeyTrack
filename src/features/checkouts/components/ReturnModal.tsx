import { useState } from 'react'

import { Modal } from '../../../components/shared/Modal'
import { useAuth } from '../../auth/useAuth'
import type { DashboardKey } from '../../../types/domain'
import { formatMovementActor } from '../../../utils/checkoutActor'
import { formatDateTime } from '../../../utils/time'
import { QrScannerPanel } from './QrScannerPanel'

interface ReturnModalProps {
  item: DashboardKey
  onClose: () => void
  onSubmit: (notes: string) => Promise<void>
}

export const ReturnModal = ({ item, onClose, onSubmit }: ReturnModalProps) => {
  const { user } = useAuth()
  const canTypeCodeManually = user?.role === 'admin' || user?.role === 'super_admin'

  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [qrError, setQrError] = useState('')
  const [isQrCodeConfirmed, setIsQrCodeConfirmed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showManualCode, setShowManualCode] = useState(false)
  const [manualCode, setManualCode] = useState('')

  const handleQrScan = (qrCodeId: string) => {
    if (qrCodeId.trim().toUpperCase() !== item.key.qrCodeId.trim().toUpperCase()) {
      setIsQrCodeConfirmed(false)
      setQrError('O código informado não corresponde à chave desta devolução.')
      return
    }

    setQrError('')
    setIsQrCodeConfirmed(true)
  }

  const handleManualCodeConfirm = () => {
    if (!manualCode.trim()) {
      setQrError('Digite o código do QR Code da chave.')
      return
    }

    handleQrScan(manualCode)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isQrCodeConfirmed) {
      setQrError('Leia o QR code da chave antes de confirmar a devolução.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      await onSubmit(notes)
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao registrar a devolução.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title={`Devolução da chave ${item.key.label}`} onClose={onClose}>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="rounded-[1.5rem] border border-brand-ink/10 bg-brand-sand p-4 text-sm text-brand-ink/75">
          <p><strong>Responsável:</strong> {formatMovementActor(item.activeMovement?.actorName, item.activeMovement?.actorEnrollment)}</p>
          <p><strong>Matrícula:</strong> {item.activeMovement?.actorEnrollment}</p>
          <p><strong>Retirada:</strong> {formatDateTime(item.activeMovement?.checkoutAt)}</p>
        </div>

        <div className="rounded-[1.5rem] border border-brand-ink/10 bg-brand-sand p-4">
          <p className="mb-1 text-sm font-medium text-brand-ink">Leitura obrigatória do QR code</p>
          
          <QrScannerPanel
            onScan={handleQrScan}
            externalError={qrError}
            viewportClassName="aspect-video max-h-[28vh]"
            continueScanningAfterSuccess
            autoStart
          />
          {isQrCodeConfirmed ? (
            <p className="mt-3 text-sm font-medium text-emerald-700">QR code confirmado para esta chave.</p>
          ) : null}

          {canTypeCodeManually ? (
            <div className="mt-3 border-t border-brand-ink/10 pt-3">
              {showManualCode ? (
                <div className="flex flex-wrap gap-2">
                  <input
                    value={manualCode}
                    onChange={(event) => setManualCode(event.target.value)}
                    placeholder={`Ex.: ${item.key.qrCodeId}`}
                    className="min-w-0 flex-1 rounded-2xl border border-brand-ink/10 px-4 py-2.5 text-sm outline-none transition focus:border-brand-teal"
                  />
                  <button
                    type="button"
                    onClick={handleManualCodeConfirm}
                    className="rounded-full bg-brand-ink/10 px-4 py-2.5 text-sm font-medium text-brand-ink transition hover:bg-brand-ink/15"
                  >
                    Confirmar código
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowManualCode(true)}
                  className="text-sm font-medium text-brand-teal underline-offset-2 hover:underline"
                >
                  Digitar o código do QR Code manualmente
                </button>
              )}
            </div>
          ) : null}
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-brand-ink">Observações da devolução</span>
          <textarea
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
            placeholder="Estado da chave, devolução fora do prazo, etc."
          />
        </label>

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting || !isQrCodeConfirmed}
            className="rounded-full bg-brand-teal px-5 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Confirmando...' : 'Confirmar devolução'}
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
  )
}