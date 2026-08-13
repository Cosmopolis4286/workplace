import { ref, computed } from 'vue'
import { useApi } from '../core/useApi'

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
  type: 'FULL_TIME' | 'PART_TIME' | 'FREELANCE' | 'TEMPORARY' | 'INTERNSHIP'
  modality: 'IN_PERSON' | 'REMOTE' | 'HYBRID'
  experienceLevel: string | null
  tags: string[]
  status: 'ACTIVE' | 'PAUSED' | 'INACTIVE' | 'CLOSED'
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

export interface CreateJobData {
  title: string
  description: string
  requirements?: string[]
  benefits?: string[]
  salaryMin?: number
  salaryMax?: number
  salaryCurrency?: string
  location?: string
  type?: Job['type']
  modality?: Job['modality']
  experienceLevel?: string
  tags?: string[]
  categoryId?: string
  expiresAt?: string
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

// ─── "Mis empleos" (gestión, autenticado) ─────────────────────────────────────
const myJobs = ref<JobWithApplicationCount[]>([])
const myJobsLoading = ref(false)
const myJobsError = ref<string | null>(null)
const myJobsStats = ref({ total: 0, activos: 0, pausados: 0, inactivos: 0, cerrados: 0 })

export interface JobWithApplicationCount extends Job {
  _count: { applications: number }
}

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
  const { get, post, patch, del } = useApi()

  // ─── Mis empleos (gestión, autenticado) ──────────────────────────────────

  async function fetchMyJobsStats() {
    try {
      myJobsStats.value = await get<typeof myJobsStats.value>('/jobs/mine/stats')
    } catch {
      // non-blocking: las tarjetas de resumen no deben tumbar la página
    }
  }

  async function fetchMyJobs() {
    myJobsLoading.value = true
    myJobsError.value = null
    try {
      const res = await get<{ data: JobWithApplicationCount[] }>('/jobs/mine/all')
      myJobs.value = res.data
    } catch (e: any) {
      myJobsError.value = e?.message ?? 'Error al cargar empleos'
    } finally {
      myJobsLoading.value = false
    }
  }

  async function createJob(data: CreateJobData) {
    const res = await post<JobWithApplicationCount>('/jobs', data)
    myJobs.value.unshift(res)
    fetchMyJobsStats()
    return res
  }

  async function updateJob(id: string, data: Partial<CreateJobData> & { status?: Job['status'] }) {
    const res = await patch<JobWithApplicationCount>(`/jobs/${id}`, data)
    const idx = myJobs.value.findIndex(j => j.id === id)
    const statusChanged = idx !== -1 && myJobs.value[idx].status !== res.status
    if (idx !== -1) myJobs.value[idx] = res
    if (statusChanged) fetchMyJobsStats()
    return res
  }

  // No hay endpoint de toggle dedicado: el backend acepta `status` directo en
  // el PATCH genérico de update, así que el toggle es un caso particular de él.
  async function toggleJobStatus(job: JobWithApplicationCount) {
    const next = job.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    return updateJob(job.id, { status: next })
  }

  async function deleteJob(id: string) {
    await del(`/jobs/${id}`)
    myJobs.value = myJobs.value.filter(j => j.id !== id)
    fetchMyJobsStats()
  }

  // ─── Fetch helpers (catálogo público) ────────────────────────────────────

  async function loadCategories() {
    loadingCategories.value = true
    try {
      const res = await get<{ data: JobCategory[] }>('/jobs/categories')
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
      const params = new URLSearchParams({
        page: String(q.page),
        limit: '16',
        sort: q.sort,
      })
      if (q.search) params.set('search', q.search)
      if (q.categoryId) params.set('categoryId', q.categoryId)
      if (q.type) params.set('type', q.type)
      if (q.modality) params.set('modality', q.modality)

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

      const res = await get<{ data: Job[]; total: number; totalPages: number; locationTier?: LocationTier }>(
        `/jobs/catalog?${params}`,
      )
      jobs.value = res.data
      total.value = res.total
      totalPages.value = res.totalPages
      locationTier.value = (q.nearMe || q.country || q.state || q.city) ? (res.locationTier ?? null) : null
    } catch (e: any) {
      error.value = e?.message ?? 'Error al cargar empleos'
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
    // Mis empleos (gestión)
    myJobs,
    myJobsLoading,
    myJobsError,
    myJobsStats,
    fetchMyJobs,
    fetchMyJobsStats,
    createJob,
    updateJob,
    toggleJobStatus,
    deleteJob,
  }
}
