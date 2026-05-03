import { ref, computed } from 'vue'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ServiceCategory {
  id: string
  name: string
  color: string
  icon: string | null
  serviceCount: number
}

export interface ServiceProvider {
  id: string
  name: string
  username: string | null
  avatar: string | null
  category: string | null
  subcategory: string | null
  serviceCount: number
}

export interface CatalogService {
  id: string
  name: string
  description: string | null
  price: number
  priceUnit: string | null
  duration: number | null
  image: string | null
  status: string
  tags: string[]
  modalities: string[]
  createdAt: string
  category: { id: string; name: string; color: string; icon: string | null } | null
  user: {
    id: string
    firstName: string
    lastName: string
    username: string | null
    avatar: string | null
    category: { name: string } | null
    subcategory: { name: string } | null
  }
}

export type ServiceSortBy = 'relevance' | 'price_asc' | 'price_desc' | 'name' | 'newest'

export interface ServiceQuery {
  search: string
  categoryId: string | null
  userId: string | null
  sort: ServiceSortBy
  page: number
}

// ─── Module-level singleton state ─────────────────────────────────────────────

const services = ref<CatalogService[]>([])
const categories = ref<ServiceCategory[]>([])
const providers = ref<ServiceProvider[]>([])
const loading = ref(false)
const loadingCategories = ref(false)
const error = ref<string | null>(null)
const total = ref(0)
const totalPages = ref(1)

const query = ref<ServiceQuery>({
  search: '',
  categoryId: null,
  userId: null,
  sort: 'relevance',
  page: 1,
})

let searchDebounce: ReturnType<typeof setTimeout> | null = null

// ─── Composable ──────────────────────────────────────────────────────────────

export const useServices = () => {
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string
  const base = `${apiUrl}/services`

  // ─── Fetch helpers ──────────────────────────────────────────────────────

  async function loadCategories() {
    loadingCategories.value = true
    try {
      const res = await $fetch<{ data: ServiceCategory[] }>(`${base}/catalog/categories`)
      categories.value = res.data
    } catch {
      // silently fail
    } finally {
      loadingCategories.value = false
    }
  }

  async function loadProviders() {
    try {
      const res = await $fetch<{ data: ServiceProvider[] }>(`${base}/catalog/providers`)
      providers.value = res.data
    } catch {
      // silently fail
    }
  }

  async function loadServices() {
    loading.value = true
    error.value = null
    try {
      const q = query.value
      const params: Record<string, string> = {
        page: String(q.page),
        limit: '16',
        sort: q.sort,
      }
      if (q.search) params.search = q.search
      if (q.categoryId) params.categoryId = q.categoryId
      if (q.userId) params.userId = q.userId

      const res = await $fetch<{ data: CatalogService[]; total: number; totalPages: number }>(
        `${base}/catalog`,
        { params },
      )
      services.value = res.data
      total.value = res.total
      totalPages.value = res.totalPages
    } catch (e: any) {
      error.value = e?.data?.message ?? 'Error al cargar servicios'
    } finally {
      loading.value = false
    }
  }

  // ─── Actions ────────────────────────────────────────────────────────────

  function search(val: string) {
    query.value.search = val
    query.value.page = 1
    if (searchDebounce) clearTimeout(searchDebounce)
    searchDebounce = setTimeout(loadServices, 350)
  }

  function filterByCategory(id: string | null) {
    query.value.categoryId = query.value.categoryId === id ? null : id
    query.value.page = 1
    loadServices()
  }

  function filterByProvider(id: string | null) {
    query.value.userId = query.value.userId === id ? null : id
    query.value.page = 1
    loadServices()
  }

  function changeSort(sort: ServiceSortBy) {
    query.value.sort = sort
    query.value.page = 1
    loadServices()
  }

  function changePage(page: number) {
    query.value.page = page
    loadServices()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetFilters() {
    query.value = { search: '', categoryId: null, userId: null, sort: 'relevance', page: 1 }
    loadServices()
  }

  // ─── Tracking ───────────────────────────────────────────────────────────

  function getOrCreateSessionId(): string {
    if (typeof sessionStorage === 'undefined') return ''
    let sid = sessionStorage.getItem('_svcSid')
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36)
      sessionStorage.setItem('_svcSid', sid)
    }
    return sid
  }

  function trackServiceEvent(
    serviceId: string,
    type: 'VIEW' | 'PROFILE_VISIT' | 'REQUEST',
    headers?: Record<string, string>,
  ) {
    const sessionId = getOrCreateSessionId()
    $fetch(`${base}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(headers ?? {}) },
      body: { serviceId, type, sessionId },
    }).catch(() => {})
  }

  // ─── Expose ─────────────────────────────────────────────────────────────

  return {
    services,
    categories,
    providers,
    loading,
    loadingCategories,
    error,
    total,
    totalPages,
    query: computed(() => query.value),
    loadCategories,
    loadProviders,
    loadServices,
    search,
    filterByCategory,
    filterByProvider,
    changeSort,
    changePage,
    resetFilters,
    trackServiceEvent,
  }
}
