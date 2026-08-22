import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { AppShell } from '../../../components/shared/AppShell'
import { useAuth } from '../../auth/useAuth'
import { useActiveUnidade } from '../../units/useActiveUnidade'
import { keysService } from '../../../services/keysService'
import { movementsService } from '../../../services/movementsService'
import type { MovementRecord } from '../../../types/domain'
import { formatDateTime } from '../../../utils/time'

const periods = [
  { id: 'day', label: 'Dia' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
  { id: 'year', label: 'Ano' },
] as const

type PeriodId = (typeof periods)[number]['id']

const getRangeForPeriod = (period: PeriodId) => {
  const now = new Date()

  switch (period) {
    case 'week':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now) }
    case 'year':
      return { from: startOfYear(now), to: endOfYear(now) }
    case 'day':
    default:
      return { from: startOfDay(now), to: endOfDay(now) }
  }
}

export const AccessReportsPage = () => {
  const { user } = useAuth()
  const tenantId = user?.tenantId ?? ''
  const { unidadeId } = useActiveUnidade()

  const [period, setPeriod] = useState<PeriodId>('day')
  const [movements, setMovements] = useState<MovementRecord[]>([])
  const [keyLabels, setKeyLabels] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!tenantId || !unidadeId) return

    let active = true

    const loadReport = async () => {
      try {
        setIsLoading(true)
        setError('')

        const { from, to } = getRangeForPeriod(period)
        const [movementResults, labels] = await Promise.all([
          movementsService.queryByDateRange(tenantId, unidadeId, { from: from.toISOString(), to: to.toISOString() }),
          keysService.getKeyLabels(tenantId, unidadeId),
        ])

        if (active) {
          setMovements(movementResults)
          setKeyLabels(labels)
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar o relatório.')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadReport()

    return () => {
      active = false
    }
  }, [tenantId, unidadeId, period])

  return (
    <AppShell>
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-brand-ink">Relatórios de acesso</h2>
        <p className="mt-1 text-sm text-brand-ink/65">Movimentações de chaves filtradas por período.</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {periods.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPeriod(item.id)}
            className={`rounded-full px-4 py-2 text-sm transition ${
              period === item.id ? 'bg-brand-teal text-white' : 'border border-brand-ink/10 bg-white text-brand-ink'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <p className="mb-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <div className="overflow-x-auto rounded-[1.75rem] border border-brand-ink/10 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-brand-sand text-xs uppercase tracking-[0.12em] text-brand-ink/65">
              <th className="whitespace-nowrap px-5 py-3 font-semibold">Chave</th>
              <th className="whitespace-nowrap px-5 py-3 font-semibold">Responsável</th>
              <th className="whitespace-nowrap px-5 py-3 font-semibold">Matrícula</th>
              <th className="whitespace-nowrap px-5 py-3 font-semibold">Retirada</th>
              <th className="whitespace-nowrap px-5 py-3 font-semibold">Devolução</th>
              <th className="whitespace-nowrap px-5 py-3 font-semibold">Observações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-brand-ink/60">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : movements.length ? (
              movements.map((movement) => (
                <tr key={movement.id} className="border-t border-brand-ink/10 text-brand-ink">
                  <td className="px-5 py-3">{keyLabels[movement.keyId] || movement.keyId}</td>
                  <td className="px-5 py-3">{movement.actorName}</td>
                  <td className="px-5 py-3">{movement.actorEnrollment}</td>
                  <td className="px-5 py-3">{formatDateTime(movement.checkoutAt)}</td>
                  <td className="px-5 py-3">{formatDateTime(movement.returnedAt)}</td>
                  <td className="px-5 py-3 text-brand-ink/65">{movement.notes || '--'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-brand-ink/55">
                  Nenhuma movimentação encontrada no período selecionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}
