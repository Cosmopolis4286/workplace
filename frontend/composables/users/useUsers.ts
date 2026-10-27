// Composable para gestión CRUD de usuarios (paralelo a useUserPermissions.ts)
import type { Role } from '~/config/roles.config'
import type { ProfessionalSubtype } from '~/composables/users/useProfileActivations'

export interface UserSubcategory { id: string; name: string }
export interface UserCategory {
  id: string; name: string; icon?: string
  allowedModules: string[]; subcategories: UserSubcategory[]
}
export interface UserProfileSummary { type: 'BUSINESS' | 'PROFESSIONAL'; subtype?: 'FREELANCER' | 'SERVICE_PROVIDER' | null }
export interface UserItem {
  id: string; firstName: string; lastName: string; email: string; phone?: string
  role: Role; isActive: boolean; createdAt: string
  commerce?: { id: string; name: string }
  category?: { id: string; name: string; icon?: string } | null
  subcategory?: { id: string; name: string } | null
  // Solo el perfil de negocio ACTIVE (BUSINESS/PROFESSIONAL), si tiene uno —
  // ver profileKindOf() en config/roles.config.ts para resolverlo a un
  // label/color. Vacío para SUPERADMIN/ADMIN/NORMAL o un PROFESIONAL
  // huérfano (rol asignado sin UserProfile todavía).
  profiles: UserProfileSummary[]
}

// Role ya no distingue "tiene Commerce" de "es freelancer/service provider"
// (ambos son PROFESIONAL) — el backend requiere estos dos campos explícitos
// para saber qué UserProfile crear cuando role=PROFESIONAL. BusinessProfileType
// es un subconjunto de ProfileActivationType (useProfileActivations) — acá
// solo aplican BUSINESS/PROFESSIONAL, no CUSTOMER/JOB_SEEKER. No se
// re-exporta ProfessionalSubtype (ya lo exporta useProfileActivations.ts —
// dos exports del mismo nombre generan un warning de import duplicado en
// Nuxt); quien lo necesite lo importa de ahí directo.
export type BusinessProfileType = 'BUSINESS' | 'PROFESSIONAL'

export interface UserFormData {
  firstName: string; lastName: string; email: string; password: string; phone: string
  role: Role; commerceName: string; categoryId: string; subcategoryId: string
  businessProfileType: BusinessProfileType; professionalSubtype: ProfessionalSubtype
}

export interface UserListFilters {
  page: number
  limit: number
  roleFilter?: string
  categoryFilter?: string
  subcategoryFilter?: string
  search?: string
  profileKind?: 'BUSINESS' | 'FREELANCER' | 'SERVICE_PROVIDER' | ''
}

export interface UsersStats {
  total: number
  commerce: number
  // Ambos cuentan solo su subtipo específico (no se solapan) — juntos con
  // `commerce` suman el total de perfiles de negocio activos.
  freelancer: number
  serviceProvider: number
  active: number
}

export function emptyUserForm(): UserFormData {
  return {
    firstName: '', lastName: '', email: '', password: '', phone: '', role: 'PROFESIONAL',
    commerceName: '', categoryId: '', subcategoryId: '',
    businessProfileType: 'BUSINESS', professionalSubtype: 'FREELANCER',
  }
}

function buildFilterParams(filters: Omit<UserListFilters, 'page' | 'limit'>) {
  const params = new URLSearchParams()
  if (filters.roleFilter) params.set('role', filters.roleFilter)
  if (filters.categoryFilter) params.set('categoryId', filters.categoryFilter)
  if (filters.subcategoryFilter) params.set('subcategoryId', filters.subcategoryFilter)
  if (filters.search) params.set('search', filters.search)
  if (filters.profileKind) params.set('profileKind', filters.profileKind)
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
      ...(form.role === 'PROFESIONAL'
        ? {
            businessProfileType: form.businessProfileType,
            ...(form.businessProfileType === 'PROFESSIONAL' ? { professionalSubtype: form.professionalSubtype } : {}),
          }
        : {}),
    })
  }

  async function updateUser(id: string, form: UserFormData) {
    return put(`/users/${id}`, {
      firstName: form.firstName, lastName: form.lastName, email: form.email,
      phone: form.phone || undefined, role: form.role,
      categoryId: form.categoryId || null, subcategoryId: form.subcategoryId || null,
      // role !== PROFESIONAL → null explícito quita el perfil de negocio
      // (ver UsersService.applyBusinessProfileType, distingue null de
      // "no enviado"). role === PROFESIONAL → siempre se manda el tipo
      // elegido en el form, así el admin puede reclasificar un usuario
      // existente (ej. de Freelancer a Comercio) sin pasos extra.
      businessProfileType: form.role === 'PROFESIONAL' ? form.businessProfileType : null,
      ...(form.role === 'PROFESIONAL' && form.businessProfileType === 'PROFESSIONAL'
        ? { professionalSubtype: form.professionalSubtype }
        : {}),
    })
  }

  async function toggleUserStatus(id: string) {
    return patch(`/users/${id}/toggle-status`, {})
  }

  async function deleteUser(id: string) {
    return del(`/users/${id}`)
  }

  return { loadCategories, listUsers, getStats, createUser, updateUser, toggleUserStatus, deleteUser }
}
