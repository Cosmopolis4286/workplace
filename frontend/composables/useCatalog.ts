export interface CatalogCategory {
  id: string
  name: string
  color: string
  productCount: number
}

export interface CatalogRestaurant {
  id: string
  name: string
  type: string | null
  productCount: number
}

export interface CatalogProduct {
  id: string
  name: string
  description?: string
  price: number
  image?: string
  preparationTime?: number
  calories?: number
  unit?: string
  status: string
  category: { id: string; name: string; color: string }
  commerce: { id: string; name: string; type: string | null; country?: string | null; state?: string | null; city?: string | null; user?: { username: string | null; rating: number | null; reviewsCount: number } }
}

export interface CatalogProductDetail extends CatalogProduct {
  ingredients: string[]
  allergens: string[]
  commerce: { id: string; name: string; type: string | null; address?: string; phone?: string; user?: { username: string | null; rating: number | null; reviewsCount: number } }
}

export type CatalogSortBy = 'relevance' | 'price_asc' | 'price_desc' | 'name' | 'rating_desc' | 'best_seller'

export interface CatalogQuery {
  search: string
  categoryName: string
  commerceId: string
  priceMin: number | null
  priceMax: number | null
  page: number
  limit: number
  sort: CatalogSortBy
  nearMe: boolean
  country: string
  state: string
  city: string
}

export type LocationTier = 'city' | 'state' | 'country' | null

// ─── Singleton state ────────────────────────────────────────────────────────
const products = ref<CatalogProduct[]>([])
const categories = ref<CatalogCategory[]>([])
const restaurants = ref<CatalogRestaurant[]>([])
const loading = ref(false)
const loadingCategories = ref(false)
const loadingDetail = ref(false)
const productDetail = ref<CatalogProductDetail | null>(null)
const error = ref<string | null>(null)
const total = ref(0)
const totalPages = ref(0)
const locationTier = ref<LocationTier>(null)
const query = ref<CatalogQuery>({
  search: '',
  categoryName: '',
  commerceId: '',
  priceMin: null,
  priceMax: null,
  page: 1,
  limit: 20,
  sort: 'relevance',
  nearMe: false,
  country: '',
  state: '',
  city: '',
})

// ─── Favorites (localStorage) ─────────────────────────────────────────────
const favorites = ref<string[]>([])

function initFavorites() {
  if (!process.client) return
  try {
    const stored = localStorage.getItem('catalog_favorites')
    favorites.value = stored ? JSON.parse(stored) : []
  } catch {
    favorites.value = []
  }
}

if (process.client) initFavorites()

let searchTimeout: ReturnType<typeof setTimeout> | null = null

