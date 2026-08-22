import { NavLink } from 'react-router-dom'

import { useAuth } from '../../features/auth/useAuth'
import { useActiveUnidade } from '../../features/units/useActiveUnidade'

const pillClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-sm transition ${
    isActive ? 'bg-brand-teal text-white' : 'border border-brand-ink/10 bg-white text-brand-ink hover:border-brand-teal hover:text-brand-teal'
  }`

const adminLinks = [
  { to: '/rooms/new', label: 'Cadastro de salas' },
  { to: '/rooms/maintenance', label: 'Manutenção de salas' },
  { to: '/admin/users', label: 'Usuários' },
  { to: '/reports', label: 'Relatórios' },
]

const superAdminLinks = [{ to: '/units/new', label: 'Cadastro de unidades' }]

interface AppNavProps {
  hideAdminNav?: boolean
}

export const AppNav = ({ hideAdminNav = false }: AppNavProps) => {
  const { user } = useAuth()
  const { unidadeId, unidades, isSuperAdmin, setUnidadeId } = useActiveUnidade()
  const canSeeAdminNav = (user?.role === 'admin' || user?.role === 'super_admin') && !hideAdminNav

  return (
    <nav className="mt-4 flex flex-wrap items-center gap-2 border-t border-brand-ink/10 pt-4">
      <NavLink to="/" end className={pillClass}>
        Início
      </NavLink>
      <NavLink to="/reception" className={pillClass}>
        Painel de salas
      </NavLink>

      {canSeeAdminNav
        ? adminLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={pillClass}>
              {link.label}
            </NavLink>
          ))
        : null}

      {isSuperAdmin && !hideAdminNav
        ? superAdminLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={pillClass}>
              {link.label}
            </NavLink>
          ))
        : null}

      {isSuperAdmin && unidades.length ? (
        <select
          value={unidadeId ?? ''}
          onChange={(event) => setUnidadeId(event.target.value)}
          className="ml-auto rounded-full border border-brand-ink/10 bg-white px-4 py-2 text-sm text-brand-ink outline-none transition focus:border-brand-teal"
        >
          {unidades.map((unidade) => (
            <option key={unidade.id} value={unidade.id}>
              {unidade.nome}
            </option>
          ))}
        </select>
      ) : null}
    </nav>
  )
}
