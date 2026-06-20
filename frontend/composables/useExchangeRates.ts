import { ref, computed } from 'vue'

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

// ─── Singleton state ──────────────────────────────────────────────────────────

const rates = ref<ExchangeRate[]>([])
const stats = ref<ExchangeRateStats | null>(null)
const loading = ref(false)
const loadingStats = ref(false)
const error = ref<string | null>(null)

export function useExchangeRates() {
  const config = useRuntimeConfig()
  const base = config.public.apiUrl as string
  const { getHeaders, refreshAccessToken } = useAuth()

  async function apiFetch(url: string, options: RequestInit = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...getHeaders(),
      ...(options.headers as Record<string, string> ?? {}),
    }
    const res = await fetch(`${base}${url}`, { ...options, headers })
    if (res.status === 401) {
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        const retryHeaders = { 'Content-Type': 'application/json', ...getHeaders() }
        const retry = await fetch(`${base}${url}`, { ...options, headers: retryHeaders })
        if (!retry.ok) {
          const body = await retry.json().catch(() => ({}))
          throw new Error(body.message ?? `Error ${retry.status}`)
        }
        return retry.json()
      }
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message ?? `Error ${res.status}`)
    }
    return res.json()
  }

  // ─── Fetch ────────────────────────────────────────────────────────────────────

  async function fetchRates(includeInactive = true, publicOnly = false) {
    loading.value = true
    error.value = null
    try {
      const url = publicOnly ? '/exchange-rates/active' : `/exchange-rates?includeInactive=${includeInactive}`
      const data = await apiFetch(url)
      rates.value = data
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function fetchStats() {
    loadingStats.value = true
    try {
      stats.value = await apiFetch('/exchange-rates/stats')
    } catch {
      // non-critical
    } finally {
      loadingStats.value = false
    }
  }

  // ─── Mutations ────────────────────────────────────────────────────────────────

  async function createRate(dto: Partial<ExchangeRate>) {
    const data = await apiFetch('/exchange-rates', {
      method: 'POST',
      body: JSON.stringify(dto),
    })
    rates.value.push(data)
    return data
  }

  async function updateRate(id: string, dto: Partial<ExchangeRate>) {
    const data = await apiFetch(`/exchange-rates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    })
    const idx = rates.value.findIndex((r: ExchangeRate) => r.id === id)
    if (idx >= 0) rates.value[idx] = data
    return data
  }

  async function setDefault(id: string) {
    const data = await apiFetch(`/exchange-rates/${id}/set-default`, { method: 'PATCH' })
    // update local state: clear previous default, set new one
    rates.value = rates.value.map((r: ExchangeRate) => ({ ...r, isDefault: r.id === id ? data.isDefault : false }))
    rates.value[rates.value.findIndex((r: ExchangeRate) => r.id === id)] = data
    return data
  }

  async function toggleStatus(id: string) {
    const data = await apiFetch(`/exchange-rates/${id}/toggle-status`, { method: 'PATCH' })
    const idx = rates.value.findIndex((r: ExchangeRate) => r.id === id)
    if (idx >= 0) rates.value[idx] = data
    return data
  }

  async function deleteRate(id: string) {
    await apiFetch(`/exchange-rates/${id}`, { method: 'DELETE' })
    rates.value = rates.value.filter((r: ExchangeRate) => r.id !== id)
  }

  async function toggleAutoSync(code: string, enabled: boolean) {
    const data = await apiFetch(`/exchange-rates/${code}/auto-sync`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    })
    // Update local state
    const idx = rates.value.findIndex((r: ExchangeRate) => r.code === code)
    if (idx >= 0) {
      rates.value[idx] = { ...rates.value[idx], autoSync: enabled }
    }
    return data
  }

  async function manualSync(code: string) {
    return await apiFetch(`/exchange-rates/sync/${code}`, { method: 'POST' })
  }

  async function getSyncStatus(code: string) {
    return await apiFetch(`/exchange-rates/sync-status/${code}`)
  }

  async function fetchHistory(id: string, limit = 50): Promise<ExchangeRateHistoryEntry[]> {
    return await apiFetch(`/exchange-rates/${id}/history?limit=${limit}`)
  }

  // ─── Public utils ─────────────────────────────────────────────────────────────

  async function fetchPublicRates() {
    try {
      return await apiFetch('/exchange-rates/public')
    } catch {
      return []
    }
  }

  async function convertAmount(amountUsd: number) {
    try {
      return await apiFetch(`/exchange-rates/convert?amount=${amountUsd}`)
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
    getSyncStatus,
    fetchHistory,
    fetchPublicRates,
    convertAmount,
    formatRate,
    formatConversion,
  }
}
