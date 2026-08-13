import { ref, computed, watch } from 'vue'
import { useExchangeRates } from '../wallets/useExchangeRates'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserPreferences {
  language: string
  currency: string   // ISO code, e.g. "VES", "USD"
  defaultSort: string
  pageSize: number
}

const LS_KEY = 'user_preferences'

// ─── Singleton state ──────────────────────────────────────────────────────────

const DEFAULT_PREFS: UserPreferences = {
  language: 'es',
  currency: '',
  defaultSort: 'relevance',
  pageSize: 20,
}

function lsGet(): UserPreferences {
  if (!process.client) return { ...DEFAULT_PREFS }
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

function lsSet(val: UserPreferences) {
  if (process.client) localStorage.setItem(LS_KEY, JSON.stringify(val))
}

const prefs = ref<UserPreferences>(lsGet())

export function useUserPreferences() {
  const { activeRates, fetchRates, rates } = useExchangeRates()

  // Auto-select: if no currency saved (or saved code no longer active), pick the
  // only active one, or the default one, or the first active one available.
  function autoSelectCurrency() {
    if (activeRates.value.length === 0) return

    const saved = prefs.value.currency
    const stillActive = saved && activeRates.value.some(r => r.code === saved)
    if (stillActive) return

    // Prefer isDefault, then first active
    const preferred =
      activeRates.value.find(r => r.isDefault) ?? activeRates.value[0]
    prefs.value = { ...prefs.value, currency: preferred.code }
    lsSet(prefs.value)
  }

  // Watch for when rates load
  watch(activeRates, autoSelectCurrency, { immediate: true })

  // ─── formatCurrency ────────────────────────────────────────────────────────

  // Resolves the active ExchangeRate object for the selected currency code.
  // Falls back to first active rate, then null.
  const selectedRate = computed(() => {
    const code = prefs.value.currency
    return (
      activeRates.value.find(r => r.code === code) ??
      activeRates.value.find(r => r.isDefault) ??
      activeRates.value[0] ??
      null
    )
  })

  // formatCurrency: reactive — uses the user's selected currency code for
  // Intl.NumberFormat. For currencies Intl doesn't know (e.g. VES→VEF) it
  // falls back to prefixing the symbol manually.
  const formatCurrency = computed(() => {
    const code = selectedRate.value?.code ?? 'USD'
    return (value: number | null | undefined): string => {
      if (value === null || value === undefined) return '—'
      try {
        return new Intl.NumberFormat('es-VE', {
          style: 'currency',
          currency: code,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value)
      } catch {
        // Intl doesn't know this currency code — format manually
        const sym = selectedRate.value?.symbol ?? code
        return `${sym} ${value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }
    }
  })

  // ─── Persist ──────────────────────────────────────────────────────────────

  function savePreferences(updates: Partial<UserPreferences>) {
    prefs.value = { ...prefs.value, ...updates }
    lsSet(prefs.value)
  }

  return {
    prefs,
    selectedRate,
    activeRates,
    formatCurrency,
    savePreferences,
    fetchRates,
    autoSelectCurrency,
  }
}
