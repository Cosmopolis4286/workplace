import { ref } from 'vue'
import { useApi } from '../core/useApi'

// ─── Types ────────────────────────────────────────────────────────────────────

export type BusinessHealthRating = 'SALUDABLE' | 'ACEPTABLE' | 'EN_RIESGO' | 'CRITICO' | 'SIN_DATOS'

export interface BusinessHealthComponent {
  key: string
  label: string
  score: number | null
  weight: number
  detail: Record<string, unknown>
}

export interface BusinessHealthScore {
  commerceId: string
  score: number | null
  confidence: number
  rating: BusinessHealthRating
  components: BusinessHealthComponent[]
}

// ─── Composable ───────────────────────────────────────────────────────────────

export function useBusinessHealth() {
  const { get } = useApi()

  const health = ref<BusinessHealthScore | null>(null)
  const loading = ref(false)

  async function loadHealth() {
    loading.value = true
    try {
      health.value = await get<BusinessHealthScore>('/business-health/score')
    } catch {
      health.value = null
    } finally {
      loading.value = false
    }
  }

  return { health, loading, loadHealth }
}
