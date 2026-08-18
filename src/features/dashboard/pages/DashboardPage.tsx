import { AlertTriangle, Building2, KeyRound, TimerReset } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { AppShell } from '../../../components/shared/AppShell'
import { useAuth } from '../../auth/useAuth'
import { CheckoutModal } from '../../checkouts/components/CheckoutModal'
import { QrScannerPanel } from '../../checkouts/components/QrScannerPanel'
import { ReturnModal } from '../../checkouts/components/ReturnModal'
import { InstructorsPanel } from '../components/InstructorsPanel'
import { KeyStatusGrid } from '../components/KeyStatusGrid'
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

const mainTabs = [
  { id: 'keys', label: 'Chaves' },
  { id: 'instructors', label: 'Instrutores' },
] as const

type MainTabId = (typeof mainTabs)[number]['id']

const normalizeQrCode = (value: string) => value.trim().toUpperCase()

const getOperationalPriority = (item: DashboardKey) => {
  if (item.key.statusCurrent === 'occupied' && isLate(item.activeMovement?.expectedReturnAt)) return 0

  const statusPriority = {
    occupied: 1,
    available: 2,
    maintenance: 3,
  } as const

  return statusPriority[item.key.statusCurrent]
}

export const DashboardPage = () => {
  const { user } = useAuth()
  const [items, setItems] = useState<DashboardKey[]>([])
  const [selectedCheckout, setSelectedCheckout] = useState<DashboardKey | null>(null)
  const [selectedReturn, setSelectedReturn] = useState<DashboardKey | null>(null)
  const [isQrCheckoutOpen, setIsQrCheckoutOpen] = useState(false)
  const [dashboardQrError, setDashboardQrError] = useState('')
  const [filter, setFilter] = useState<FilterId>('all')
  const [activeTab, setActiveTab] = useState<MainTabId>('keys')

  useEffect(() => {
    if (!user) return undefined

    return keysService.subscribeDashboard(user.tenantId, setItems)
  }, [user])

  const filteredItems = useMemo(() => {
    const matchingItems = filter === 'all'
      ? items
      : items.filter((item) => item.key.statusCurrent === filter)

    return [...matchingItems].sort((firstItem, secondItem) => {
      const priorityDifference = getOperationalPriority(firstItem) - getOperationalPriority(secondItem)
      if (priorityDifference !== 0) return priorityDifference

      return firstItem.key.label.localeCompare(secondItem.key.label, 'pt-BR')
    })
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

  const checkoutPercentage = stats.total ? Math.round((stats.occupied / stats.total) * 100) : 0

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

  const handleDashboardScan = (qrCodeId: string) => {
    const normalizedScannedQrCode = normalizeQrCode(qrCodeId)
    const matchedItem = items.find((item) => normalizeQrCode(item.key.qrCodeId) === normalizedScannedQrCode)

    if (!matchedItem) {
      setDashboardQrError('Nenhuma chave correspondente a este QR code foi encontrada na unidade ativa.')
      return
    }

    if (matchedItem.key.statusCurrent !== 'available') {
      setDashboardQrError(`A chave ${matchedItem.key.label} não está disponível para retirada no momento.`)
      return
    }

    setDashboardQrError('')
    setSelectedCheckout(matchedItem)
    setIsQrCheckoutOpen(false)
  }

  return (
    <AppShell>
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-xl border border-brand-ink/10 bg-white p-4 shadow-panel">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-brand-ink">Leitor de QR-code</h2>
            </div>
          </div>

          <div className="flex flex-col gap-5 text-brand-ink sm:flex-row sm:items-center">
            <QrScannerPanel
              onScan={handleDashboardScan}
              externalError={dashboardQrError}
              viewportClassName="h-full"
              frameClassName="h-40 w-40 shrink-0"
            />
            <div className="min-w-0 flex-1 rounded-lg border border-brand-ink/10 bg-brand-sand p-4">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-sm font-medium text-brand-ink">Chaves retiradas</p>
                <p className="text-2xl font-semibold text-brand-teal">{checkoutPercentage}%</p>
              </div>
              <div
                aria-label={`${checkoutPercentage}% das chaves estão retiradas`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={checkoutPercentage}
                className="mt-4 h-3 overflow-hidden rounded-full bg-brand-ink/10"
                role="progressbar"
              >
                <div className="h-full rounded-full bg-brand-amber transition-[width]" style={{ width: `${checkoutPercentage}%` }} />
              </div>
              <p className="mt-3 text-sm text-brand-ink/65">{stats.occupied} de {stats.total} chaves estão em uso.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white p-4 shadow-panel">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700"><KeyRound className="h-4 w-4" /></div>
              <div className="min-w-0">
                <p className="text-xs text-brand-ink/65">Chaves disponíveis</p>
                <p className="text-2xl font-semibold text-brand-ink">{stats.available}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-panel">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700"><Building2 className="h-4 w-4" /></div>
              <div className="min-w-0">
                <p className="text-xs text-brand-ink/65">Chaves ocupadas</p>
                <p className="text-2xl font-semibold text-brand-ink">{stats.occupied}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-panel">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-rose-100 p-2 text-rose-700"><AlertTriangle className="h-4 w-4" /></div>
              <div className="min-w-0">
                <p className="text-xs text-brand-ink/65">Atrasos</p>
                <p className="text-2xl font-semibold text-brand-ink">{stats.delayed}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-panel">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-sky-100 p-2 text-sky-700"><TimerReset className="h-4 w-4" /></div>
              <div className="min-w-0">
                <p className="text-xs text-brand-ink/65">Inventário total</p>
                <p className="text-2xl font-semibold text-brand-ink">{stats.total}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 border-b border-brand-ink/10">
        <div className="flex flex-wrap gap-6">
          {mainTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-1 pb-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'border-brand-teal text-brand-teal'
                  : 'border-transparent text-brand-ink/60 hover:text-brand-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'keys' ? (
        <>
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
          </section>

          <section className="mt-8">
            <KeyStatusGrid
              items={filteredItems}
              onCheckout={(item) => {
                setIsQrCheckoutOpen(false)
                setDashboardQrError('')
                setSelectedCheckout(item)
              }}
              onReturn={(item) => setSelectedReturn(item)}
            />
          </section>
        </>
      ) : (
        <section className="mt-8">
          <InstructorsPanel />
        </section>
      )}

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