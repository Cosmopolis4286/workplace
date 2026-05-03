import { ref, computed } from 'vue'
import { useAuth } from './useAuth'

export interface MyServiceCategory {
  id: string
  name: string
  color: string
  icon?: string
}

export interface ServiceModality {
  id: string
  name: string
  value: string
  emoji?: string
  sortOrder: number
  isActive: boolean
}

export interface Service {
  id: string
  name: string
  description?: string
  price: number
  priceUnit?: string
  duration?: number
  image?: string
  status: 'ACTIVO' | 'INACTIVO' | 'PAUSADO'
  tags: string[]
  modalities: string[]
  categoryId?: string
  category?: MyServiceCategory
  requestCount?: number
  createdAt: string
}

export const SERVICE_STATUS_LABELS: Record<Service['status'], string> = {
  ACTIVO: 'Activo',
  PAUSADO: 'Pausado',
  INACTIVO: 'Inactivo',
}

export const SERVICE_STATUS_CLASSES: Record<Service['status'], string> = {
  ACTIVO: 'bg-green-100 text-green-800',
  PAUSADO: 'bg-yellow-100 text-yellow-800',
  INACTIVO: 'bg-gray-100 text-gray-600',
}

const services = ref<Service[]>([])
const catalogCategories = ref<MyServiceCategory[]>([])
const modalities = ref<ServiceModality[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const totalCount = ref(0)
const currentPage = ref(1)

export function useServicios() {
  const { getHeaders, refreshAccessToken } = useAuth()
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string

  async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = { 'Content-Type': 'application/json', ...getHeaders(), ...(options.headers as Record<string, string> || {}) }
    return $fetch<T>(`${apiUrl}/services${path}`, { ...options, headers } as Parameters<typeof $fetch>[1])
  }

  async function withAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (err: unknown) {
      const status = (err as { status?: number; statusCode?: number })?.status
        ?? (err as { status?: number; statusCode?: number })?.statusCode
      if (status === 401) {
        const refreshed = await refreshAccessToken()
        if (!refreshed) {
          throw err
        }
        return await fn()
      }
      throw err
    }
  }

  const stats = computed(() => ({
    total: services.value.length,
    activos: services.value.filter(s => s.status === 'ACTIVO').length,
    pausados: services.value.filter(s => s.status === 'PAUSADO').length,
    inactivos: services.value.filter(s => s.status === 'INACTIVO').length,
  }))

  async function fetchServices(params: { search?: string; page?: number } = {}) {
    loading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (params.search) query.set('search', params.search)
      query.set('page', String(params.page ?? 1))
      query.set('limit', '50')

      const res = await withAuthRetry(() =>
        apiFetch<{ data: Service[]; total: number; page: number }>(`/mine?${query}`)
      )
      services.value = res.data
      totalCount.value = res.total
      currentPage.value = res.page
    } catch (e: unknown) {
      error.value = (e as { data?: { message?: string } })?.data?.message ?? 'Error al cargar servicios'
    } finally {
      loading.value = false
    }
  }

  async function fetchCatalogCategories() {
    try {
      const res = await $fetch<{ data: MyServiceCategory[] }>(`${apiUrl}/services/catalog/categories`)
      catalogCategories.value = res.data
    } catch {
      // non-blocking
    }
  }

  async function createService(data: Partial<Service>) {
    const res = await withAuthRetry(() => apiFetch<Service>('', { method: 'POST', body: JSON.stringify(data) }))
    services.value.unshift(res)
    totalCount.value++
    return res
  }

  async function updateService(id: string, data: Partial<Service>) {
    const res = await withAuthRetry(() => apiFetch<Service>(`/${id}`, { method: 'PUT', body: JSON.stringify(data) }))
    const idx = services.value.findIndex(s => s.id === id)
    if (idx !== -1) services.value[idx] = res
    return res
  }

  async function toggleStatus(id: string) {
    const res = await withAuthRetry(() => apiFetch<Service>(`/${id}/toggle`, { method: 'PATCH' }))
    const idx = services.value.findIndex(s => s.id === id)
    if (idx !== -1) services.value[idx] = res
    return res
  }

  async function deleteService(id: string) {
    await withAuthRetry(() => apiFetch(`/${id}`, { method: 'DELETE' }))
    services.value = services.value.filter(s => s.id !== id)
    totalCount.value--
  }

  async function fetchModalities() {
    try {
      const res = await $fetch<ServiceModality[]>(`${apiUrl}/services/modalities`)
      modalities.value = res
    } catch {
      // non-blocking
    }
  }

  async function createModality(data: { name: string; value: string; emoji?: string; sortOrder?: number }) {
    const res = await withAuthRetry(() => apiFetch<ServiceModality>('/modalities', { method: 'POST', body: JSON.stringify(data) }))
    modalities.value.push(res)
    return res
  }

  async function updateModality(id: string, data: Partial<ServiceModality>) {
    const res = await withAuthRetry(() => apiFetch<ServiceModality>(`/modalities/${id}`, { method: 'PUT', body: JSON.stringify(data) }))
    const idx = modalities.value.findIndex((m: ServiceModality) => m.id === id)
    if (idx !== -1) modalities.value[idx] = res
    return res
  }

  async function deleteModality(id: string) {
    await withAuthRetry(() => apiFetch(`/modalities/${id}`, { method: 'DELETE' }))
    modalities.value = modalities.value.filter((m: ServiceModality) => m.id !== id)
  }

  return {
    services,
    catalogCategories,
    modalities,
    loading,
    error,
    totalCount,
    currentPage,
    stats,
    fetchServices,
    fetchCatalogCategories,
    fetchModalities,
    createService,
    updateService,
    toggleStatus,
    deleteService,
    createModality,
    updateModality,
    deleteModality,
  }
}