export const useCatalog = () => {
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string
  const { getHeaders, refreshAccessToken } = useAuth()

  async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = { ...getHeaders(), 'Content-Type': 'application/json', ...options.headers }
    const res = await fetch(`${apiUrl}${path}`, { ...options, headers })

    if (res.status === 401) {
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        const retryHeaders = { ...getHeaders(), 'Content-Type': 'application/json' }
        const retry = await fetch(`${apiUrl}${path}`, { ...options, headers: retryHeaders })
        if (!retry.ok) throw new Error(`HTTP ${retry.status}`)
        return retry.json()
      }
      throw new Error('No autorizado')
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.message || `HTTP ${res.status}`)
    }
    return res.json()
  }

  async function loadCategories() {
    loadingCategories.value = true
    try {
      const res = await apiFetch<{ data: CatalogCategory[] }>('/catalog/categories')
      categories.value = res.data
    } catch {
      // non-fatal
    } finally {
      loadingCategories.value = false
    }
  }

  async function loadRestaurants() {
    try {
      const res = await apiFetch<{ data: CatalogRestaurant[] }>('/catalog/restaurants')
      restaurants.value = res.data
    } catch {
      // non-fatal
    }
  }

  async function loadProducts() {
    loading.value = true
    error.value = null
    try {
      const q = query.value
      const params = new URLSearchParams()
      if (q.search) params.set('search', q.search)
      if (q.categoryName) params.set('categoryName', q.categoryName)
      if (q.commerceId) params.set('commerceId', q.commerceId)
      if (q.priceMin !== null) params.set('priceMin', String(q.priceMin))
      if (q.priceMax !== null) params.set('priceMax', String(q.priceMax))
      params.set('page', String(q.page))
      params.set('limit', String(q.limit))
      params.set('sort', q.sort)

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

      const res = await apiFetch<{
        data: CatalogProduct[]
        total: number
        totalPages: number
        page: number
        locationTier?: LocationTier
      }>(`/catalog/products?${params}`)

      products.value = res.data
      total.value = res.total
      totalPages.value = res.totalPages
      locationTier.value = (q.nearMe || q.country || q.state || q.city) ? (res.locationTier ?? null) : null
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Error al cargar productos'
    } finally {
      loading.value = false
    }
  }

  async function fetchProduct(id: string): Promise<CatalogProductDetail | null> {
    loadingDetail.value = true
    productDetail.value = null
    try {
      const res = await apiFetch<{ data: CatalogProductDetail }>(`/catalog/products/${id}`)
      productDetail.value = res.data
      return res.data
    } catch {
      return null
    } finally {
      loadingDetail.value = false
    }
  }

  function search(term: string) {
    query.value.search = term
    query.value.page = 1
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => loadProducts(), 350)
  }

  function filterByCategory(name: string) {
    query.value.categoryName = query.value.categoryName === name ? '' : name
    query.value.page = 1
    loadProducts()
  }

  function filterByRestaurant(id: string) {
    query.value.commerceId = query.value.commerceId === id ? '' : id
    query.value.page = 1
    loadProducts()
  }

  function filterByPriceRange(min: number | null, max: number | null) {
    query.value.priceMin = min
    query.value.priceMax = max
    query.value.page = 1
    loadProducts()
  }

  function changePage(page: number) {
    query.value.page = page
    loadProducts()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function changeSort(sort: CatalogQuery['sort']) {
    query.value.sort = sort
    query.value.page = 1
    loadProducts()
  }

  function resetFilters() {
    query.value = {
      search: '', categoryName: '', commerceId: '', priceMin: null, priceMax: null,
      page: 1, limit: 20, sort: 'relevance', nearMe: false,
      country: '', state: '', city: '',
    }
    loadProducts()
  }

  function toggleNearMe() {
    query.value.nearMe = !query.value.nearMe
    query.value.page = 1
    loadProducts()
  }

  function filterByLocation(country: string, state: string, city: string) {
    query.value.country = country
    query.value.state = state
    query.value.city = city
    query.value.nearMe = false
    query.value.page = 1
    loadProducts()
  }

  // ─── Favorites ────────────────────────────────────────────────────────────
  function toggleFavorite(productId: string) {
    const idx = favorites.value.indexOf(productId)
    favorites.value = idx === -1
      ? [...favorites.value, productId]
      : favorites.value.filter(id => id !== productId)
    if (process.client) {
      localStorage.setItem('catalog_favorites', JSON.stringify(favorites.value))
    }
  }

  function isFavorite(productId: string): boolean {
    return favorites.value.includes(productId)
  }

  function clearAllFavorites() {
    favorites.value = []
    if (process.client) localStorage.removeItem('catalog_favorites')
  }

  return {
    // state
    products: readonly(products),
    categories: readonly(categories),
    restaurants: readonly(restaurants),
    loading: readonly(loading),
    loadingCategories: readonly(loadingCategories),
    loadingDetail: readonly(loadingDetail),
    productDetail: readonly(productDetail),
    error: readonly(error),
    total: readonly(total),
    totalPages: readonly(totalPages),
    query: readonly(query),
    favorites: readonly(favorites),
    locationTier: readonly(locationTier),
    // actions
    loadCategories,
    loadRestaurants,
    loadProducts,
    fetchProduct,
    search,
    filterByCategory,
    filterByRestaurant,
    filterByPriceRange,
    changePage,
    changeSort,
    resetFilters,
    toggleNearMe,
    filterByLocation,
    toggleFavorite,
    isFavorite,
    clearAllFavorites,
  }
}
