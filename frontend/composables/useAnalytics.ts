import { ref, computed } from 'vue'
import { useAuth } from './useAuth'
import { useUserPreferences } from './useUserPreferences'

export type AnalyticsPeriod = 'today' | '7d' | 'week' | '30d' | 'quarter' | '90d' | '1y' | 'custom'
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
  previousDateRange: { from: string; to: string } | null
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

export const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  today: 'Hoy',
  week: 'Esta Semana',
  '7d': 'Últimos 7 días',
  '30d': 'Últimos 30 días',
  quarter: 'Este Trimestre',
  '90d': 'Últimos 90 días',
  '1y': 'Este Año',
  custom: 'Personalizado',
}

export const useAnalytics = () => {
  const { getHeaders, refreshAccessToken } = useAuth()
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string
  const router = useRouter()

  // ─── Computed chart data (Chart.js ready) ──────────────────────────────────

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
          pointBackgroundColor: '#ef4444',
          pointRadius: 3,
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
          backgroundColor: '#f97316',
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
        changeType: changeType(kpis.totalRevenueChange),
      },
      {
        label: 'Pedidos',
        value: kpis.totalOrders.toLocaleString('es-MX'),
        change: formatChange(kpis.totalOrdersChange),
        changeType: changeType(kpis.totalOrdersChange),
      },
      {
        label: 'Ticket Promedio',
        value: formatCurrency(kpis.avgTicket),
        change: formatChange(kpis.avgTicketChange),
        changeType: changeType(kpis.avgTicketChange),
      },
      {
        label: 'Nuevos Clientes',
        value: kpis.newCustomers.toLocaleString('es-MX'),
        change: formatChange(kpis.newCustomersChange),
        changeType: changeType(kpis.newCustomersChange),
      },
    ]
  })

  // ─── Computed top products list (for table view) ───────────────────────────

  const topProductsList = computed(() => {
    if (!overview.value) return []
    const { labels, values, revenue } = overview.value.topProducts
    const maxUnits = Math.max(...values, 1)
    return labels.map((name, i) => ({
      name,
      sold: values[i],
      revenue: revenue[i],
      percentage: Math.round((values[i] / maxUnits) * 100),
    }))
  })

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const { formatCurrency: _fmt } = useUserPreferences()
  function formatCurrency(n: number): string { return _fmt.value(n) }

  function formatChange(pct: number | null): string {
    if (pct === null) return '—'
    return pct >= 0 ? `+${pct}%` : `${pct}%`
  }

  function changeType(pct: number | null): 'increase' | 'decrease' | 'neutral' {
    if (pct === null) return 'neutral'
    return pct >= 0 ? 'increase' : 'decrease'
  }

  function formatDateRange(from: string, to: string): string {
    const f = new Date(from)
    const t = new Date(to)
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
    return `${f.toLocaleDateString('es-MX', opts)} – ${t.toLocaleDateString('es-MX', opts)}`
  }

  // ─── Export ───────────────────────────────────────────────────────────────

  function exportReport() {
    if (!overview.value) return
    const blob = new Blob([JSON.stringify(overview.value, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const period = overview.value.period
    a.download = `reporte-${period}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── API ──────────────────────────────────────────────────────────────────

  async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      ...getHeaders(),
      ...(options.headers as Record<string, string> || {}),
    }
    return $fetch<T>(`${apiUrl}/analytics${path}`, { ...options, headers } as Parameters<typeof $fetch>[1])
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

  async function loadOverview(
    period: AnalyticsPeriod = '30d',
    compareWith: CompareWith = 'previous',
    dateFrom?: string,
    dateTo?: string,
  ) {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams({ period, compareWith })
      if (period === 'custom' && dateFrom && dateTo) {
        params.set('dateFrom', dateFrom)
        params.set('dateTo', dateTo)
      }
      const data = await withAuthRetry(() =>
        apiFetch<AnalyticsOverview>(`/overview?${params.toString()}`),
      )
      overview.value = data
    } catch (err: unknown) {
      error.value =
        (err as { data?: { message?: string } })?.data?.message ?? 'Error al cargar los reportes'
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
    topProductsList,
    headerStats,
    // helpers
    formatCurrency,
    formatChange,
    formatDateRange,
    // actions
    loadOverview,
    exportReport,
  }
}
