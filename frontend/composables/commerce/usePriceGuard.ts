import { useApi } from '../core/useApi'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MinPriceResult {
  productId: string
  currentPrice: number
  replacementCostUsd: number
  minMarginPct: number
  minPrice: number
  belowMinPrice: boolean
  usingReplacementCost: boolean
}

export interface PriceSimulationResult {
  productId: string
  currentPrice: number
  currentCostUsd: number
  costIncreasePct: number
  simulatedCostUsd: number
  simulatedMinPrice: number
  simulatedMarginPct: number | null
  belowSimulatedMinPrice: boolean
}

// ─── Composable ───────────────────────────────────────────────────────────────

export function usePriceGuard() {
  const { get, post } = useApi()

  async function getMinPrice(productId: string): Promise<MinPriceResult | null> {
    try {
      return await get<MinPriceResult>(`/price-guard/${productId}/min-price`)
    } catch {
      return null
    }
  }

  async function simulatePriceChange(
    productId: string,
    costIncreasePct: number,
  ): Promise<PriceSimulationResult | null> {
    try {
      return await post<PriceSimulationResult>(`/price-guard/${productId}/simulate`, { costIncreasePct })
    } catch {
      return null
    }
  }

  return { getMinPrice, simulatePriceChange }
}
