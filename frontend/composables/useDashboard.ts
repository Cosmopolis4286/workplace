import { ref } from 'vue'
import { useAuth } from './useAuth'
import { useAuthFetch } from './useAuthFetch'
import { type Order, type OrderStats, type OrderStatus, NEXT_STATUS } from './useClienteDashboard'
import { useUserPreferences } from './useUserPreferences'
import { type DashboardPeriod } from './useDashboardPeriod'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardKpis {
  salesToday: number
  salesTodayChange: number | null
  activeOrders: number
  activeOrdersChange: number | null
  lowStockProducts: number
  lowStockChange: number | null
  newCustomers: number
  newCustomersChange: number | null
  avgPrepTime: number
  avgDeliveryTime: number
  customerSatisfaction: number
}

// ─── Global state (module-level singleton) ────────────────────────────────────

const kpis = ref<DashboardKpis>({
  salesToday: 0,
  salesTodayChange: null,
  activeOrders: 0,
  activeOrdersChange: null,
  lowStockProducts: 0,
  lowStockChange: null,
  newCustomers: 0,
  newCustomersChange: null,
  avgPrepTime: 0,
  avgDeliveryTime: 0,
  customerSatisfaction: 0,
})

// Valores anteriores para calcular cambio de bajo stock entre recargas
const prevLowStock = ref<number | null>(null)

const activeOrders = ref<Order[]>([])
const orderStats   = ref<OrderStats | null>(null)
const loading      = ref(false)
const error        = ref<string | null>(null)
const lastUpdated  = ref<Date | null>(null)

// ─── Composable ───────────────────────────────────────────────────────────────

export function useDashboard() {
  const { user } = useAuth()
  const { apiFetch } = useAuthFetch()

  // ── Load all dashboard data in parallel ─────────────────────────────────────
  async function loadDashboard(period: DashboardPeriod = '30d') {
    loading.value = true
    error.value   = null

    const isNormal = user.value?.role === 'NORMAL'

    try {
      // Usuarios NORMAL no tienen commerceId — solo cargan sus propios pedidos via /orders/mine
      if (isNormal) {
        kpis.value = {
          ...kpis.value,
          salesToday: 0, salesTodayChange: null,
          activeOrders: 0, activeOrdersChange: null,
          lowStockProducts: 0, lowStockChange: null,
          newCustomers: 0, newCustomersChange: null,
        }
        lastUpdated.value = new Date()
        return
      }

      const ACTIVE_STATUSES: OrderStatus[] = ['PENDIENTE', 'CONFIRMADO', 'PREPARANDO', 'LISTO', 'EN_ENTREGA']

      const [ordersRes, statsRes, analyticsRes] = await Promise.allSettled([
        // Pedidos activos: todos los statuses no-terminales en un solo roundtrip
        apiFetch(`/orders?status=${ACTIVE_STATUSES.join(',')}&limit=100`),
        // Order stats
        apiFetch('/orders/stats'),
        // Analytics overview para el período seleccionado
        apiFetch(`/analytics/overview?period=${period}&compareWith=previous`),
      ])

      const allActive: Order[] = ordersRes.status === 'fulfilled' ? (ordersRes.value?.data ?? []) : []

      // Sort by createdAt desc
      activeOrders.value = allActive.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      // Order stats
      if (statsRes.status === 'fulfilled') {
        orderStats.value = statsRes.value
      }

      // Analytics KPIs
      let analyticsData: any = null
      if (analyticsRes.status === 'fulfilled') {
        analyticsData = analyticsRes.value
      }

      // Low-stock count — fetch aggregate
      let lowStock = 0
      try {
        const lowStockRes = await apiFetch('/menu/products?status=BAJO_STOCK&limit=50')
        lowStock = lowStockRes?.total ?? lowStockRes?.data?.length ?? 0
      } catch {}

      // Calcular cambio de bajo stock respecto al ciclo anterior
      const lowStockChange = prevLowStock.value !== null && prevLowStock.value > 0
        ? +((lowStock - prevLowStock.value) / prevLowStock.value * 100).toFixed(1)
        : null
      prevLowStock.value = lowStock

      // Build unified KPIs
      kpis.value = {
        salesToday:          analyticsData?.kpis?.totalRevenue ?? 0,
        salesTodayChange:    analyticsData?.kpis?.totalRevenueChange ?? null,
        activeOrders:        statsRes.status === 'fulfilled' ? (statsRes.value?.activeOrders ?? 0) : activeOrders.value.length,
        activeOrdersChange:  analyticsData?.kpis?.totalOrdersChange ?? null,
        lowStockProducts:    lowStock,
        lowStockChange,
        newCustomers:        analyticsData?.kpis?.newCustomers ?? 0,
        newCustomersChange:  analyticsData?.kpis?.newCustomersChange ?? null,
        avgPrepTime:         analyticsData?.performance?.operational?.avgPrepTime ?? 0,
        avgDeliveryTime:     analyticsData?.performance?.operational?.avgDeliveryTime ?? 0,
        customerSatisfaction: analyticsData?.performance?.operational?.cancellationRate != null
          ? Math.max(0, 100 - analyticsData.performance.operational.cancellationRate)
          : 0,
      }

      lastUpdated.value = new Date()
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  // ── Update single order status (optimistic) ──────────────────────────────────
  async function updateOrderStatus(id: string, status: OrderStatus, cancelReason?: string): Promise<boolean> {
    try {
      const updated = await apiFetch(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, cancelReason }),
      })

      const idx = activeOrders.value.findIndex(o => o.id === id)
      if (idx !== -1) {
        const terminalStatuses: OrderStatus[] = ['ENTREGADO', 'CANCELADO']
        if (terminalStatuses.includes(status)) {
          // Remove from active list
          activeOrders.value.splice(idx, 1)
        } else {
          activeOrders.value[idx] = { ...updated, itemCount: updated.items?.length ?? 0 }
        }
      }

      // Refresh stats
      try {
        orderStats.value = await apiFetch('/orders/stats')
        kpis.value = { ...kpis.value, activeOrders: orderStats.value?.activeOrders ?? kpis.value.activeOrders }
      } catch {}

      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  // ── Mark order as paid ────────────────────────────────────────────────────────
  async function markOrderPaid(id: string): Promise<boolean> {
    try {
      const updated = await apiFetch(`/orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ paymentStatus: 'PAGADO' }),
      })
      const idx = activeOrders.value.findIndex(o => o.id === id)
      if (idx !== -1) activeOrders.value[idx] = { ...updated, itemCount: updated.items?.length ?? 0 }
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const { formatCurrency: _fmt } = useUserPreferences()
  function formatCurrency(value: number) { return _fmt.value(value) }

  function formatChange(change: number | null): string {
    if (change === null) return ''
    return (change >= 0 ? '+' : '') + change.toFixed(1) + '%'
  }

  function formatLastUpdated() {
    if (!lastUpdated.value) return ''
    const diff = Math.round((Date.now() - lastUpdated.value.getTime()) / 1000)
    if (diff < 60) return `hace ${diff}s`
    return `hace ${Math.round(diff / 60)} min`
  }

  return {
    // state
    kpis,
    activeOrders,
    orderStats,
    loading,
    error,
    lastUpdated,
    // actions
    loadDashboard,
    updateOrderStatus,
    markOrderPaid,
    // helpers
    formatCurrency,
    formatChange,
    formatLastUpdated,
    NEXT_STATUS,
  }
}
