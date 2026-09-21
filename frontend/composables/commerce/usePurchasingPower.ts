import { ref } from 'vue'
import { useApi } from '../core/useApi'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PurchasingPowerBasketItem {
  productId: string
  productName: string
  quantity: number
  currentUnitCostUsd: number
  previousUnitCostUsd: number
  changePct: number | null
}

export interface PurchasingPower {
  commerceId: string
  hasData: boolean
  reason?: string
  windowDays?: number
  basketSize: number
  valueAtPreviousPrices?: number
  valueAtCurrentPrices?: number
  purchasingPowerChangePct: number | null
  basket: PurchasingPowerBasketItem[]
}

// ─── Composable ───────────────────────────────────────────────────────────────

export function usePurchasingPower() {
  const { get } = useApi()

  const purchasingPower = ref<PurchasingPower | null>(null)
  const loading = ref(false)

  async function loadPurchasingPower() {
    loading.value = true
    try {
      purchasingPower.value = await get<PurchasingPower>('/purchasing-power')
    } catch {
      purchasingPower.value = null
    } finally {
      loading.value = false
    }
  }

  return { purchasingPower, loading, loadPurchasingPower }
}
