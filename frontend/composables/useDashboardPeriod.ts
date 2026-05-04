import { ref } from 'vue'

export type DashboardPeriod = '7d' | '30d' | '90d'

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  '7d':  '7 días',
  '30d': '30 días',
  '90d': '90 días',
}

export const PERIOD_SALES_LABELS: Record<DashboardPeriod, string> = {
  '7d':  'Ventas (7d)',
  '30d': 'Ventas (30d)',
  '90d': 'Ventas (90d)',
}

export const PERIOD_CUSTOMERS_LABELS: Record<DashboardPeriod, string> = {
  '7d':  'Clientes Nuevos (7d)',
  '30d': 'Clientes Nuevos (30d)',
  '90d': 'Clientes Nuevos (90d)',
}

const LS_KEY = 'dashboard_kpi_period'

function readFromLS(): DashboardPeriod | null {
  if (!process.client) return null
  const v = localStorage.getItem(LS_KEY)
  if (v === '7d' || v === '30d' || v === '90d') return v
  return null
}

const period = ref<DashboardPeriod>(readFromLS() ?? '30d')

export function useDashboardPeriod() {
  function setPeriod(p: DashboardPeriod) {
    period.value = p
    if (process.client) localStorage.setItem(LS_KEY, p)
  }

  return { period, setPeriod, PERIOD_LABELS, PERIOD_SALES_LABELS, PERIOD_CUSTOMERS_LABELS }
}
