import { ref, computed } from 'vue'
import { useDashboard } from './useDashboard'
import { useExpenses } from './useExpenses'

export interface DashboardAlert {
  id: string
  type: 'warning' | 'danger' | 'info'
  title: string
  message: string
  actionLabel?: string
  actionRoute?: string
}

const SS_KEY = 'dashboard_dismissed_alerts'

function readDismissed(): Set<string> {
  if (!process.client) return new Set()
  try {
    const raw = sessionStorage.getItem(SS_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

const dismissed = ref<Set<string>>(new Set())

export function useDashboardAlerts() {
  const { kpis } = useDashboard()
  const { overdueExpenses, expenses } = useExpenses()

  function hydrate() {
    if (process.client) dismissed.value = readDismissed()
  }

  function dismiss(id: string) {
    dismissed.value = new Set([...dismissed.value, id])
    if (process.client) {
      sessionStorage.setItem(SS_KEY, JSON.stringify([...dismissed.value]))
    }
  }

  const activeAlerts = computed<DashboardAlert[]>(() => {
    const alerts: DashboardAlert[] = []

    // Alerta de bajo stock
    if (kpis.value.lowStockProducts > 0) {
      alerts.push({
        id: 'low-stock',
        type: 'warning',
        title: 'Productos con stock bajo',
        message: `${kpis.value.lowStockProducts} producto${kpis.value.lowStockProducts !== 1 ? 's' : ''} necesita${kpis.value.lowStockProducts !== 1 ? 'n' : ''} reabastecimiento.`,
        actionLabel: 'Ver inventario',
        actionRoute: '/inventory',
      })
    }

    // Alerta de gastos vencidos (solo si ya se cargaron datos de gastos)
    if (expenses.value.length > 0 && overdueExpenses.value.length > 0) {
      alerts.push({
        id: 'overdue-expenses',
        type: 'danger',
        title: 'Gastos vencidos sin pagar',
        message: `${overdueExpenses.value.length} gasto${overdueExpenses.value.length !== 1 ? 's' : ''} vencido${overdueExpenses.value.length !== 1 ? 's' : ''} pendiente${overdueExpenses.value.length !== 1 ? 's' : ''} de pago.`,
        actionLabel: 'Ver gastos',
        actionRoute: '/expenses',
      })
    }

    // Alerta de alto volumen de pedidos activos
    if (kpis.value.activeOrders >= 10) {
      alerts.push({
        id: 'high-orders',
        type: 'info',
        title: 'Alto volumen de pedidos',
        message: `Hay ${kpis.value.activeOrders} pedidos activos en este momento.`,
        actionLabel: 'Ver pedidos',
        actionRoute: '/customer-dashboard',
      })
    }

    return alerts.filter(a => !dismissed.value.has(a.id))
  })

  return { activeAlerts, dismiss, hydrate }
}
