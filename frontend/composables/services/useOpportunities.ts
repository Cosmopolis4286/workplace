import { ref } from 'vue'
import { useApi } from '../core/useApi'

export interface ServiceOpportunity {
  categoryId: string
  categoryName: string
  categoryColor: string
  requestCount: number
  avgPrice: number | null
}

export interface UnmetQuery {
  query: string
  count: number
}

export interface OpportunitiesResult {
  data: ServiceOpportunity[]
  unmetQueries: UnmetQuery[]
  city: string | null
  periodDays: number
}

const opportunities = ref<ServiceOpportunity[]>([])
const unmetQueries = ref<UnmetQuery[]>([])
const periodDays = ref(30)
const loading = ref(false)
const error = ref<string | null>(null)

export const useOpportunities = () => {
  const { get } = useApi()

  async function loadOpportunities(city?: string) {
    loading.value = true
    error.value = null
    try {
      const qs = city ? `?city=${encodeURIComponent(city)}` : ''
      const result = await get<OpportunitiesResult>(`/services/opportunities${qs}`)
      opportunities.value = result.data
      unmetQueries.value = result.unmetQueries
      periodDays.value = result.periodDays
    } catch (err: any) {
      error.value = err?.message ?? 'Error al cargar las oportunidades'
    } finally {
      loading.value = false
    }
  }

  return {
    opportunities,
    unmetQueries,
    periodDays,
    loading,
    error,
    loadOpportunities,
  }
}
