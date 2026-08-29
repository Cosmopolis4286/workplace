// Composable para gestión de permisos de usuarios
import { useApi } from '../core/useApi'
import type { Role } from '~/config/roles.config'

export interface PermissionsUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: Role
  isActive: boolean
  createdAt: string
  hasCustomPermissions: boolean
  // Solo el perfil de negocio ACTIVE (BUSINESS/PROFESSIONAL), si tiene uno —
  // ver profileKindOf() en config/roles.config.ts.
  profiles: { type: 'BUSINESS' | 'PROFESSIONAL'; subtype?: 'FREELANCER' | 'SERVICE_PROVIDER' | null }[]
}

export interface UserPermission {
  permissionId: string
  key: string
  module: string
  action: string
  label: string
  isSystem: boolean
  roleGranted: boolean
  userGranted: boolean | null
  userDenied: boolean
  expiresAt: string | null
  reason: string | null
  effectiveGranted: boolean
  source: 'role' | 'user' | 'none'
}

export interface UserPermissionsResponse {
  user: PermissionsUser
  permissions: UserPermission[]
  allPermissions: UserPermission[]
}

export const useUserPermissions = () => {
  const { get, post, del } = useApi()

  const loading = ref(false)
  const error = ref<string | null>(null)

  // Listar usuarios con búsqueda
  async function listUsers(params: {
    role?: Role
    search?: string
    profileKind?: 'BUSINESS' | 'FREELANCER' | 'SERVICE_PROVIDER' | ''
    page?: number
    limit?: number
  } = {}) {
    const query = new URLSearchParams()
    if (params.role) query.set('role', params.role)
    if (params.search) query.set('search', params.search)
    if (params.profileKind) query.set('profileKind', params.profileKind)
    if (params.page) query.set('page', params.page.toString())
    if (params.limit) query.set('limit', params.limit.toString())

    return get<{ users: PermissionsUser[]; pagination: { page: number; limit: number; total: number; pages: number } }>(
      `/permissions/users?${query.toString()}`
    )
  }

  // Obtener permisos de un usuario específico
  async function getUserPermissions(userId: string) {
    return get<UserPermissionsResponse>(`/permissions/users/${userId}`)
  }

  // Actualizar permiso de un usuario
  async function updateUserPermission(
    userId: string,
    data: {
      permissionId: string
      granted: boolean
      reason?: string
      expiresAt?: string
    }
  ) {
    return post<{ success: boolean }>(`/permissions/users/${userId}`, data)
  }

  // Eliminar permiso individual de un usuario
  async function removeUserPermission(userId: string, permissionId: string) {
    return del<{ success: boolean }>(`/permissions/users/${userId}/${permissionId}`)
  }

  // Resetear todos los permisos individuales del usuario
  async function resetUserPermissions(userId: string) {
    return post<{ success: boolean; message?: string }>(`/permissions/users/${userId}/reset`, {})
  }

  return {
    loading,
    error,
    listUsers,
    getUserPermissions,
    updateUserPermission,
    removeUserPermission,
    resetUserPermissions,
  }
}
