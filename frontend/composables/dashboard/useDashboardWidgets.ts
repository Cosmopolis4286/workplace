import { computed } from 'vue'
import {
  DASHBOARD_WIDGETS,
  QUICK_ACTIONS,
  getHeroConfig,
  canAccessWidget,
  canAccessAction,
  type UserRole,
  type WidgetConfig,
  type QuickActionConfig,
} from '~/config/dashboard.config'
import { useDashboardQuickActions } from '~/composables/dashboard/useDashboardQuickActions'
import { useModules } from '~/composables/commerce/useModules'
import { useProfileContext } from '~/composables/users/useProfileContext'

export interface DashboardWidget extends WidgetConfig {
  visible: boolean
}

export interface DashboardAction extends QuickActionConfig {
  visible: boolean
}

export const useDashboardWidgets = () => {
  const { user } = useAuth()
  const { selectedItems: selectedQuickActions } = useDashboardQuickActions()
  const { hasModule, loadModules } = useModules()

  // Idempotente (loadModules ya no repite el fetch si loaded=true) — no
  // depende de que SidebarContent.vue haya montado primero. effectiveModules/
  // loaded son estado de módulo compartido, así que en cuanto resuelva,
  // visibleWidgets/availableActions (computed) se re-evalúan solos.
  loadModules()

  const userRole = computed<UserRole | null>(() => user.value?.role || null)
  // Capacidades reales (GET /auth/me → capabilities, las mismas que exigen
  // los guards del backend) en vez de accountType: un profesional que vende
  // producto tiene Commerce y ve los widgets de pedidos Y los de servicios.
  const { hasCapability } = useProfileContext()

  // Widgets visibles según el rol del usuario
  const visibleWidgets = computed<WidgetConfig[]>(() => {
    const role = userRole.value
    if (!role) return []

    return DASHBOARD_WIDGETS.filter(
      widget => canAccessWidget(widget.id, role, hasCapability, hasModule) && widget.defaultVisible
    ).sort((a, b) => a.priority - b.priority)
  })

  // Todas las acciones rápidas disponibles para el rol
  const availableActions = computed<QuickActionConfig[]>(() => {
    const role = userRole.value
    if (!role) return []

    return QUICK_ACTIONS.filter(action => canAccessAction(action.id, role, hasCapability, hasModule))
  })

  // Acciones elegidas por el usuario (o las primeras 6 si no ha configurado nada)
  const quickActions = computed<QuickActionConfig[]>(() => selectedQuickActions.value)

  // Configuración del hero según rol
  const heroConfig = computed(() => {
    const role = userRole.value
    if (!role) return getHeroConfig('NORMAL')
    return getHeroConfig(role, hasCapability)
  })

  // Verificar si el usuario puede ver un widget específico
  const canViewWidget = (widgetId: string): boolean => {
    const role = userRole.value
    if (!role) return false
    return canAccessWidget(widgetId, role, hasCapability, hasModule)
  }

  // Verificar si el usuario puede ver una acción específica
  const canViewAction = (actionId: string): boolean => {
    const role = userRole.value
    if (!role) return false
    return canAccessAction(actionId, role, hasCapability, hasModule)
  }

  // Obtener widgets por sección
  const kpiWidgets = computed(() =>
    visibleWidgets.value.filter(w =>
      ['salesToday', 'activeOrders', 'activeServiceRequests', 'lowStock', 'newCustomers'].includes(w.id)
    )
  )

  const mainWidgets = computed(() =>
    visibleWidgets.value.filter(w =>
      ['ordersList', 'providerServiceRequests', 'systemHealth', 'recentActivity'].includes(w.id)
    )
  )

  const bottomWidgets = computed(() =>
    visibleWidgets.value.filter(w =>
      ['analyticsOverview'].includes(w.id)
    )
  )

  return {
    // State
    userRole,

    // Widgets
    visibleWidgets,
    kpiWidgets,
    mainWidgets,
    bottomWidgets,

    // Actions
    quickActions,
    availableActions,

    // Hero
    heroConfig,

    // Helpers
    canViewWidget,
    canViewAction,

    // Raw config (para casos especiales)
    DASHBOARD_WIDGETS,
    QUICK_ACTIONS,
  }
}
