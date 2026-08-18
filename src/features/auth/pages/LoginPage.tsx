import { KeyRound, ShieldCheck } from 'lucide-react'
import { Navigate } from 'react-router-dom'

import { isFirebaseConfigured } from '../../../config/env'
import { useAuth } from '../useAuth'
import { LoginForm } from '../components/LoginForm'

export const LoginPage = () => {
  const { user } = useAuth()

  if (user && (!user.mfaRequired || user.mfaVerified)) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="grid min-h-screen bg-brand-sand lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative overflow-hidden bg-brand-ink px-8 py-12 text-white sm:px-12 lg:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.45),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(217,119,6,0.35),_transparent_28%)]" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur">
            <KeyRound className="h-4 w-4" />
            KeyTrack SENAI
          </div>

          <div className="max-w-xl space-y-6">
            <p className="text-sm uppercase tracking-[0.35em] text-white/70">SETEP CRTI</p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Controle operacional de chaves com histórico, foto e segregação por unidade.
            </h1>
            <p className="max-w-lg text-lg text-white/75">
              O MVP já nasce preparado para multi-tenant, regras de segurança por unidade e futuro check-in por QR Code.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <ShieldCheck className="mb-4 h-5 w-5 text-emerald-300" />
              <p className="text-sm text-white/80">Login com base pronta para 2FA TOTP e claims de tenant.</p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="text-sm text-white/80">Dashboard em tempo real, check-out com webcam e rastreabilidade por movimentação.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-panel">
          <div className="mb-8 space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-brand-teal">Acesso da unidade</p>
            <h2 className="text-3xl font-semibold text-brand-ink">Entrar no painel</h2>
            <p className="text-sm text-brand-ink/65">
              {isFirebaseConfigured
                ? 'Use suas credenciais Firebase da unidade SENAI.'
                : 'Modo demo ativo até as variáveis do Firebase serem configuradas.'}
            </p>
          </div>

          <LoginForm />
        </div>
      </section>
    </div>
  )
}