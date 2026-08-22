export type KeyStatus = 'available' | 'occupied' | 'maintenance'

export type UserRole = 'super_admin' | 'admin' | 'reception'

export interface AppUser {
  uid: string
  email: string
  name: string
  enrollment: string
  tenantId: string
  role: UserRole
  unidadeId?: string
  mfaRequired: boolean
  mfaVerified: boolean
}

export interface Instructor {
  id: string
  name: string
  matricula: string
  photoBase64: string
  faceDescriptor?: number[]
  unidadeId: string
}

export interface Unit {
  id: string
  nome: string
  descricao: string
  createdAt: string
  updatedAt: string
}

export interface KeyRecord {
  id: string
  label: string
  code: string
  qrCodeId: string
  location: string
  description: string
  active: boolean
  statusCurrent: KeyStatus
  unidadeId: string
  lastMovementId?: string
  createdAt: string
  updatedAt: string
}

export interface MovementRecord {
  id: string
  keyId: string
  unidadeId: string
  action: 'checkout' | 'checkin'
  actorUserId: string
  actorEnrollment: string
  actorName: string
  checkoutAt?: string
  expectedReturnAt?: string
  returnedAt?: string
  capturedPhotoBase64?: string
  notes?: string
  createdAt: string
}

export interface DashboardKey {
  key: KeyRecord
  activeMovement?: MovementRecord
}

export interface CheckoutPayload {
  keyId: string
  unidadeId: string
  actorName: string
  actorEnrollment: string
  expectedReturnAt?: string
  notes?: string
  photoDataUrl: string
  actorUserId: string
}

export interface ReturnPayload {
  keyId: string
  movementId: string
  notes?: string
}

export interface AuthResult {
  status: 'authenticated' | 'requires-mfa'
  user: AppUser
}