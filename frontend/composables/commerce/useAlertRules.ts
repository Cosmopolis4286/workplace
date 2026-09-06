import { ref } from 'vue'
import { useApi } from '../core/useApi'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertType = 'MARGIN_DROP' | 'REPLACEMENT_COST_RISK' | 'SUPPLIER_PRICE_CHANGE' | 'LOW_LIQUIDITY'

export interface AlertRule {
  alertType: AlertType
  thresholdValue: number
  enabled: boolean
  isDefault: boolean
}

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  MARGIN_DROP: 'Caída de margen de reposición',
  REPLACEMENT_COST_RISK: 'Riesgo de costo de reposición',
  SUPPLIER_PRICE_CHANGE: 'Aumento de precio de proveedor',
  LOW_LIQUIDITY: 'Baja liquidez (cuentas vencidas)',
}

export const ALERT_TYPE_DESCRIPTIONS: Record<AlertType, string> = {
  MARGIN_DROP: 'Avisa cuando el margen de reposición cae X puntos porcentuales por debajo del histórico.',
  REPLACEMENT_COST_RISK: 'Avisa cuando el costo de reposición sube X% frente al costo cargado.',
  SUPPLIER_PRICE_CHANGE: 'Avisa cuando un proveedor sube su precio X% o más en 30 días.',
  LOW_LIQUIDITY: 'Avisa cuando X% o más de tus cuentas por cobrar/pagar están vencidas.',
}

// ─── Composable ───────────────────────────────────────────────────────────────

export function useAlertRules() {
  const { get, put, del } = useApi()

  const rules = ref<AlertRule[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadRules() {
    loading.value = true
    error.value = null
    try {
      rules.value = await get<AlertRule[]>('/alert-rules')
    } catch (e: any) {
      error.value = e?.message
    } finally {
      loading.value = false
    }
  }

  async function updateRule(alertType: AlertType, thresholdValue: number, enabled: boolean): Promise<boolean> {
    error.value = null
    try {
      await put(`/alert-rules/${alertType}`, { thresholdValue, enabled })
      await loadRules()
      return true
    } catch (e: any) {
      error.value = e?.message
      return false
    }
  }

  async function resetRule(alertType: AlertType): Promise<boolean> {
    error.value = null
    try {
      await del(`/alert-rules/${alertType}`)
      await loadRules()
      return true
    } catch (e: any) {
      error.value = e?.message
      return false
    }
  }

  return { rules, loading, error, loadRules, updateRule, resetRule }
}
