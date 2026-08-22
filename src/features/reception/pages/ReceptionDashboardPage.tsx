import { Maximize2, School2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { AppShell } from '../../../components/shared/AppShell'
import { useAuth } from '../../auth/useAuth'
import { useActiveUnidade } from '../../units/useActiveUnidade'
import { CheckoutModal } from '../../checkouts/components/CheckoutModal'
import { ReturnModal } from '../../checkouts/components/ReturnModal'
import { KeyStatusGrid } from '../../dashboard/components/KeyStatusGrid'
import { keysService } from '../../../services/keysService'
import { movementsService } from '../../../services/movementsService'
import type { CheckoutPayload, DashboardKey } from '../../../types/domain'
import { isLate } from '../../../utils/time'

const filters = [
  { id: 'all', label: 'Todas' },
  { id: 'available', label: 'Disponíveis' },
  { id: 'occupied', label: 'Em uso' },
  { id: 'maintenance', label: 'Manutenção' },
] as const

type FilterId = (typeof filters)[number]['id']

const getOperationalPriority = (item: DashboardKey) => {
  if (item.key.statusCurrent === 'occupied' && isLate(item.activeMovement?.expectedReturnAt)) return 0

  const statusPriority = {
    occupied: 1,
    available: 2,
    maintenance: 3,
  } as const

  return statusPriority[item.key.statusCurrent]
}

export const ReceptionDashboardPage = () => {
  const { user } = useAuth()
  const { unidadeId } = useActiveUnidade()

  const [items, setItems] = useState<DashboardKey[]>([])
  const [filter, setFilter] = useState<FilterId>('all')
  const [selectedCheckout, setSelectedCheckout] = useState<DashboardKey | null>(null)
  const [selectedReturn, setSelectedReturn] = useState<DashboardKey | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const fullscreenRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user || !unidadeId) return undefined
    return keysService.subscribeDashboard(user.tenantId, unidadeId, setItems)
  }, [user, unidadeId])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === fullscreenRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const filteredItems = useMemo(() => {
    const matchingItems = filter === 'all' ? items : items.filter((item) => item.key.statusCurrent === filter)

    return [...matchingItems].sort((firstItem, secondItem) => {
      const priorityDifference = getOperationalPriority(firstItem) - getOperationalPriority(secondItem)
      if (priorityDifference !== 0) return priorityDifference

      return firstItem.key.label.localeCompare(secondItem.key.label, 'pt-BR')
    })
  }, [filter, items])

  const handleCheckout = async (payload: CheckoutPayload) => {
    if (!user) return
    await movementsService.createCheckout(user.tenantId, payload)
  }

  const handleReturn = async (item: DashboardKey, notes: string) => {
    if (!user || !item.activeMovement) return
    await movementsService.returnKey(user.tenantId, {
      keyId: item.key.id,
      movementId: item.activeMovement.id,
      notes,
    })
  }

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await fullscreenRef.current?.requestFullscreen()
      }
    } catch {
      // Navegador pode recusar tela cheia (ex.: fora de um gesto do usuário); ignora silenciosamente.
    }
  }

  return (
    <AppShell hideAdminNav>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-brand-ink">Painel de salas</h2>
          <p className="mt-1 text-sm text-brand-ink/65">Status das salas em tempo real.</p>
        </div>

        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          className="inline-flex items-center gap-2 rounded-full border border-brand-ink/10 bg-white px-4 py-2 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
        >
          <Maximize2 className="h-4 w-4" />
          Tela cheia
        </button>
      </div>

      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                filter === item.id ? 'bg-brand-teal text-white' : 'border border-brand-ink/10 bg-white text-brand-ink'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <div
        ref={fullscreenRef}
        className={isFullscreen ? 'min-h-screen overflow-y-auto bg-brand-sand p-6' : ''}
      >
        {isFullscreen ? (
          <div className="mb-6 flex items-center gap-2">
            <div className="rounded-lg bg-brand-teal p-1.5 text-white">
              <School2 className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold text-brand-ink">KeyTrack SENAI</span>
          </div>
        ) : null}

        <section className="mt-8">
          <KeyStatusGrid
            items={filteredItems}
            onCheckout={(item) => setSelectedCheckout(item)}
            onReturn={(item) => setSelectedReturn(item)}
          />
        </section>
      </div>

      {selectedCheckout && user ? (
        <CheckoutModal
          currentUserId={user.uid}
          availableKeys={items.map((item) => item.key)}
          keyRecord={selectedCheckout.key}
          onClose={() => setSelectedCheckout(null)}
          onSubmit={handleCheckout}
        />
      ) : null}

      {selectedReturn ? (
        <ReturnModal
          item={selectedReturn}
          onClose={() => setSelectedReturn(null)}
          onSubmit={(notes) => handleReturn(selectedReturn, notes)}
        />
      ) : null}
    </AppShell>
  )
}
