import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { isFirebaseConfigured } from '../../../config/env'
import { useAuth } from '../useAuth'

export const MfaPage = () => {
  const { user, verifyMfa } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!user.mfaRequired || user.mfaVerified) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await verifyMfa(code)
      navigate('/', { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível validar o código.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-ink px-6 py-12">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-panel">
        <div className="mb-8 space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-brand-teal">Segundo fator</p>
          <h1 className="text-3xl font-semibold text-brand-ink">Validar TOTP</h1>
          <p className="text-sm text-brand-ink/65">
            {isFirebaseConfigured
              ? 'Informe o código gerado pelo autenticador da unidade.'
              : 'Modo demo: qualquer código de 6 dígitos conclui o fluxo local.'}
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-brand-ink">Código TOTP</span>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 text-center text-2xl tracking-[0.6em] outline-none transition focus:border-brand-teal"
              placeholder="000000"
              required
            />
          </label>

          {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-brand-teal px-5 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Validando...' : 'Concluir acesso'}
          </button>
        </form>
      </div>
    </div>
  )
}