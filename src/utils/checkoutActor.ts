export const buildCheckoutActorName = (actorEnrollment: string) => `Matrícula ${actorEnrollment}`

export const formatMovementActor = (actorName?: string, actorEnrollment?: string) => {
  const normalizedEnrollment = actorEnrollment?.trim()
  const normalizedName = actorName?.trim()

  if (!normalizedEnrollment && !normalizedName) {
    return 'Instrutor não identificado'
  }

  if (!normalizedEnrollment) {
    return normalizedName || 'Instrutor não identificado'
  }

  if (!normalizedName || normalizedName === buildCheckoutActorName(normalizedEnrollment)) {
    return `Matrícula ${normalizedEnrollment}`
  }

  return `${normalizedName} • ${normalizedEnrollment}`
}