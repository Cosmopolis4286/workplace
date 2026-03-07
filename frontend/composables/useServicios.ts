import { ref, computed } from 'vue'

export interface ServiceCategory {
  id: string
  name: string
  color: string
  icon?: string
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
  categoryId?: string
  category?: ServiceCategory
  createdAt: string
}

export interface ServiceStats {
  total: number
  activos: number
  pausados: number
  inactivos: number
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
const catalogCategories = ref<ServiceCategory[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const totalCount = ref(0)
const currentPage = ref(1)

export function useServicios() {
  const { $fetch } = useNuxtApp()
  const config = useRuntimeConfig()
  const base = config.public.apiUrl

  async function apiFetch<T>(path: string, opts: Parameters<typeof $fetch>[1] = {}): Promise<T> {
    const token = localStorage.getItem('access_token')
    return $fetch<T>(`${base}/api${path}`, {
      ...opts,
      headers: { ...(opts.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
  }

  const stats = computed<ServiceStats>(() => ({
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

      const res = await apiFetch<{ data: Service[]; total: number; page: number }>(`/services/mine?${query}`)
      services.value = res.data
      totalCount.value = res.total
      currentPage.value = res.page
    } catch (e: any) {
      error.value = e?.data?.message ?? 'Error al cargar servicios'
    } finally {
      loading.value = false
    }
  }

  async function fetchCatalogCategories() {
    try {
      const res = await apiFetch<{ data: ServiceCategory[] }>('/services/catalog/categories')
      catalogCategories.value = res.data
    } catch {
      // non-blocking
    }
  }

  async function createService(data: Partial<Service>) {
    const res = await apiFetch<Service>('/services', { method: 'POST', body: data })
    services.value.unshift(res)
    totalCount.value++
    return res
  }

  async function updateService(id: string, data: Partial<Service>) {
    const res = await apiFetch<Service>(`/services/${id}`, { method: 'PUT', body: data })
    const idx = services.value.findIndex(s => s.id === id)
    if (idx !== -1) services.value[idx] = res
    return res
  }

  async function toggleStatus(id: string) {
    const res = await apiFetch<Service>(`/services/${id}/toggle`, { method: 'PATCH' })
    const idx = services.value.findIndex(s => s.id === id)
    if (idx !== -1) services.value[idx] = res
    return res
  }

  async function deleteService(id: string) {
    await apiFetch(`/services/${id}`, { method: 'DELETE' })
    services.value = services.value.filter(s => s.id !== id)
    totalCount.value--
  }

  return {
    services,
    catalogCategories,
    loading,
    error,
    totalCount,
    currentPage,
    stats,
    fetchServices,
    fetchCatalogCategories,
    createService,
    updateService,
    toggleStatus,
    deleteService,
  }
}
