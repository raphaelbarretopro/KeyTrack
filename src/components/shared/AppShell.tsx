import { LogOut, School2 } from 'lucide-react'
import type { PropsWithChildren } from 'react'

import { env } from '../../config/env'
import { useAuth } from '../../features/auth/useAuth'
import { AppNav } from './AppNav'

interface AppShellProps extends PropsWithChildren {
  hideAdminNav?: boolean
}

export const AppShell = ({ children, hideAdminNav = false }: AppShellProps) => {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-brand-sand bg-grid [background-size:22px_22px]">
      <header className="border-b border-brand-ink/10 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-[1760px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-brand-teal p-3 text-white shadow-lg shadow-brand-teal/25">
                <School2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-brand-ink">{env.appName}</h1>
                <p className="text-sm text-brand-ink/65">Gestão de chaves por unidade com painel em tempo real</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-brand-ink">{user?.name}</p>
                <p className="text-xs uppercase tracking-[0.25em] text-brand-ink/60">{user?.tenantId}</p>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="inline-flex items-center gap-2 rounded-full border border-brand-ink/10 px-4 py-2 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>

          <AppNav hideAdminNav={hideAdminNav} />
        </div>
      </header>

      <main className="mx-auto max-w-[1760px] px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}