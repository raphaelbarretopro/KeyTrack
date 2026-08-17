import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../useAuth'

export const LoginForm = () => {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('recepcao@crti.senai.br')
  const [password, setPassword] = useState('123456')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/'

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const result = await signIn(email, password)

      if (result.status === 'requires-mfa') {
        navigate('/mfa', { replace: true })
        return
      }

      navigate(redirectTo, { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao autenticar.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-brand-ink">E-mail</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 outline-none transition focus:border-brand-teal"
          placeholder="recepcao@crti.senai.br"
          required
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-brand-ink">Senha</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 outline-none transition focus:border-brand-teal"
          placeholder="Digite sua senha"
          required
        />
      </label>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-brand-teal px-5 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}