import { useState } from 'react'

import { Modal } from '../../../components/shared/Modal'
import type { DashboardKey } from '../../../types/domain'
import { formatDateTime } from '../../../utils/time'

interface ReturnModalProps {
  item: DashboardKey
  onClose: () => void
  onSubmit: (notes: string) => Promise<void>
}

export const ReturnModal = ({ item, onClose, onSubmit }: ReturnModalProps) => {
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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
          <p><strong>Instrutor:</strong> {item.activeMovement?.actorName}</p>
          <p><strong>Matrícula:</strong> {item.activeMovement?.actorEnrollment}</p>
          <p><strong>Retirada:</strong> {formatDateTime(item.activeMovement?.checkoutAt)}</p>
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
            disabled={isSubmitting}
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