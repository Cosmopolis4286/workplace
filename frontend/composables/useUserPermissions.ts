// Composable para gestión de permisos de usuarios
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
  const { getHeaders, refreshAccessToken } = useAuth()
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string

  const loading = ref(false)
  const error = ref<string | null>(null)

  async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const doFetch = () =>
      fetch(`${apiUrl}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders(),
          ...(options.headers as Record<string, string> ?? {}),
        },
      })

    let res = await doFetch()
    if (res.status === 401) {
      const ok = await refreshAccessToken()
      if (!ok) throw new Error('Sesión expirada')
      res = await doFetch()
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string }
      throw new Error(body.message ?? `Error ${res.status}`)
    }
    return res.json() as Promise<T>
  }

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

    return apiFetch<{ users: User[]; pagination: { page: number; limit: number; total: number; pages: number } }>(
      `/permissions/users?${query.toString()}`
    )
  }

  // Obtener permisos de un usuario específico
  async function getUserPermissions(userId: string) {
    return apiFetch<UserPermissionsResponse>(`/permissions/users/${userId}`)
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
    return apiFetch<{ success: boolean }>(`/permissions/users/${userId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Eliminar permiso individual de un usuario
  async function removeUserPermission(userId: string, permissionId: string) {
    return apiFetch<{ success: boolean }>(`/permissions/users/${userId}/${permissionId}`, {
      method: 'DELETE',
    })
  }

  // Resetear todos los permisos individuales del usuario
  async function resetUserPermissions(userId: string) {
    return apiFetch<{ success: boolean; message?: string }>(`/permissions/users/${userId}/reset`, {
      method: 'POST',
    })
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
