import { Building2, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { AppShell } from '../../../components/shared/AppShell'
import { useAuth } from '../../auth/useAuth'
import { unitsService } from '../../../services/unitsService'
import type { Unit } from '../../../types/domain'

export const UnitRegistrationPage = () => {
  const { user } = useAuth()
  const tenantId = user?.tenantId ?? ''

  const [units, setUnits] = useState<Unit[]>([])
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!tenantId) return

    let active = true

    const loadUnits = async () => {
      try {
        setIsLoading(true)
        setError('')
        const items = await unitsService.getUnits(tenantId)
        if (active) setUnits(items)
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar as unidades.')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadUnits()

    return () => {
      active = false
    }
  }, [tenantId])

  const resetForm = () => {
    setNome('')
    setDescricao('')
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedNome = nome.trim()

    if (!tenantId) {
      setError('Usuário sem tenant ativo para cadastrar unidades.')
      return
    }

    if (!normalizedNome) {
      setError('Informe o nome da unidade.')
      return
    }

    try {
      setIsSaving(true)
      setError('')
      const createdUnit = await unitsService.addUnit(tenantId, { nome: normalizedNome, descricao: descricao.trim() })
      setUnits((current) => [...current, createdUnit].sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR')))
      resetForm()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Falha ao salvar a unidade.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-brand-ink">Cadastro de unidades</h2>
        <p className="mt-1 text-sm text-brand-ink/65">Registre as unidades/prédios administrados dentro desta unidade SENAI.</p>
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="rounded-[1.75rem] border border-brand-ink/10 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-brand-ink">Nova unidade</p>
              <p className="mt-1 text-sm text-brand-ink/65">Informe o nome e a descrição da unidade.</p>
            </div>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-teal/10 text-brand-teal">
              <Building2 className="h-5 w-5" />
            </span>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-brand-ink">Nome da unidade</span>
              <input
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
                placeholder="Ex.: Bloco Administrativo"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-brand-ink">Descrição</span>
              <textarea
                value={descricao}
                onChange={(event) => setDescricao(event.target.value)}
                className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
                placeholder="Ex.: Prédio 2, entrada pela Rua A"
                rows={3}
              />
            </label>

            {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-teal px-5 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
              {isSaving ? 'Salvando unidade...' : 'Salvar unidade'}
            </button>
          </form>
        </div>

        <div className="rounded-[1.75rem] border border-brand-ink/10 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-medium text-brand-ink">Unidades cadastradas</p>
            <span className="rounded-full bg-brand-teal/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
              {units.length} registros
            </span>
          </div>

          {isLoading ? (
            <div className="flex min-h-40 items-center justify-center text-sm text-brand-ink/60">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando unidades...
            </div>
          ) : units.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {units.map((unit) => (
                <article key={unit.id} className="rounded-[1.5rem] border border-brand-ink/10 bg-brand-sand p-4">
                  <p className="text-base font-semibold text-brand-ink">{unit.nome}</p>
                  <p className="mt-1 text-sm text-brand-ink/65">{unit.descricao || 'Sem descrição.'}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 flex min-h-40 items-center justify-center rounded-[1.5rem] border border-dashed border-brand-ink/15 bg-slate-50 text-sm text-brand-ink/55">
              Nenhuma unidade cadastrada até o momento.
            </div>
          )}
        </div>
      </section>
    </AppShell>
  )
}
