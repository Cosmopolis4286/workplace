import { ref, computed } from 'vue'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface JobCategory {
  id: string
  name: string
  color: string
  icon: string | null
  description: string | null
  jobCount: number
}

export interface JobEmployer {
  id: string
  firstName: string
  lastName: string
  username: string | null
  avatar: string | null
  country?: string | null
  state?: string | null
  city?: string | null
  category: { name: string } | null
  subcategory: { name: string } | null
}

export interface Job {
  id: string
  title: string
  description: string
  requirements: string[]
  benefits: string[]
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string
  location: string | null
  type: 'TIEMPO_COMPLETO' | 'MEDIO_TIEMPO' | 'FREELANCE' | 'TEMPORAL' | 'PRACTICAS'
  modality: 'PRESENCIAL' | 'REMOTO' | 'HIBRIDO'
  experienceLevel: string | null
  tags: string[]
  status: string
  expiresAt: string | null
  createdAt: string
  category: {
    id: string
    name: string
    color: string
    icon: string | null
  } | null
  employer: JobEmployer
  _count?: {
    applications: number
  }
}

export type JobSortBy = 'relevance' | 'newest' | 'salary_asc' | 'salary_desc'
type LocationTier = 'city' | 'state' | 'country' | null

export interface JobQuery {
  search: string
  categoryId: string | null
  type: string | null
  modality: string | null
  sort: JobSortBy
  page: number
  nearMe: boolean
  country: string
  state: string
  city: string
}

// ─── Module-level singleton state ─────────────────────────────────────────────

const jobs = ref<Job[]>([])
const categories = ref<JobCategory[]>([])
const loading = ref(false)
const loadingCategories = ref(false)
const error = ref<string | null>(null)
const total = ref(0)
const totalPages = ref(1)
const locationTier = ref<LocationTier>(null)

const query = ref<JobQuery>({
  search: '',
  categoryId: null,
  type: null,
  modality: null,
  sort: 'relevance',
  page: 1,
  nearMe: false,
  country: '',
  state: '',
  city: '',
})

let searchDebounce: ReturnType<typeof setTimeout> | null = null

// ─── Composable ──────────────────────────────────────────────────────────────

export const useJobs = () => {
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string
  const base = `${apiUrl}/jobs`

  // ─── Fetch helpers ──────────────────────────────────────────────────────

  async function loadCategories() {
    loadingCategories.value = true
    try {
      const res = await $fetch<{ data: JobCategory[] }>(`${base}/categories`)
      categories.value = res.data
    } catch {
      // silently fail
    } finally {
      loadingCategories.value = false
    }
  }

  async function loadJobs() {
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
      if (q.type) params.type = q.type
      if (q.modality) params.modality = q.modality

      if (q.nearMe) {
        const { user } = useAuth()
        const u = user.value
        if (u?.city) params.city = u.city
        if (u?.state) params.state = u.state
        if (u?.country) params.country = u.country
      } else {
        if (q.city) params.city = q.city
        if (q.state) params.state = q.state
        if (q.country) params.country = q.country
      }

      const res = await $fetch<{ data: Job[]; total: number; totalPages: number; locationTier?: LocationTier }>(
        `${base}/catalog`,
        { params },
      )
      jobs.value = res.data
      total.value = res.total
      totalPages.value = res.totalPages
      locationTier.value = (q.nearMe || q.country || q.state || q.city) ? (res.locationTier ?? null) : null
    } catch (e: any) {
      error.value = e?.data?.message ?? 'Error al cargar empleos'
    } finally {
      loading.value = false
    }
  }

  // ─── Actions ────────────────────────────────────────────────────────────

  function search(val: string) {
    query.value.search = val
    query.value.page = 1
    if (searchDebounce) clearTimeout(searchDebounce)
    searchDebounce = setTimeout(loadJobs, 350)
  }

  function filterByCategory(id: string | null) {
    query.value.categoryId = query.value.categoryId === id ? null : id
    query.value.page = 1
    loadJobs()
  }

  function filterByType(type: string | null) {
    query.value.type = query.value.type === type ? null : type
    query.value.page = 1
    loadJobs()
  }

  function filterByModality(modality: string | null) {
    query.value.modality = query.value.modality === modality ? null : modality
    query.value.page = 1
    loadJobs()
  }

  function changeSort(sort: JobSortBy) {
    query.value.sort = sort
    query.value.page = 1
    loadJobs()
  }

  function changePage(page: number) {
    query.value.page = page
    loadJobs()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetFilters() {
    query.value = {
      search: '',
      categoryId: null,
      type: null,
      modality: null,
      sort: 'relevance',
      page: 1,
      nearMe: false,
      country: '',
      state: '',
      city: '',
    }
    loadJobs()
  }

  function toggleNearMe() {
    query.value.nearMe = !query.value.nearMe
    query.value.page = 1
    loadJobs()
  }

  function filterByLocation(country: string, state: string, city: string) {
    query.value.country = country
    query.value.state = state
    query.value.city = city
    query.value.nearMe = false
    query.value.page = 1
    loadJobs()
  }

  // ─── Expose ─────────────────────────────────────────────────────────────

  return {
    jobs,
    categories,
    loading,
    loadingCategories,
    error,
    total,
    totalPages,
    locationTier: computed(() => locationTier.value),
    query: computed(() => query.value),
    loadCategories,
    loadJobs,
    search,
    filterByCategory,
    filterByType,
    filterByModality,
    changeSort,
    changePage,
    resetFilters,
    toggleNearMe,
    filterByLocation,
  }
}
