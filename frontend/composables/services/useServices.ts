import { ref, computed } from 'vue'
import { useApi } from './useApi'

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
  itemFields: string[]
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
type LocationTier = 'city' | 'state' | 'country' | null

export interface ServiceQuery {
  search: string
  categoryId: string | null
  userId: string | null
  sort: ServiceSortBy
  page: number
  nearMe: boolean
  country: string
  state: string
  city: string
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
  country: '',
  state: '',
  city: '',
})

let searchDebounce: ReturnType<typeof setTimeout> | null = null

// ─── Composable ──────────────────────────────────────────────────────────────

export const useServices = () => {
  const { get, post } = useApi()

  // ─── Fetch helpers ──────────────────────────────────────────────────────

  async function loadCategories() {
    loadingCategories.value = true
    try {
      const res = await get<{ data: ServiceCategory[] }>('/services/catalog/categories')
      categories.value = res.data
    } catch {
      // silently fail
    } finally {
      loadingCategories.value = false
    }
  }

  async function loadProviders() {
    try {
      const res = await get<{ data: ServiceProvider[] }>('/services/catalog/providers')
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
      const params = new URLSearchParams({
        page: String(q.page),
        limit: '16',
        sort: q.sort,
      })
      if (q.search) params.set('search', q.search)
      if (q.categoryId) params.set('categoryId', q.categoryId)
      if (q.userId) params.set('userId', q.userId)

      if (q.nearMe) {
        const { user } = useAuth()
        const u = user.value
        if (u?.city) params.set('city', u.city)
        if (u?.state) params.set('state', u.state)
        if (u?.country) params.set('country', u.country)
      } else {
        if (q.city) params.set('city', q.city)
        if (q.state) params.set('state', q.state)
        if (q.country) params.set('country', q.country)
      }

      const res = await get<{ data: CatalogService[]; total: number; totalPages: number; locationTier?: LocationTier }>(
        `/services/catalog?${params}`,
      )
      services.value = res.data
      total.value = res.total
      totalPages.value = res.totalPages
      locationTier.value = (q.nearMe || q.country || q.state || q.city) ? (res.locationTier ?? null) : null
    } catch (e: any) {
      error.value = e?.message ?? 'Error al cargar servicios'
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
    query.value = {
      search: '', categoryId: null, userId: null, sort: 'relevance', page: 1, nearMe: false,
      country: '', state: '', city: '',
    }
    loadServices()
  }

  function toggleNearMe() {
    query.value.nearMe = !query.value.nearMe
    query.value.page = 1
    loadServices()
  }

  function filterByLocation(country: string, state: string, city: string) {
    query.value.country = country
    query.value.state = state
    query.value.city = city
    query.value.nearMe = false
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
  ) {
    const sessionId = getOrCreateSessionId()
    post('/services/track', { serviceId, type, sessionId }).catch(() => {})
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
    filterByLocation,
    trackServiceEvent,
  }
}
