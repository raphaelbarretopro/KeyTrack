import { AlertTriangle, CheckCircle2, Loader2, Pencil, Trash2, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'

import { AppShell } from '../../../components/shared/AppShell'
import { Modal } from '../../../components/shared/Modal'
import { useAuth } from '../../auth/useAuth'
import { useActiveUnidade } from '../../units/useActiveUnidade'
import { usersService, type TenantUser } from '../../../services/usersService'
import type { Unit, UserRole } from '../../../types/domain'

const roleLabel: Record<UserRole, string> = {
  super_admin: 'Administrador geral',
  admin: 'Administrador',
  reception: 'Recepção',
}

interface UserEditModalProps {
  tenantUser: TenantUser
  isSuperAdmin: boolean
  unidades: Unit[]
  onClose: () => void
  onSubmit: (payload: { name: string; role: UserRole; unidadeId?: string }) => Promise<void>
}

const UserEditModal = ({ tenantUser, isSuperAdmin, unidades, onClose, onSubmit }: UserEditModalProps) => {
  const [name, setName] = useState(tenantUser.name)
  const [role, setRole] = useState<UserRole>(tenantUser.role)
  const [unidadeId, setUnidadeId] = useState(tenantUser.unidadeId ?? '')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedName = name.trim()
    if (!normalizedName) {
      setError('Informe o nome do usuário.')
      return
    }

    if (role !== 'super_admin' && !unidadeId) {
      setError('Selecione a unidade do usuário.')
      return
    }

    try {
      setIsSaving(true)
      setError('')
      await onSubmit({
        name: normalizedName,
        role,
        unidadeId: role === 'super_admin' ? undefined : unidadeId,
      })
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Falha ao atualizar o usuário.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal title={`Editar ${tenantUser.name}`} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="rounded-[1.5rem] border border-brand-ink/10 bg-brand-sand p-4 text-sm text-brand-ink/75">
          <p><strong>Email:</strong> {tenantUser.email}</p>
          <p className="mt-1 text-brand-ink/55">O email não pode ser alterado depois do cadastro.</p>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-brand-ink">Nome</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-brand-ink">Nível de acesso</span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
            disabled={!isSuperAdmin}
          >
            <option value="reception">Recepção</option>
            {isSuperAdmin ? <option value="admin">Administrador (de uma unidade)</option> : null}
            {isSuperAdmin ? <option value="super_admin">Administrador geral</option> : null}
          </select>
        </label>

        {isSuperAdmin && role !== 'super_admin' ? (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-brand-ink">Unidade</span>
            <select
              value={unidadeId}
              onChange={(event) => setUnidadeId(event.target.value)}
              className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
            >
              {unidades.map((unidade) => (
                <option key={unidade.id} value={unidade.id}>
                  {unidade.nome}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-brand-ink/10 px-5 py-3 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-teal px-5 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

interface ConfirmDeleteUserModalProps {
  tenantUser: TenantUser
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

const ConfirmDeleteUserModal = ({ tenantUser, isDeleting, onClose, onConfirm }: ConfirmDeleteUserModalProps) => (
  <Modal title="Excluir usuário" onClose={onClose}>
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <div className="space-y-2">
          <p>
            Tem certeza que deseja excluir o acesso de <strong>{tenantUser.name}</strong> ({tenantUser.email})? Ele
            perde todas as permissões imediatamente.
          </p>
          <p className="text-rose-700/85">
            Atenção: a conta de login continua existindo no Firebase Authentication — o navegador não pode apagá-la.
            Na prática o usuário fica sem acesso a nada, mas o email segue ocupado e só pode ser reaproveitado
            removendo a conta pelo Console do Firebase.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-full border border-brand-ink/10 px-5 py-3 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isDeleting}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-rose-600 px-5 py-3 font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          {isDeleting ? 'Excluindo...' : 'Excluir acesso'}
        </button>
      </div>
    </div>
  </Modal>
)

interface CreatedUserInfo {
  name: string
  email: string
  role: UserRole
  unidadeName: string
}

const UserCreatedModal = ({ user, onClose }: { user: CreatedUserInfo; onClose: () => void }) => (
  <Modal title="Usuário cadastrado com sucesso" onClose={onClose}>
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        O usuário já pode entrar no sistema com o email e a senha definidos.
      </div>

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-[0.16em] text-brand-ink/45">Nome</dt>
          <dd className="font-medium text-brand-ink">{user.name}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.16em] text-brand-ink/45">Email</dt>
          <dd className="font-medium text-brand-ink">{user.email}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.16em] text-brand-ink/45">Nível de acesso</dt>
          <dd className="font-medium text-brand-ink">{roleLabel[user.role]}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.16em] text-brand-ink/45">Unidade</dt>
          <dd className="font-medium text-brand-ink">{user.unidadeName}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-full bg-brand-teal px-5 py-3 font-semibold text-white transition hover:bg-teal-700"
      >
        Concluir
      </button>
    </div>
  </Modal>
)

export const UserRegistrationPage = () => {
  const { user } = useAuth()
  const tenantId = user?.tenantId ?? ''
  const isSuperAdmin = user?.role === 'super_admin'
  const { unidadeId: activeUnidadeId, unidades } = useActiveUnidade()
  const activeUnidadeName = unidades.find((unidade) => unidade.id === activeUnidadeId)?.nome || 'SENAI CRTI'

  const [users, setUsers] = useState<TenantUser[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('reception')
  const [error, setError] = useState('')
  const [listError, setListError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null)
  const [deletingUser, setDeletingUser] = useState<TenantUser | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [createdUser, setCreatedUser] = useState<CreatedUserInfo | null>(null)

  const listUnidadeId = isSuperAdmin ? undefined : (user?.unidadeId ?? activeUnidadeId ?? undefined)

  useEffect(() => {
    if (!tenantId) return

    let active = true

    const loadUsers = async () => {
      try {
        setIsLoading(true)
        setError('')
        const items = await usersService.listUsers(tenantId, listUnidadeId)
        if (active) setUsers(items)
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar os usuários.')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadUsers()

    return () => {
      active = false
    }
  }, [tenantId, listUnidadeId])

  const reloadUsers = async () => {
    if (!tenantId) return
    setUsers(await usersService.listUsers(tenantId, listUnidadeId))
  }

  const resetForm = () => {
    setName('')
    setEmail('')
    setPassword('')
    setRole('reception')
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedName = name.trim()
    const normalizedEmail = email.trim()
    const targetUnidadeId = isSuperAdmin ? activeUnidadeId : user?.unidadeId

    if (!tenantId) {
      setError('Sessão sem tenant ativo para cadastrar usuários.')
      return
    }

    if (!normalizedName || !normalizedEmail) {
      setError('Informe nome e email.')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter ao menos 6 caracteres.')
      return
    }

    if (role !== 'super_admin' && !targetUnidadeId) {
      setError('Selecione a unidade do usuário.')
      return
    }

    try {
      setIsSaving(true)
      setError('')
      await usersService.createUser(tenantId, {
        name: normalizedName,
        email: normalizedEmail,
        password,
        role,
        unidadeId: role === 'super_admin' ? undefined : (targetUnidadeId ?? undefined),
      })
      setCreatedUser({
        name: normalizedName,
        email: normalizedEmail,
        role,
        unidadeName: role === 'super_admin' ? 'Todas as unidades' : activeUnidadeName,
      })
      resetForm()
      await reloadUsers()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Falha ao cadastrar o usuário.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = async (userId: string, payload: { name: string; role: UserRole; unidadeId?: string }) => {
    if (!tenantId) return
    await usersService.updateUser(tenantId, userId, payload)
    await reloadUsers()
  }

  const handleConfirmDelete = async () => {
    if (!tenantId || !deletingUser) return

    try {
      setIsDeleting(true)
      setListError('')
      await usersService.removeUser(tenantId, deletingUser.id)
      setDeletingUser(null)
      await reloadUsers()
    } catch (deleteError) {
      setListError(deleteError instanceof Error ? deleteError.message : 'Falha ao excluir o usuário.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AppShell>
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-brand-ink">Cadastro de usuários</h2>
        <p className="mt-1 text-sm text-brand-ink/65">
          {isSuperAdmin
            ? 'Crie contas de administrador geral, administrador de unidade ou recepção.'
            : `Crie contas de recepção para a unidade ${activeUnidadeName}.`}
        </p>
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="rounded-[1.75rem] border border-brand-ink/10 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-brand-ink">Novo usuário</p>
              <p className="mt-1 text-sm text-brand-ink/65">
                {role === 'super_admin' ? 'Acesso a todas as unidades.' : <>Unidade: <strong>{activeUnidadeName}</strong>.</>}
              </p>
            </div>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-teal/10 text-brand-teal">
              <UserPlus className="h-5 w-5" />
            </span>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-brand-ink">Nome</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
                placeholder="Nome completo"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-brand-ink">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
                placeholder="nome@exemplo.com"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-brand-ink">Senha</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-brand-ink">Nível de acesso</span>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
                className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
                disabled={!isSuperAdmin}
              >
                <option value="reception">Recepção</option>
                {isSuperAdmin ? <option value="admin">Administrador (de uma unidade)</option> : null}
                {isSuperAdmin ? <option value="super_admin">Administrador geral</option> : null}
              </select>
            </label>

            {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-teal px-5 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {isSaving ? 'Cadastrando usuário...' : 'Cadastrar usuário'}
            </button>
          </form>
        </div>

        <div className="rounded-[1.75rem] border border-brand-ink/10 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-medium text-brand-ink">Usuários cadastrados</p>
            <span className="rounded-full bg-brand-teal/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
              {users.length} registros
            </span>
          </div>

          {listError ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{listError}</p> : null}

          {isLoading ? (
            <div className="flex min-h-40 items-center justify-center text-sm text-brand-ink/60">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando usuários...
            </div>
          ) : users.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {users.map((item) => {
                const isSelf = item.id === user?.uid

                return (
                  <article key={item.id} className="rounded-[1.5rem] border border-brand-ink/10 bg-brand-sand p-4">
                    <p className="text-base font-semibold text-brand-ink">{item.name}</p>
                    <p className="mt-1 text-sm text-brand-ink/65">{item.email}</p>
                    <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-ink/70">
                      {roleLabel[item.role]}
                    </span>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingUser(item)}
                        disabled={isSelf}
                        title={isSelf ? 'Você não pode editar o próprio acesso.' : undefined}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-brand-ink/10 bg-white px-3 py-2 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingUser(item)}
                        disabled={isSelf}
                        title={isSelf ? 'Você não pode excluir o próprio acesso.' : undefined}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-rose-200 px-3 py-2 text-sm text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="mt-5 flex min-h-40 items-center justify-center rounded-[1.5rem] border border-dashed border-brand-ink/15 bg-slate-50 text-sm text-brand-ink/55">
              Nenhum usuário cadastrado até o momento.
            </div>
          )}
        </div>
      </section>

      {editingUser ? (
        <UserEditModal
          tenantUser={editingUser}
          isSuperAdmin={isSuperAdmin}
          unidades={unidades}
          onClose={() => setEditingUser(null)}
          onSubmit={(payload) => handleUpdate(editingUser.id, payload)}
        />
      ) : null}

      {deletingUser ? (
        <ConfirmDeleteUserModal
          tenantUser={deletingUser}
          isDeleting={isDeleting}
          onClose={() => setDeletingUser(null)}
          onConfirm={() => void handleConfirmDelete()}
        />
      ) : null}

      {createdUser ? <UserCreatedModal user={createdUser} onClose={() => setCreatedUser(null)} /> : null}
    </AppShell>
  )
}
