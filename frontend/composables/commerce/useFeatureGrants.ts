import { ref } from 'vue'
import { useApi } from '../core/useApi'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FeatureUsageMode = 'SINGLE_USE' | 'MULTI_USE' | 'REACTIVATABLE'
export type FeatureGrantStatus = 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED' | 'REVOKED'

export interface FeatureGrant {
  id: string
  featureKey: string
  usageMode: FeatureUsageMode
  usesRemaining: number | null
  activatedAt: string
  expiresAt: string | null
  status: FeatureGrantStatus
}

export interface AvailableFeature {
  id: string
  featureKey: string
  durationDays: number
  usageMode: FeatureUsageMode
  maxUses: number | null
  label: string | null
  currentlyActive: boolean
}

// ─── Composable ───────────────────────────────────────────────────────────────

export function useFeatureGrants() {
  const { get, post } = useApi()

  const myGrants = ref<FeatureGrant[]>([])
  const availableFeatures = ref<AvailableFeature[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadMyGrants() {
    loading.value = true
    error.value = null
    try {
      myGrants.value = await get<FeatureGrant[]>('/feature-grants/mine')
    } catch (e: any) {
      error.value = e?.message
    } finally {
      loading.value = false
    }
  }

  async function loadAvailableFeatures() {
    loading.value = true
    error.value = null
    try {
      availableFeatures.value = await get<AvailableFeature[]>('/feature-grants/available')
    } catch (e: any) {
      error.value = e?.message
    } finally {
      loading.value = false
    }
  }

  async function activateFeature(featureKey: string): Promise<boolean> {
    error.value = null
    try {
      await post(`/feature-grants/activate/${featureKey}`, {})
      await Promise.all([loadMyGrants(), loadAvailableFeatures()])
      return true
    } catch (e: any) {
      error.value = e?.message
      return false
    }
  }

  return {
    myGrants,
    availableFeatures,
    loading,
    error,
    loadMyGrants,
    loadAvailableFeatures,
    activateFeature,
  }
}
