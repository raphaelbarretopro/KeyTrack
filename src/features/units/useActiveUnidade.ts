import { useContext } from 'react'

import { ActiveUnidadeContext } from './ActiveUnidadeContext'

export const useActiveUnidade = () => {
  const context = useContext(ActiveUnidadeContext)

  if (!context) {
    throw new Error('useActiveUnidade deve ser usado dentro de ActiveUnidadeProvider.')
  }

  return context
}
