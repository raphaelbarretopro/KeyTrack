import { KeyCard } from '../../keys/components/KeyCard'
import type { DashboardKey } from '../../../types/domain'

interface KeyStatusGridProps {
  items: DashboardKey[]
  onCheckout: (item: DashboardKey) => void
  onReturn: (item: DashboardKey) => void
}

export const KeyStatusGrid = ({ items, onCheckout, onReturn }: KeyStatusGridProps) => (
  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
    {items.map((item) => (
      <KeyCard key={item.key.id} item={item} onCheckout={onCheckout} onReturn={onReturn} />
    ))}
  </div>
)