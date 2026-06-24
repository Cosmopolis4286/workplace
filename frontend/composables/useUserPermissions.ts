// Composable para gestión de permisos de usuarios
import { useApi } from './useApi'
import type { Role } from '~/config/dashboard.config'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: Role
  isActive: boolean
  createdAt: string
  hasCustomPermissions: boolean
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
  user: User
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
    page?: number
    limit?: number
  } = {}) {
    const query = new URLSearchParams()
    if (params.role) query.set('role', params.role)
    if (params.search) query.set('search', params.search)
    if (params.page) query.set('page', params.page.toString())
    if (params.limit) query.set('limit', params.limit.toString())

    return get<{ users: User[]; pagination: { page: number; limit: number; total: number; pages: number } }>(
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
