import { ref } from 'vue'
import { useApi } from '../core/useApi'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Purchase {
  id: string
  productId: string
  product?: { id: string; name: string } | null
  supplierId?: string | null
  supplier?: { id: string; name: string } | null
  quantity: number
  unitCost: number
  currencyCode: string
  exchangeRateValue: number
  exchangeRateSource?: string | null
  unitCostUsd: number
  purchasedAt: string
  notes?: string | null
  commerceId: string
  createdAt: string
  updatedAt: string
}

export interface CreatePurchasePayload {
  productId: string
  supplierId?: string
  quantity: number
  unitCost: number
  currencyCode: string
  purchasedAt?: string
  notes?: string
}

export interface ReplacementCost {
  productId: string
  historicalCost: number
  price: number
  lastPurchaseCostUsd: number | null
  averageReplacementCostUsd: number | null
  marginHistoricalPct: number | null
  marginReplacementPct: number | null
  hasPurchaseData: boolean
  samplesUsed?: number
}

export interface PurchaseFilters {
  productId?: string
  supplierId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export interface MarginReportRow {
  productId: string
  productName: string
  price: number
  historicalCost: number
  averageReplacementCostUsd: number
  marginHistoricalPct: number | null
  marginReplacementPct: number | null
  marginDropPct: number | null
  samplesUsed: number
}

// ─── Global reactive state ────────────────────────────────────────────────────

const purchases = ref<Purchase[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const totalCount = ref(0)
const currentPage = ref(1)

const marginReport = ref<MarginReportRow[]>([])
const marginReportLoading = ref(false)
const marginReportTotal = ref(0)
const marginReportPage = ref(1)
const marginReportTotalPages = ref(1)

// ─── Composable ───────────────────────────────────────────────────────────────

export function usePurchases() {
  const { get, post, del } = useApi()

  async function loadPurchases(filters: PurchaseFilters = {}) {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
      })
      const qs = params.toString()
      const res = await get<{ data: Purchase[]; total: number; page: number }>(`/purchases${qs ? '?' + qs : ''}`)
      purchases.value = res.data
      totalCount.value = res.total
      currentPage.value = res.page
    } catch (e: any) {
      error.value = e?.message
    } finally {
      loading.value = false
    }
  }

  async function createPurchase(payload: CreatePurchasePayload): Promise<Purchase | null> {
    loading.value = true
    error.value = null
    try {
      const purchase = await post<Purchase>('/purchases', payload)
      purchases.value.unshift(purchase)
      totalCount.value++
      return purchase
    } catch (e: any) {
      error.value = e?.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function deletePurchase(id: string): Promise<boolean> {
    error.value = null
    try {
      await del(`/purchases/${id}`)
      purchases.value = purchases.value.filter(p => p.id !== id)
      totalCount.value--
      return true
    } catch (e: any) {
      error.value = e?.message
      return false
    }
  }

  async function getReplacementCost(productId: string): Promise<ReplacementCost | null> {
    try {
      return await get<ReplacementCost>(`/purchases/replacement-cost/${productId}`)
    } catch (e: any) {
      error.value = e?.message
      return null
    }
  }

  // Reporte de Costos: todos los productos con compras registradas,
  // ordenados por mayor caída de margen (histórico vs. reposición).
  async function loadMarginReport(page = 1) {
    marginReportLoading.value = true
    error.value = null
    try {
      const res = await get<{ data: MarginReportRow[]; total: number; page: number; totalPages: number }>(
        `/purchases/margin-report?page=${page}`,
      )
      marginReport.value = res.data
      marginReportTotal.value = res.total
      marginReportPage.value = res.page
      marginReportTotalPages.value = res.totalPages
    } catch (e: any) {
      error.value = e?.message ?? 'Error al cargar el reporte de márgenes'
    } finally {
      marginReportLoading.value = false
    }
  }

  return {
    // state
    purchases,
    loading,
    error,
    totalCount,
    currentPage,
    marginReport,
    marginReportLoading,
    marginReportTotal,
    marginReportPage,
    marginReportTotalPages,
    // actions
    loadPurchases,
    createPurchase,
    deletePurchase,
    getReplacementCost,
    loadMarginReport,
  }
}
