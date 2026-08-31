import { ref } from 'vue'
import { useApi } from '../core/useApi'
import type { CatalogService } from '../services/useServices'

export interface NeedSearchResult {
  searchId: string
  category: string
  budgetMax: number | null
  results: CatalogService[]
  total: number
}

export interface ConfirmNeedPayload {
  searchId: string
  serviceId: string
  preferredDate: string
  preferredTime?: string
  address?: string
  phone?: string
  description?: string
}

/**
 * Base sin LLM del AI Agent orquestador (WORKPLACE_VISION.md §4/§16) — recibe
 * la necesidad ya estructurada (categoría + presupuesto), no texto libre
 * todavía. Envuelve POST /ai/needs/search y /ai/needs/confirm.
 */
export function useAiNeeds() {
  const { post } = useApi()

  const searching = ref(false)
  const confirming = ref(false)
  const error = ref<string | null>(null)
  const lastSearch = ref<NeedSearchResult | null>(null)

  async function searchNeed(categoryId: string, budgetMax?: number): Promise<NeedSearchResult> {
    searching.value = true
    error.value = null
    try {
      const result = await post<NeedSearchResult>('/ai/needs/search', {
        categoryId,
        budgetMax: budgetMax || undefined,
      })
      lastSearch.value = result
      return result
    } catch (e: any) {
      error.value = e?.message ?? 'No se pudo buscar. Intenta de nuevo.'
      throw e
    } finally {
      searching.value = false
    }
  }

  async function confirmNeed(payload: ConfirmNeedPayload) {
    confirming.value = true
    error.value = null
    try {
      return await post('/ai/needs/confirm', payload)
    } catch (e: any) {
      error.value = e?.message ?? 'No se pudo enviar la solicitud. Intenta de nuevo.'
      throw e
    } finally {
      confirming.value = false
    }
  }

  return { searching, confirming, error, lastSearch, searchNeed, confirmNeed }
}
