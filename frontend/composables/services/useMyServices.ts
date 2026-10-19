import { ref, computed } from 'vue'
import { useApi } from '../core/useApi'

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
  images: string[]
  status: 'ACTIVE' | 'INACTIVE' | 'PAUSED'
  hasEscrow?: boolean
  tags: string[]
  modalities: string[]
  itemFields: string[]
  categoryId?: string
  category?: MyServiceCategory
  requestCount?: number
  createdAt: string
}

export const SERVICE_STATUS_LABELS: Record<Service['status'], string> = {
  ACTIVE: 'Activo',
  PAUSED: 'Pausado',
  INACTIVE: 'Inactivo',
}

export const SERVICE_STATUS_CLASSES: Record<Service['status'], string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  INACTIVE: 'bg-gray-100 text-gray-600',
}

const services = ref<Service[]>([])
const catalogCategories = ref<MyServiceCategory[]>([])
const modalities = ref<ServiceModality[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const totalCount = ref(0)
const currentPage = ref(1)
// Contadores globales por status, independientes del filtro aplicado a `services`
// (la lista puede estar filtrada/paginada y no reflejar los totales reales).
const stats = ref({ total: 0, activos: 0, pausados: 0, inactivos: 0 })

export function useMyServices() {
  const { get, post, put, patch, del } = useApi()

  async function fetchStats() {
    try {
      stats.value = await get<typeof stats.value>('/services/mine/stats')
    } catch {
      // non-blocking: las tarjetas de resumen no deben tumbar la página
    }
  }

  // append: "Cargar más" agrega la página siguiente sin reemplazar la lista
  // ni mostrar el skeleton de carga completa.
  async function fetchServices(params: { search?: string; page?: number; status?: string; append?: boolean } = {}) {
    if (!params.append) loading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (params.search) query.set('search', params.search)
      if (params.status) query.set('status', params.status)
      query.set('page', String(params.page ?? 1))
      query.set('limit', '48')

      const res = await get<{ data: Service[]; total: number; page: number }>(`/services/mine?${query}`)
      services.value = params.append ? [...services.value, ...res.data] : res.data
      totalCount.value = res.total
      currentPage.value = res.page
    } catch (e: any) {
      error.value = e?.message ?? 'Error al cargar servicios'
    } finally {
      loading.value = false
    }
  }

  // forCreation=true: selector del formulario "Nuevo Servicio" — filtra al
  // rubro (UserCategory) del usuario en sesión y no exige que la categoría
  // ya tenga servicios activos (ver ServicesService.getCatalogCategories).
  // false (default): catálogo de búsqueda pública, sin scope por usuario.
  async function fetchCatalogCategories(forCreation = false) {
    try {
      const res = await get<{ data: MyServiceCategory[] }>(`/services/catalog/categories?forCreation=${forCreation}`)
      catalogCategories.value = res.data
    } catch {
      // non-blocking
    }
  }

  // Endpoint admin-only: a diferencia de fetchCatalogCategories (público, filtra a
  // categorías con servicios activos), este trae TODAS las categorías — necesario
  // para que el panel de gestión pueda ver/editar categorías recién creadas sin
  // servicios activos todavía. Devuelve un array plano, no { data: [...] }.
  async function fetchAdminCategories() {
    try {
      catalogCategories.value = await get<MyServiceCategory[]>('/services/categories')
    } catch {
      // non-blocking
    }
  }

  async function createService(data: Partial<Service>) {
    const res = await post<Service>('/services', data)
    services.value.unshift(res)
    totalCount.value++
    fetchStats()
    return res
  }

  async function updateService(id: string, data: Partial<Service>) {
    const res = await put<Service>(`/services/${id}`, data)
    const idx = services.value.findIndex(s => s.id === id)
    const statusChanged = idx !== -1 && services.value[idx].status !== res.status
    if (idx !== -1) services.value[idx] = res
    if (statusChanged) fetchStats()
    return res
  }

  async function uploadServiceImage(id: string, slot: number, file: File) {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('slot', String(slot))
    const res = await post<Service>(`/services/${id}/images`, formData)
    const idx = services.value.findIndex(s => s.id === id)
    if (idx !== -1) services.value[idx] = res
    return res
  }

  async function importServiceImageFromUrl(id: string, slot: number, url: string) {
    const res = await post<Service>(`/services/${id}/images/from-url`, { url, slot })
    const idx = services.value.findIndex(s => s.id === id)
    if (idx !== -1) services.value[idx] = res
    return res
  }

  async function toggleStatus(id: string) {
    const res = await patch<Service>(`/services/${id}/toggle`, {})
    const idx = services.value.findIndex(s => s.id === id)
    if (idx !== -1) services.value[idx] = res
    fetchStats()
    return res
  }

  async function deleteService(id: string) {
    await del(`/services/${id}`)
    services.value = services.value.filter(s => s.id !== id)
    totalCount.value--
    fetchStats()
  }

  // ─── Admin: categorías y modalidades de servicio ───────────────────────────

  async function createCategory(data: { name: string; color?: string; icon?: string }) {
    const res = await post<MyServiceCategory>('/services/categories', data)
    catalogCategories.value.push(res)
    return res
  }

  async function updateCategory(id: string, data: Partial<{ name: string; color: string; icon: string }>) {
    const res = await put<MyServiceCategory>(`/services/categories/${id}`, data)
    const idx = catalogCategories.value.findIndex(c => c.id === id)
    if (idx !== -1) catalogCategories.value[idx] = res
    return res
  }

  async function deleteCategory(id: string) {
    await del(`/services/categories/${id}`)
    catalogCategories.value = catalogCategories.value.filter(c => c.id !== id)
  }

  async function fetchModalities() {
    try {
      modalities.value = await get<ServiceModality[]>('/services/modalities')
    } catch {
      // non-blocking
    }
  }

  // Incluye modalidades inactivas — solo para el panel admin, que necesita
  // poder reactivarlas (fetchModalities solo trae las activas).
  async function fetchAllModalities() {
    modalities.value = await get<ServiceModality[]>('/services/modalities/all')
  }

  async function createModality(data: { name: string; value: string; emoji?: string; sortOrder?: number }) {
    const res = await post<ServiceModality>('/services/modalities', data)
    modalities.value.push(res)
    return res
  }

  async function updateModality(id: string, data: Partial<ServiceModality>) {
    const res = await put<ServiceModality>(`/services/modalities/${id}`, data)
    const idx = modalities.value.findIndex((m: ServiceModality) => m.id === id)
    if (idx !== -1) modalities.value[idx] = res
    return res
  }

  async function deleteModality(id: string) {
    await del(`/services/modalities/${id}`)
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
    fetchStats,
    fetchServices,
    fetchCatalogCategories,
    fetchAdminCategories,
    fetchModalities,
    fetchAllModalities,
    createService,
    updateService,
    uploadServiceImage,
    importServiceImageFromUrl,
    toggleStatus,
    deleteService,
    createCategory,
    updateCategory,
    deleteCategory,
    createModality,
    updateModality,
    deleteModality,
  }
}
