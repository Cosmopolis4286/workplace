import { ref, computed } from 'vue'
import { useApi } from '../core/useApi'
import { getApiErrorKind, type ApiErrorKind } from '../core/useApiErrors'

export interface ExchangeRate {
  id: string
  code: string
  name: string
  symbol: string
  rateToUsd: number
  isActive: boolean
  isDefault: boolean
  source: string | null
  notes: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
  // Auto-sync fields
  autoSync?: boolean
  lastSyncAt?: string | null
  syncSource?: string | null
  syncError?: string | null
  syncAttempts?: number
}

export interface ExchangeRateStats {
  total: number
  active: number
  inactive: number
  defaultCurrency: string | null
  defaultRate: number | null
}

export interface SyncStatusEntry {
  currencyCode: string
  lastSyncAt: string | null
  syncSource: string | null
  syncError: string | null
  syncAttempts: number
  autoSync: boolean
  currentRate: number | null
  isStale: boolean
}

export interface ExchangeRateHistoryEntry {
  id: string
  exchangeRateId: string
  code: string
  previousRate: number | null
  newRate: number
  source: string
  changedBy: string | null
  createdAt: string
}

export interface UsageCount {
  code: string
  total: number
  breakdown: {
    purchases: number
    supplierQuotes: number
    receivables: number
    payables: number
    groupBuying: number
  }
}

// ─── Singleton state ──────────────────────────────────────────────────────────

const rates = ref<ExchangeRate[]>([])
const stats = ref<ExchangeRateStats | null>(null)
const loading = ref(false)
const loadingStats = ref(false)
const error = ref<string | null>(null)
// Categoría del último error de fetchRates (offline/forbidden/server/...) —
// separado de `error` (que sigue siendo solo el string legible, usado por
// consumidores existentes) para que la UI pueda diferenciar mensaje/acción
// por caso sin romper la forma que ya usan otros componentes.
const errorKind = ref<ApiErrorKind | null>(null)

export function useExchangeRates() {
  const { get, post, put, patch, del } = useApi()

  // ─── Fetch ────────────────────────────────────────────────────────────────────

  async function fetchRates(includeInactive = true, publicOnly = false) {
    loading.value = true
    error.value = null
    errorKind.value = null
    try {
      const url = publicOnly ? '/exchange-rates/active' : `/exchange-rates?includeInactive=${includeInactive}`
      const data = await get<ExchangeRate[]>(url)
      rates.value = data
    } catch (e: any) {
      error.value = e?.message
      errorKind.value = getApiErrorKind(e)
    } finally {
      loading.value = false
    }
  }

  async function fetchStats() {
    loadingStats.value = true
    try {
      stats.value = await get<ExchangeRateStats>('/exchange-rates/stats')
    } catch {
      // non-critical
    } finally {
      loadingStats.value = false
    }
  }

  // ─── Mutations ────────────────────────────────────────────────────────────────

  async function createRate(dto: Partial<ExchangeRate>) {
    const data = await post<ExchangeRate>('/exchange-rates', dto)
    rates.value.push(data)
    return data
  }

  async function updateRate(id: string, dto: Partial<ExchangeRate>) {
    const data = await put<ExchangeRate>(`/exchange-rates/${id}`, dto)
    const idx = rates.value.findIndex((r: ExchangeRate) => r.id === id)
    if (idx >= 0) rates.value[idx] = data
    return data
  }

  async function setDefault(id: string) {
    const data = await patch<ExchangeRate>(`/exchange-rates/${id}/set-default`, {})
    // update local state: clear previous default, set new one
    rates.value = rates.value.map((r: ExchangeRate) => ({ ...r, isDefault: r.id === id ? data.isDefault : false }))
    rates.value[rates.value.findIndex((r: ExchangeRate) => r.id === id)] = data
    return data
  }

  async function toggleStatus(id: string) {
    const data = await patch<ExchangeRate>(`/exchange-rates/${id}/toggle-status`, {})
    const idx = rates.value.findIndex((r: ExchangeRate) => r.id === id)
    if (idx >= 0) rates.value[idx] = data
    return data
  }

  async function deleteRate(id: string) {
    await del(`/exchange-rates/${id}`)
    rates.value = rates.value.filter((r: ExchangeRate) => r.id !== id)
  }

  async function toggleAutoSync(code: string, enabled: boolean) {
    const data = await patch<ExchangeRate>(`/exchange-rates/${code}/auto-sync`, { enabled })
    // Update local state
    const idx = rates.value.findIndex((r: ExchangeRate) => r.code === code)
    if (idx >= 0) {
      rates.value[idx] = { ...rates.value[idx], autoSync: enabled }
    }
    return data
  }

  async function manualSync(code: string) {
    return await post(`/exchange-rates/sync/${code}`, {})
  }

  async function syncAll() {
    return await post<{ code: string; success: boolean; rate?: number; source?: string; message?: string }[]>('/exchange-rates/sync-all', {})
  }

  async function getSyncStatus(code: string) {
    return await get(`/exchange-rates/sync-status/${code}`)
  }

  async function getAllSyncStatuses() {
    return await get<SyncStatusEntry[]>('/exchange-rates/sync-status')
  }

  async function fetchHistory(id: string, limit = 50): Promise<ExchangeRateHistoryEntry[]> {
    return await get<ExchangeRateHistoryEntry[]>(`/exchange-rates/${id}/history?limit=${limit}`)
  }

  async function fetchUsageCount(id: string): Promise<UsageCount> {
    return await get<UsageCount>(`/exchange-rates/${id}/usage`)
  }

  // ─── Public utils ─────────────────────────────────────────────────────────────

  async function fetchPublicRates() {
    try {
      return await get('/exchange-rates/public')
    } catch {
      return []
    }
  }

  async function convertAmount(amountUsd: number) {
    try {
      return await get(`/exchange-rates/convert?amount=${amountUsd}`)
    } catch {
      return []
    }
  }

  // ─── Computed ─────────────────────────────────────────────────────────────────

  const activeRates = computed(() => rates.value.filter((r: ExchangeRate) => r.isActive))
  const defaultRate = computed(() => rates.value.find((r: ExchangeRate) => r.isDefault) ?? null)

  function formatRate(rate: ExchangeRate) {
    return `1 USD = ${rate.rateToUsd.toLocaleString('es-VE', { maximumFractionDigits: 4 })} ${rate.code}`
  }

  function formatConversion(amountUsd: number, rate: ExchangeRate) {
    const converted = amountUsd * rate.rateToUsd
    return `${rate.symbol} ${converted.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return {
    rates,
    stats,
    loading,
    loadingStats,
    error,
    errorKind,
    activeRates,
    defaultRate,
    fetchRates,
    fetchStats,
    createRate,
    updateRate,
    setDefault,
    toggleStatus,
    deleteRate,
    toggleAutoSync,
    manualSync,
    syncAll,
    getSyncStatus,
    getAllSyncStatuses,
    fetchHistory,
    fetchUsageCount,
    fetchPublicRates,
    convertAmount,
    formatRate,
    formatConversion,
  }
}
