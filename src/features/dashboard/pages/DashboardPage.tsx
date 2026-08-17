import { AlertTriangle, Building2, KeyRound, QrCode, TimerReset } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { AppShell } from '../../../components/shared/AppShell'
import { useAuth } from '../../auth/useAuth'
import { CheckoutModal } from '../../checkouts/components/CheckoutModal'
import { ReturnModal } from '../../checkouts/components/ReturnModal'
import { KeyStatusGrid } from '../components/KeyStatusGrid'
import { keysService } from '../../../services/keysService'
import { movementsService } from '../../../services/movementsService'
import type { CheckoutPayload, DashboardKey } from '../../../types/domain'

const filters = [
  { id: 'all', label: 'Todas' },
  { id: 'available', label: 'Disponíveis' },
  { id: 'occupied', label: 'Em uso' },
  { id: 'maintenance', label: 'Manutenção' },
] as const

type FilterId = (typeof filters)[number]['id']

export const DashboardPage = () => {
  const { user } = useAuth()
  const [items, setItems] = useState<DashboardKey[]>([])
  const [selectedCheckout, setSelectedCheckout] = useState<DashboardKey | null>(null)
  const [selectedReturn, setSelectedReturn] = useState<DashboardKey | null>(null)
  const [isQrCheckoutOpen, setIsQrCheckoutOpen] = useState(false)
  const [filter, setFilter] = useState<FilterId>('all')

  useEffect(() => {
    if (!user) return undefined

    return keysService.subscribeDashboard(user.tenantId, setItems)
  }, [user])

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items
    return items.filter((item) => item.key.statusCurrent === filter)
  }, [filter, items])

  const stats = useMemo(() => {
    const available = items.filter((item) => item.key.statusCurrent === 'available').length
    const occupied = items.filter((item) => item.key.statusCurrent === 'occupied').length
    const delayed = items.filter(
      (item) => item.activeMovement?.expectedReturnAt && new Date(item.activeMovement.expectedReturnAt) < new Date(),
    ).length

    return {
      total: items.length,
      available,
      occupied,
      delayed,
    }
  }, [items])

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

  return (
    <AppShell>
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[2rem] bg-brand-ink p-8 text-white shadow-panel">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl space-y-4">
              <p className="text-sm uppercase tracking-[0.35em] text-white/60">Recepção {user?.tenantId}</p>
              <h2 className="text-4xl font-semibold">Visão operacional em tempo real das chaves da unidade.</h2>
              <p className="text-white/70">
                Check-out com leitura por QR code, foto obrigatória e trilha pronta para regras multi-tenant no Firebase.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/10 px-5 py-4 text-right backdrop-blur">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Tenant ativo</p>
              <p className="mt-2 text-2xl font-semibold">{user?.tenantId}</p>
              <p className="mt-2 text-sm text-white/65">Perfil {user?.role === 'admin' ? 'Administrador' : 'Recepção'}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-[2rem] bg-white p-6 shadow-panel">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700"><KeyRound className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-brand-ink/65">Chaves disponíveis</p>
                <p className="text-3xl font-semibold text-brand-ink">{stats.available}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-panel">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-700"><Building2 className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-brand-ink/65">Chaves ocupadas</p>
                <p className="text-3xl font-semibold text-brand-ink">{stats.occupied}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-panel">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-rose-100 p-3 text-rose-700"><AlertTriangle className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-brand-ink/65">Atrasos</p>
                <p className="text-3xl font-semibold text-brand-ink">{stats.delayed}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-panel">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-100 p-3 text-sky-700"><TimerReset className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-brand-ink/65">Inventário total</p>
                <p className="text-3xl font-semibold text-brand-ink">{stats.total}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 flex flex-wrap items-center justify-between gap-4">
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

        <button
          type="button"
          onClick={() => {
            setSelectedCheckout(null)
            setIsQrCheckoutOpen(true)
          }}
          className="inline-flex items-center gap-2 rounded-full bg-brand-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <QrCode className="h-4 w-4" />
          Registrar retirada por QR code
        </button>
      </section>

      <section className="mt-8">
        <KeyStatusGrid
          items={filteredItems}
          onCheckout={(item) => {
            setIsQrCheckoutOpen(false)
            setSelectedCheckout(item)
          }}
          onReturn={(item) => setSelectedReturn(item)}
        />
      </section>

      {(selectedCheckout || isQrCheckoutOpen) && user ? (
        <CheckoutModal
          currentUserId={user.uid}
          availableKeys={items.map((item) => item.key)}
          keyRecord={selectedCheckout?.key ?? null}
          onClose={() => {
            setSelectedCheckout(null)
            setIsQrCheckoutOpen(false)
          }}
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