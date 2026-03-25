/**
 * Singleton composable that loads the active default exchange rate once
 * and exposes a helper to convert USD amounts to the local currency.
 *
 * Usage anywhere in the app:
 *   const { defaultRate, convert, convertLabel } = useDefaultRate()
 */
import { ref, computed } from 'vue'

interface ExchangeRate {
  id: string
  code: string
  name: string
  symbol: string
  rateToUsd: number
  isDefault: boolean
  isActive: boolean
}

// ─── Module-level singleton ───────────────────────────────────────────────────

const defaultRate = ref<ExchangeRate | null>(null)
const loading = ref(false)
let fetched = false

export function useDefaultRate() {
  const config = useRuntimeConfig()
  const base = config.public.apiUrl as string
  const { getHeaders, refreshAccessToken } = useAuth()

  async function load() {
    if (fetched || loading.value) return
    loading.value = true
    try {
      const headers = { 'Content-Type': 'application/json', ...getHeaders() }
      let res = await fetch(`${base}/exchange-rates/default`, { headers })
      if (res.status === 401) {
        const refreshed = await refreshAccessToken()
        if (refreshed) {
          const retryHeaders = { 'Content-Type': 'application/json', ...getHeaders() }
          res = await fetch(`${base}/exchange-rates/default`, { headers: retryHeaders })
        }
      }
      if (res.ok) {
        const data = await res.json()
        defaultRate.value = data   // null body → rate stays null
      }
      fetched = true
    } catch {
      // non-critical: price cards just won't show conversion
    } finally {
      loading.value = false
    }
  }

  /** Convert a USD amount to the default currency. Returns null if no rate. */
  function convert(usd: number): number | null {
    if (!defaultRate.value) return null
    return +(usd * defaultRate.value.rateToUsd).toFixed(2)
  }

  /** Human-readable label, e.g. "Bs. 3,650.00" */
  function convertLabel(usd: number): string | null {
    const converted = convert(usd)
    if (converted === null || !defaultRate.value) return null
    const formatted = converted.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return `${defaultRate.value.symbol} ${formatted}`
  }

  /** e.g. "1 USD = Bs. 36.50" */
  const rateLabel = computed(() => {
    if (!defaultRate.value) return null
    return `1 USD = ${defaultRate.value.symbol} ${defaultRate.value.rateToUsd.toLocaleString('es-VE', { maximumFractionDigits: 4 })}`
  })

  return { defaultRate, loading, load, convert, convertLabel, rateLabel }
}
