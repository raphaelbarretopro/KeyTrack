import { AlertTriangle, CheckCircle2, DoorOpen, Loader2, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { AppShell } from '../../../components/shared/AppShell'
import { Modal } from '../../../components/shared/Modal'
import { StatusPill } from '../../../components/shared/StatusPill'
import { useAuth } from '../../auth/useAuth'
import { useActiveUnidade } from '../../units/useActiveUnidade'
import { keysService } from '../../../services/keysService'
import type { DashboardKey, KeyRecord } from '../../../types/domain'
import { generateQrCodeDataUrl } from '../../../utils/qrCode'

const normalizeCode = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')

const slugifyToCode = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const buildUniqueCode = (label: string, existingCodes: Set<string>) => {
  const base = slugifyToCode(label) || 'SALA'

  if (!existingCodes.has(base)) return base

  let suffix = 2
  while (existingCodes.has(`${base}-${suffix}`)) {
    suffix += 1
  }

  return `${base}-${suffix}`
}

interface RoomFormFields {
  label: string
  code: string
  description: string
}

interface NewRoomFormFields {
  label: string
  description: string
}

const emptyNewForm: NewRoomFormFields = { label: '', description: '' }

interface RoomEditModalProps {
  keyRecord: KeyRecord
  onClose: () => void
  onSubmit: (payload: RoomFormFields) => Promise<void>
}

const RoomEditModal = ({ keyRecord, onClose, onSubmit }: RoomEditModalProps) => {
  const [form, setForm] = useState<RoomFormFields>({
    label: keyRecord.label,
    code: keyRecord.code,
    description: keyRecord.description,
  })
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedLabel = form.label.trim()
    const normalizedCode = normalizeCode(form.code)

    if (!normalizedLabel || !normalizedCode) {
      setError('Informe o nome da sala e o código do QR Code.')
      return
    }

    try {
      setIsSaving(true)
      setError('')
      await onSubmit({
        label: normalizedLabel,
        code: normalizedCode,
        description: form.description.trim(),
      })
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Falha ao atualizar a sala.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal title={`Editar ${keyRecord.label}`} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-brand-ink">Nome da sala</span>
          <input
            value={form.label}
            onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
            className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-brand-ink">Código do QR Code</span>
          <input
            value={form.code}
            onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
            className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-brand-ink">Descrição</span>
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
            rows={3}
          />
        </label>

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-brand-ink/10 px-5 py-3 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-teal px-5 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

interface ConfirmDeleteModalProps {
  keyRecord: KeyRecord
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

const ConfirmDeleteModal = ({ keyRecord, isDeleting, onClose, onConfirm }: ConfirmDeleteModalProps) => (
  <Modal title="Excluir sala" onClose={onClose}>
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <p>
          Tem certeza que deseja excluir a sala <strong>{keyRecord.label}</strong>? Essa ação não pode ser desfeita — a
          chave sai do inventário e deixa de aparecer na retirada, devolução e relatórios.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-full border border-brand-ink/10 px-5 py-3 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isDeleting}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-rose-600 px-5 py-3 font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          {isDeleting ? 'Excluindo...' : 'Excluir sala'}
        </button>
      </div>
    </div>
  </Modal>
)

interface CreatedRoomInfo {
  unidadeName: string
  label: string
  description: string
  code: string
  qrDataUrl: string
}

interface RoomCreatedModalProps {
  room: CreatedRoomInfo
  onClose: () => void
}

const RoomCreatedModal = ({ room, onClose }: RoomCreatedModalProps) => (
  <Modal title="Sala cadastrada com sucesso" onClose={onClose}>
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        A sala já está disponível para retirada.
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-[0.16em] text-brand-ink/45">Unidade</dt>
            <dd className="font-medium text-brand-ink">{room.unidadeName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.16em] text-brand-ink/45">Nome da sala</dt>
            <dd className="font-medium text-brand-ink">{room.label}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.16em] text-brand-ink/45">Descrição</dt>
            <dd className="text-brand-ink">{room.description || 'Sem descrição.'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.16em] text-brand-ink/45">Código do QR Code</dt>
            <dd className="font-mono font-medium text-brand-ink">{room.code}</dd>
          </div>
        </dl>

        <div className="flex flex-col items-center gap-2 rounded-2xl border border-brand-ink/10 bg-brand-sand p-3">
          <img src={room.qrDataUrl} alt={`QR Code da sala ${room.label}`} className="h-36 w-36" />
          <a
            href={room.qrDataUrl}
            download={`${room.code}.png`}
            className="text-xs font-medium text-brand-teal hover:underline"
          >
            Baixar PNG
          </a>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-full bg-brand-teal px-5 py-3 font-semibold text-white transition hover:bg-teal-700"
      >
        Concluir
      </button>
    </div>
  </Modal>
)

export const RoomRegistrationPage = () => {
  const { user } = useAuth()
  const tenantId = user?.tenantId ?? ''
  const { unidadeId, unidades } = useActiveUnidade()
  const activeUnidadeName = unidades.find((unidade) => unidade.id === unidadeId)?.nome || 'SENAI CRTI'

  const [items, setItems] = useState<DashboardKey[]>([])
  const [form, setForm] = useState<NewRoomFormFields>(emptyNewForm)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editingKey, setEditingKey] = useState<KeyRecord | null>(null)
  const [deletingKey, setDeletingKey] = useState<KeyRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [listError, setListError] = useState('')
  const [createdRoom, setCreatedRoom] = useState<CreatedRoomInfo | null>(null)

  useEffect(() => {
    if (!tenantId || !unidadeId) return undefined
    return keysService.subscribeDashboard(tenantId, unidadeId, setItems)
  }, [tenantId, unidadeId])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedLabel = form.label.trim()

    if (!tenantId || !unidadeId) {
      setError('Usuário sem unidade ativa para cadastrar salas.')
      return
    }

    if (!normalizedLabel) {
      setError('Informe o nome da sala.')
      return
    }

    try {
      setIsSaving(true)
      setError('')
      const normalizedDescription = form.description.trim()
      const existingCodes = new Set(items.map((item) => item.key.code.toUpperCase()))
      const generatedCode = buildUniqueCode(normalizedLabel, existingCodes)

      await keysService.addKey(tenantId, {
        label: normalizedLabel,
        code: generatedCode,
        location: activeUnidadeName,
        description: normalizedDescription,
        unidadeId,
      })
      const qrDataUrl = await generateQrCodeDataUrl(generatedCode)
      setCreatedRoom({
        unidadeName: activeUnidadeName,
        label: normalizedLabel,
        description: normalizedDescription,
        code: generatedCode,
        qrDataUrl,
      })
      setForm(emptyNewForm)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Falha ao salvar a sala.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = async (keyId: string, payload: RoomFormFields) => {
    if (!tenantId) return
    await keysService.updateKey(tenantId, keyId, { ...payload, location: activeUnidadeName })
  }

  const handleConfirmDelete = async () => {
    if (!tenantId || !deletingKey) return

    try {
      setIsDeleting(true)
      setListError('')
      await keysService.deleteKey(tenantId, deletingKey.id)
      setDeletingKey(null)
    } catch (deleteError) {
      setListError(deleteError instanceof Error ? deleteError.message : 'Falha ao excluir a sala.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AppShell>
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-brand-ink">Cadastro de salas</h2>
        <p className="mt-1 text-sm text-brand-ink/65">
          Cada sala cadastrada aqui é uma chave nova no inventário — as mesmas usadas na retirada e devolução.
        </p>
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="rounded-[1.75rem] border border-brand-ink/10 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-brand-ink">Nova sala</p>
              <p className="mt-1 text-sm text-brand-ink/65">
                Unidade: <strong>{activeUnidadeName}</strong>. O código e o QR Code são gerados automaticamente a
                partir do nome da sala.
              </p>
            </div>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-teal/10 text-brand-teal">
              <DoorOpen className="h-5 w-5" />
            </span>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-brand-ink">Nome da sala</span>
              <input
                value={form.label}
                onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
                placeholder="Ex.: Laboratório 3"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-brand-ink">Descrição</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
                placeholder="Ex.: Bloco B, 2º andar"
                rows={3}
              />
            </label>

            {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-teal px-5 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <DoorOpen className="h-4 w-4" />}
              {isSaving ? 'Salvando sala...' : 'Salvar sala'}
            </button>
          </form>
        </div>

        <div className="rounded-[1.75rem] border border-brand-ink/10 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-medium text-brand-ink">Salas cadastradas</p>
            <span className="rounded-full bg-brand-teal/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
              {items.length} registros
            </span>
          </div>

          {listError ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{listError}</p> : null}

          {items.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {items.map((item) => {
                const isOccupied = item.key.statusCurrent === 'occupied'

                return (
                  <article key={item.key.id} className="rounded-[1.5rem] border border-brand-ink/10 bg-brand-sand p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-brand-ink">{item.key.label}</p>
                        <p className="mt-1 text-sm text-brand-ink/65">{item.key.description || 'Sem descrição.'}</p>
                      </div>
                      <StatusPill status={item.key.statusCurrent} />
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingKey(item.key)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-brand-ink/10 bg-white px-3 py-2 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingKey(item.key)}
                        disabled={isOccupied}
                        title={isOccupied ? 'Chave em uso — aguarde a devolução para excluir.' : undefined}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-rose-200 px-3 py-2 text-sm text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="mt-5 flex min-h-40 items-center justify-center rounded-[1.5rem] border border-dashed border-brand-ink/15 bg-slate-50 text-sm text-brand-ink/55">
              Nenhuma sala cadastrada até o momento.
            </div>
          )}
        </div>
      </section>

      {editingKey ? (
        <RoomEditModal
          keyRecord={editingKey}
          onClose={() => setEditingKey(null)}
          onSubmit={(payload) => handleUpdate(editingKey.id, payload)}
        />
      ) : null}

      {deletingKey ? (
        <ConfirmDeleteModal
          keyRecord={deletingKey}
          isDeleting={isDeleting}
          onClose={() => setDeletingKey(null)}
          onConfirm={() => void handleConfirmDelete()}
        />
      ) : null}

      {createdRoom ? <RoomCreatedModal room={createdRoom} onClose={() => setCreatedRoom(null)} /> : null}
    </AppShell>
  )
}
