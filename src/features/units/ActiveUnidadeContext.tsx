import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

import { useAuth } from '../auth/useAuth'
import { unitsService } from '../../services/unitsService'
import type { Unit } from '../../types/domain'

interface ActiveUnidadeContextValue {
  unidadeId: string | null
  unidades: Unit[]
  isSuperAdmin: boolean
  isLoading: boolean
  setUnidadeId: (unidadeId: string) => void
}

const ActiveUnidadeContext = createContext<ActiveUnidadeContextValue | null>(null)

export { ActiveUnidadeContext }

export const ActiveUnidadeProvider = ({ children }: PropsWithChildren) => {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'

  const [unidades, setUnidades] = useState<Unit[]>([])
  const [selectedUnidadeId, setSelectedUnidadeId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadUnidades = async () => {
      if (!user) {
        if (active) setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const items = await unitsService.getUnits(user.tenantId)
        if (!active) return
        setUnidades(items)
        setSelectedUnidadeId((current) => current ?? items[0]?.id ?? null)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadUnidades()

    return () => {
      active = false
    }
  }, [user])

  const unidadeId = isSuperAdmin ? selectedUnidadeId : (user?.unidadeId ?? null)

  const value = useMemo<ActiveUnidadeContextValue>(
    () => ({
      unidadeId,
      unidades,
      isSuperAdmin,
      isLoading,
      setUnidadeId: setSelectedUnidadeId,
    }),
    [unidadeId, unidades, isSuperAdmin, isLoading],
  )

  return <ActiveUnidadeContext.Provider value={value}>{children}</ActiveUnidadeContext.Provider>
}
