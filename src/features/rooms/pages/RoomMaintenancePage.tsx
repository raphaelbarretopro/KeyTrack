import { Loader2, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'

import { AppShell } from '../../../components/shared/AppShell'
import { StatusPill } from '../../../components/shared/StatusPill'
import { useAuth } from '../../auth/useAuth'
import { useActiveUnidade } from '../../units/useActiveUnidade'
import { keysService } from '../../../services/keysService'
import type { DashboardKey } from '../../../types/domain'

export const RoomMaintenancePage = () => {
  const { user } = useAuth()
  const tenantId = user?.tenantId ?? ''
  const { unidadeId } = useActiveUnidade()

  const [items, setItems] = useState<DashboardKey[]>([])
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState('')

  useEffect(() => {
    if (!tenantId || !unidadeId) return undefined
    return keysService.subscribeDashboard(tenantId, unidadeId, setItems)
  }, [tenantId, unidadeId])

  const handleToggleStatus = async (item: DashboardKey) => {
    if (!tenantId) return

    const nextStatus = item.key.statusCurrent === 'maintenance' ? 'available' : 'maintenance'

    try {
      setUpdatingId(item.key.id)
      setError('')
      await keysService.updateKeyStatus(tenantId, item.key.id, nextStatus)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Falha ao atualizar o status da sala.')
    } finally {
      setUpdatingId('')
    }
  }

  return (
    <AppShell>
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-brand-ink">Manutenção de salas</h2>
        <p className="mt-1 text-sm text-brand-ink/65">
          Marcar uma sala como "Em manutenção" bloqueia a retirada da chave correspondente até voltar para "Disponível".
        </p>
      </div>

      {error ? <p className="mb-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {items.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => {
            const isOccupied = item.key.statusCurrent === 'occupied'

            return (
              <article key={item.key.id} className="rounded-xl border border-brand-ink/10 bg-white p-5 shadow-panel">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[1.1rem] font-semibold leading-tight text-brand-ink">{item.key.label}</h3>
                    <p className="mt-1 text-sm text-brand-ink/65">{item.key.description || 'Sem descrição.'}</p>
                  </div>
                  <StatusPill status={item.key.statusCurrent} />
                </div>

                <button
                  type="button"
                  onClick={() => void handleToggleStatus(item)}
                  disabled={updatingId === item.key.id || isOccupied}
                  title={isOccupied ? 'Chave em uso — aguarde a devolução para alterar o status.' : undefined}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-brand-ink/10 px-4 py-3 text-sm font-semibold text-brand-ink transition hover:border-brand-teal hover:text-brand-teal disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updatingId === item.key.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wrench className="h-4 w-4" />
                  )}
                  {isOccupied
                    ? 'Em uso — indisponível'
                    : item.key.statusCurrent === 'maintenance'
                      ? 'Marcar como disponível'
                      : 'Marcar como em manutenção'}
                </button>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="flex min-h-56 items-center justify-center rounded-[1.5rem] border border-dashed border-brand-ink/15 bg-slate-50 text-sm text-brand-ink/55">
          Nenhuma sala cadastrada até o momento.
        </div>
      )}
    </AppShell>
  )
}
