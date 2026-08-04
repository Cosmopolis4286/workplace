// Composable para gestión CRUD de usuarios (paralelo a useUserPermissions.ts)
import type { Role } from '~/config/roles.config'

export interface UserSubcategory { id: string; name: string }
export interface UserCategory {
  id: string; name: string; icon?: string
  allowedModules: string[]; subcategories: UserSubcategory[]
}
export interface UserItem {
  id: string; firstName: string; lastName: string; email: string; phone?: string
  role: Role; isActive: boolean; createdAt: string
  commerce?: { id: string; name: string }
  category?: { id: string; name: string; icon?: string } | null
  subcategory?: { id: string; name: string } | null
}

export interface UserFormData {
  firstName: string; lastName: string; email: string; password: string; phone: string
  role: Role; commerceName: string; categoryId: string; subcategoryId: string
}

export interface UserListFilters {
  page: number
  limit: number
  roleFilter?: string
  categoryFilter?: string
  subcategoryFilter?: string
  search?: string
}

export interface UsersStats {
  total: number
  commerce: number
  freelancer: number
  active: number
}

export function emptyUserForm(): UserFormData {
  return { firstName: '', lastName: '', email: '', password: '', phone: '', role: 'COMMERCE', commerceName: '', categoryId: '', subcategoryId: '' }
}

function buildFilterParams(filters: Omit<UserListFilters, 'page' | 'limit'>) {
  const params = new URLSearchParams()
  if (filters.roleFilter) params.set('role', filters.roleFilter)
  if (filters.categoryFilter) params.set('categoryId', filters.categoryFilter)
  if (filters.subcategoryFilter) params.set('subcategoryId', filters.subcategoryFilter)
  if (filters.search) params.set('search', filters.search)
  return params
}

export const useUsers = () => {
  const { get, put, post, patch, del } = useApi()

  async function loadCategories() {
    return get<UserCategory[]>('/users/categories')
  }

  async function listUsers(filters: UserListFilters) {
    const params = buildFilterParams(filters)
    params.set('page', String(filters.page))
    params.set('limit', String(filters.limit))
    return get<{ data: UserItem[]; total: number }>(`/users?${params}`)
  }

  // Agregados sobre todo el conjunto filtrado (no solo la página cargada),
  // usados en el header de /users.
  async function getStats(filters: Omit<UserListFilters, 'page' | 'limit'>) {
    const params = buildFilterParams(filters)
    return get<UsersStats>(`/users/stats?${params}`)
  }

  async function createUser(form: UserFormData) {
    return post('/users', {
      firstName: form.firstName, lastName: form.lastName, email: form.email,
      password: form.password, phone: form.phone || undefined, role: form.role,
      commerceName: form.commerceName || undefined,
      categoryId: form.categoryId || undefined, subcategoryId: form.subcategoryId || undefined,
    })
  }

  async function updateUser(id: string, form: UserFormData) {
    return put(`/users/${id}`, {
      firstName: form.firstName, lastName: form.lastName, email: form.email,
      phone: form.phone || undefined, role: form.role,
      categoryId: form.categoryId || null, subcategoryId: form.subcategoryId || null,
    })
  }

  async function toggleUserStatus(id: string) {
    return patch(`/users/${id}/toggle-status`)
  }

  async function deleteUser(id: string) {
    return del(`/users/${id}`)
  }

  return { loadCategories, listUsers, getStats, createUser, updateUser, toggleUserStatus, deleteUser }
}
