import clsx from 'clsx'

import type { KeyStatus } from '../../types/domain'

const labelMap: Record<KeyStatus, string> = {
  available: 'Disponível',
  occupied: 'Em uso',
  maintenance: 'Manutenção',
}

export const StatusPill = ({ status }: { status: KeyStatus }) => (
  <span
    className={clsx(
      'inline-flex shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] sm:text-xs',
      status === 'available' && 'bg-emerald-100 text-emerald-800',
      status === 'occupied' && 'bg-amber-100 text-amber-800',
      status === 'maintenance' && 'bg-rose-100 text-rose-800',
    )}
  >
    {labelMap[status]}
  </span>
)