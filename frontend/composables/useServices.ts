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
    country?: string | null
    state?: string | null
    city?: string | null
    rating: number | null
    reviewsCount: number
    category: { name: string } | null
    subcategory: { name: string } | null
  }
}

export type ServiceSortBy = 'relevance' | 'price_asc' | 'price_desc' | 'name' | 'newest'
export type LocationTier = 'city' | 'state' | 'country' | null

export interface ServiceQuery {
  search: string
  categoryId: string | null
  userId: string | null
  sort: ServiceSortBy
  page: number
  nearMe: boolean
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
const locationTier = ref<LocationTier>(null)

const query = ref<ServiceQuery>({
  search: '',
  categoryId: null,
  userId: null,
  sort: 'relevance',
  page: 1,
  nearMe: false,
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

      if (q.nearMe) {
        const { user } = useAuth()
        const u = user.value
        if (u?.city) params.city = u.city
        if (u?.state) params.state = u.state
        if (u?.country) params.country = u.country
      }

      const res = await $fetch<{ data: CatalogService[]; total: number; totalPages: number; locationTier?: LocationTier }>(
        `${base}/catalog`,
        { params },
      )
      services.value = res.data
      total.value = res.total
      totalPages.value = res.totalPages
      locationTier.value = q.nearMe ? (res.locationTier ?? null) : null
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
    query.value = { search: '', categoryId: null, userId: null, sort: 'relevance', page: 1, nearMe: false }
    loadServices()
  }

  function toggleNearMe() {
    query.value.nearMe = !query.value.nearMe
    query.value.page = 1
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
    locationTier: computed(() => locationTier.value),
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
    toggleNearMe,
    trackServiceEvent,
  }
}
