import { ref } from 'vue'
import { useApi } from '../core/useApi'

/**
 * Precio en las dos monedas que se usan en Venezuela: el del comercio (USD o
 * VES) y su equivalente con la tasa vigente (BCV, sincronizada en el
 * backend). La tasa se pide una sola vez por sesión al endpoint público.
 */
const vesPerUsd = ref<number | null>(null)
let loading: Promise<void> | null = null

export function useDualPrice() {
  const { get } = useApi()

  function loadRate() {
    if (vesPerUsd.value !== null) return Promise.resolve()
    if (!loading) {
      loading = get<{ code: string; rateToUsd: number }[]>('/exchange-rates/active')
        .then((rates) => {
          const ves = rates.find(r => r.code === 'VES')
          vesPerUsd.value = ves && Number(ves.rateToUsd) > 0 ? Number(ves.rateToUsd) : null
        })
        .catch(() => { vesPerUsd.value = null })
        .finally(() => { loading = null })
    }
    return loading
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  /** Precio principal en la moneda del comercio. */
  function primary(amount: number, currency: string | null | undefined) {
    return currency === 'VES' ? `Bs ${fmt(amount)}` : `$${fmt(amount)}`
  }

  /** Equivalente en la otra moneda, o null si no hay tasa. */
  function secondary(amount: number, currency: string | null | undefined) {
    const rate = vesPerUsd.value
    if (!rate) return null
    return currency === 'VES' ? `≈ $${fmt(amount / rate)}` : `≈ Bs ${fmt(amount * rate)}`
  }

  return { loadRate, primary, secondary, vesPerUsd }
}
