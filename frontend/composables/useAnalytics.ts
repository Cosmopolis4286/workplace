import { ref, computed } from 'vue'
import { useAuth } from './useAuth'

export type AnalyticsPeriod = '7d' | '30d' | '90d' | '1y'
export type CompareWith = 'previous' | 'year' | 'none'

export interface AnalyticsKpis {
  totalRevenue: number
  totalRevenueChange: number | null
  totalOrders: number
  totalOrdersChange: number | null
  avgTicket: number
  avgTicketChange: number | null
  newCustomers: number
  newCustomersChange: number | null
}

export interface ChartData {
  labels: string[]
  values: number[]
}

export interface TopProductsData extends ChartData {
  revenue: number[]
}

export interface OperationalMetrics {
  avgPrepTime: number
  avgDeliveryTime: number
  cancellationRate: number
  cancellations: number
  totalInPeriod: number
}

export interface GrowthMetrics {
  newCustomers: number
  retentionRate: number
  clv: number
  orderFrequency: number
  totalCustomers: number
}

export interface FinancialMetrics {
  grossMargin: number
  avgTicket: number
  totalRevenue: number
  totalOrders: number
}

export interface PerformanceMetrics {
  operational: OperationalMetrics
  growth: GrowthMetrics
  financial: FinancialMetrics
}

export interface AnalyticsOverview {
  period: AnalyticsPeriod
  compareWith: CompareWith
  dateRange: { from: string; to: string }
  kpis: AnalyticsKpis
  revenueTrend: ChartData
  ordersByHour: ChartData
  topProducts: TopProductsData
  customerSegments: ChartData
  performance: PerformanceMetrics
}

// ─── Global reactive state ────────────────────────────────────────────────────
const overview = ref<AnalyticsOverview | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

export const useAnalytics = () => {
  const { getHeaders, refreshAccessToken } = useAuth()
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string
  const router = useRouter()

  // ─── Computed chart data (Chart.js ready) ─────────────────────────────────

  const revenueChartData = computed(() => {
    if (!overview.value) return null
    const { labels, values } = overview.value.revenueTrend
    return {
      labels,
      datasets: [
        {
          label: 'Ingresos',
          data: values,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    }
  })

  const ordersHourChartData = computed(() => {
    if (!overview.value) return null
    const { labels, values } = overview.value.ordersByHour
    return {
      labels,
      datasets: [
        {
          label: 'Pedidos',
          data: values,
          backgroundColor: '#3b82f6',
          borderRadius: 4,
        },
      ],
    }
  })

  const topProductsChartData = computed(() => {
    if (!overview.value) return null
    const { labels, values } = overview.value.topProducts
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6']
    return {
      labels,
      datasets: [
        {
          label: 'Unidades vendidas',
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderRadius: 4,
        },
      ],
    }
  })

  const customerSegmentsChartData = computed(() => {
    if (!overview.value) return null
    const { labels, values } = overview.value.customerSegments
    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: ['#eab308', '#f97316', '#6b7280', '#ef4444'],
          borderWidth: 0,
        },
      ],
    }
  })

  const headerStats = computed(() => {
    if (!overview.value) return []
    const { kpis } = overview.value
    return [
      {
        label: 'Ingresos',
        value: formatCurrency(kpis.totalRevenue),
        change: formatChange(kpis.totalRevenueChange),
        changeType: kpis.totalRevenueChange !== null && kpis.totalRevenueChange >= 0 ? 'increase' : 'decrease',
      },
      {
        label: 'Pedidos',
        value: kpis.totalOrders.toLocaleString('es-MX'),
        change: formatChange(kpis.totalOrdersChange),
        changeType: kpis.totalOrdersChange !== null && kpis.totalOrdersChange >= 0 ? 'increase' : 'decrease',
      },
      {
        label: 'Ticket Promedio',
        value: formatCurrency(kpis.avgTicket),
        change: formatChange(kpis.avgTicketChange),
        changeType: kpis.avgTicketChange !== null && kpis.avgTicketChange >= 0 ? 'increase' : 'decrease',
      },
      {
        label: 'Nuevos Clientes',
        value: kpis.newCustomers.toLocaleString('es-MX'),
        change: formatChange(kpis.newCustomersChange),
        changeType: kpis.newCustomersChange !== null && kpis.newCustomersChange >= 0 ? 'increase' : 'decrease',
      },
    ]
  })

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function formatCurrency(n: number): string {
    return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
  }

  function formatChange(pct: number | null): string {
    if (pct === null) return '—'
    return pct >= 0 ? `+${pct}%` : `${pct}%`
  }

  // ─── API ──────────────────────────────────────────────────────────────────

  async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      ...getHeaders(),
      ...(options.headers as Record<string, string> || {}),
    }
    return $fetch<T>(`${apiUrl}/api/analytics${path}`, { ...options, headers } as Parameters<typeof $fetch>[1])
  }

  async function withAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (err: unknown) {
      const status =
        (err as { status?: number; statusCode?: number })?.status ??
        (err as { status?: number; statusCode?: number })?.statusCode
      if (status === 401) {
        const refreshed = await refreshAccessToken()
        if (!refreshed) {
          router.push('/login')
          throw err
        }
        return await fn()
      }
      throw err
    }
  }

  // ─── Load ─────────────────────────────────────────────────────────────────

  async function loadOverview(period: AnalyticsPeriod = '30d', compareWith: CompareWith = 'previous') {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams({ period, compareWith })
      const data = await withAuthRetry(() =>
        apiFetch<AnalyticsOverview>(`/overview?${params.toString()}`),
      )
      overview.value = data
    } catch (err: unknown) {
      error.value =
        (err as { data?: { message?: string } })?.data?.message ?? 'Error al cargar los analíticos'
    } finally {
      loading.value = false
    }
  }

  return {
    // state
    overview,
    loading,
    error,
    // computed chart data
    revenueChartData,
    ordersHourChartData,
    topProductsChartData,
    customerSegmentsChartData,
    headerStats,
    // helpers
    formatCurrency,
    formatChange,
    // actions
    loadOverview,
  }
}
