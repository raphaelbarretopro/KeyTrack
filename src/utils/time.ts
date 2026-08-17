import { format, formatDistanceToNowStrict, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const formatDateTime = (value?: string) => {
  if (!value) return '--'
  return format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: ptBR })
}

export const formatElapsed = (value?: string) => {
  if (!value) return '--'
  return formatDistanceToNowStrict(new Date(value), {
    locale: ptBR,
    addSuffix: false,
  })
}

export const isLate = (expectedReturnAt?: string) => {
  if (!expectedReturnAt) return false
  return isPast(new Date(expectedReturnAt))
}