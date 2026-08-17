import { useState } from 'react'
import { Clock3, QrCode } from 'lucide-react'

import { StatusPill } from '../../../components/shared/StatusPill'
import type { DashboardKey } from '../../../types/domain'
import { formatMovementActor } from '../../../utils/checkoutActor'
import { formatDateTime, formatElapsed, isLate } from '../../../utils/time'

interface KeyCardProps {
  item: DashboardKey
  onCheckout: (item: DashboardKey) => void
  onReturn: (item: DashboardKey) => void
}

const DEMO_INSTRUCTOR_AVATARS: Record<string, string> = {
  'Carlos Souza': 'https://randomuser.me/api/portraits/men/32.jpg',
}

const getInstructorAvatar = (item: DashboardKey) => {
  if (!item.activeMovement) return ''

  return item.activeMovement.capturedPhotoUrl || DEMO_INSTRUCTOR_AVATARS[item.activeMovement.actorName] || ''
}

const getInstructorInitials = (name: string) =>
  name.startsWith('Matrícula ')
    ? 'IN'
    : name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')

export const KeyCard = ({ item, onCheckout, onReturn }: KeyCardProps) => {
  const late = isLate(item.activeMovement?.expectedReturnAt)
  const instructorAvatar = getInstructorAvatar(item)
  const [failedAvatarSrc, setFailedAvatarSrc] = useState<string | null>(null)

  const instructorInitials = item.activeMovement ? getInstructorInitials(item.activeMovement.actorName) : 'IN'
  const shouldRenderImage = Boolean(instructorAvatar) && failedAvatarSrc !== instructorAvatar

  return (
    <article className="rounded-[2rem] border border-brand-ink/10 bg-white p-5 shadow-panel transition hover:-translate-y-1">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.28em] text-brand-ink/45">{item.key.location}</p>
          <h3 className="mt-2 whitespace-nowrap text-[1.12rem] font-semibold leading-tight text-brand-ink sm:text-[1.16rem]">{item.key.label}</h3>
          <p className="mt-1 whitespace-nowrap text-[0.84rem] text-brand-ink/65 sm:text-[0.88rem]">{item.key.description}</p>
        </div>
        <StatusPill status={item.key.statusCurrent} />
      </div>

      <div className="overflow-hidden rounded-[1.5rem] bg-brand-sand text-sm text-brand-ink/75">
        {item.activeMovement ? (
          <div className="grid items-stretch gap-0 grid-cols-[7.4rem_1fr]">
            <div className="self-stretch overflow-hidden border-y border-l border-brand-ink/10 rounded-l-[1.5rem]">
              {shouldRenderImage ? (
                <img
                  src={instructorAvatar}
                  alt={`Foto do instrutor ${item.activeMovement.actorName}`}
                  className="block h-full min-h-[11.25rem] w-full object-cover"
                  onError={() => setFailedAvatarSrc(instructorAvatar)}
                />
              ) : (
                <div className="flex h-full min-h-[11.25rem] w-full items-center justify-center bg-brand-teal text-3xl font-semibold uppercase tracking-[0.16em] text-white">
                  {instructorInitials}
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col justify-center gap-1.5 px-3 py-2.5 pr-5 text-brand-ink sm:px-4 sm:pr-6">
              <p className="flex items-center gap-2 text-[0.92rem] leading-tight"><QrCode className="h-4 w-4 shrink-0 text-brand-teal" />{item.key.qrCodeId}</p>
              <p className="text-[1.05rem] font-semibold leading-tight text-brand-ink">
                {formatMovementActor(item.activeMovement.actorName, item.activeMovement.actorEnrollment)}
              </p>
              <p className="flex items-center gap-2 whitespace-nowrap text-[0.85rem] leading-tight sm:text-[0.88rem]"><Clock3 className="h-4 w-4 shrink-0 text-brand-teal" />Em uso há {formatElapsed(item.activeMovement.checkoutAt)}</p>
              <p className={`whitespace-nowrap pr-2 text-[0.82rem] leading-tight sm:text-[0.85rem] ${late ? 'font-semibold text-brand-red' : 'text-brand-ink'}`}>
                Previsão: {formatDateTime(item.activeMovement.expectedReturnAt)}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            <p className="flex items-center gap-2"><QrCode className="h-4 w-4 text-brand-teal" />{item.key.qrCodeId}</p>
            <p>Pronta para retirada.</p>
          </div>
        )}
      </div>

      <div className="mt-5 flex gap-3">
        {item.key.statusCurrent === 'available' ? (
          <button
            type="button"
            onClick={() => onCheckout(item)}
            className="flex-1 rounded-full bg-brand-teal px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            Registrar retirada
          </button>
        ) : null}

        {item.key.statusCurrent === 'occupied' && item.activeMovement ? (
          <button
            type="button"
            onClick={() => onReturn(item)}
            className="flex-1 rounded-full bg-brand-amber px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            Registrar devolução
          </button>
        ) : null}

        {item.key.statusCurrent === 'maintenance' ? (
          <button
            type="button"
            disabled
            className="flex-1 cursor-not-allowed rounded-full border border-brand-ink/10 px-4 py-3 text-sm text-brand-ink/45"
          >
            Indisponível
          </button>
        ) : null}
      </div>
    </article>
  )
}