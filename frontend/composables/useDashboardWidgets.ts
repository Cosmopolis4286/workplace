import { computed } from 'vue'
import {
  DASHBOARD_WIDGETS,
  QUICK_ACTIONS,
  getHeroConfig,
  type UserRole,
  type WidgetConfig,
  type QuickActionConfig,
} from '~/config/dashboard.config'
import { useDashboardQuickActions } from '~/composables/useDashboardQuickActions'

export interface DashboardWidget extends WidgetConfig {
  visible: boolean
}

export interface DashboardAction extends QuickActionConfig {
  visible: boolean
}

export const useDashboardWidgets = () => {
  const { user } = useAuth()
  const { selectedItems: selectedQuickActions } = useDashboardQuickActions()

  const userRole = computed<UserRole | null>(() => user.value?.role || null)

  // Widgets visibles según el rol del usuario
  const visibleWidgets = computed<WidgetConfig[]>(() => {
    const role = userRole.value
    if (!role) return []

    return DASHBOARD_WIDGETS.filter(
      widget => widget.roles.includes(role) && widget.defaultVisible
    ).sort((a, b) => a.priority - b.priority)
  })

  // Todas las acciones rápidas disponibles para el rol
  const availableActions = computed<QuickActionConfig[]>(() => {
    const role = userRole.value
    if (!role) return []

    return QUICK_ACTIONS.filter(action => action.roles.includes(role))
  })

  // Acciones elegidas por el usuario (o las primeras 6 si no ha configurado nada)
  const quickActions = computed<QuickActionConfig[]>(() => selectedQuickActions.value)

  // Configuración del hero según rol
  const heroConfig = computed(() => {
    const role = userRole.value
    if (!role) return getHeroConfig('NORMAL')
    return getHeroConfig(role)
  })

  // Verificar si el usuario puede ver un widget específico
  const canViewWidget = (widgetId: string): boolean => {
    const role = userRole.value
    if (!role) return false

    const widget = DASHBOARD_WIDGETS.find(w => w.id === widgetId)
    return widget ? widget.roles.includes(role) : false
  }

  // Verificar si el usuario puede ver una acción específica
  const canViewAction = (actionId: string): boolean => {
    const role = userRole.value
    if (!role) return false

    const action = QUICK_ACTIONS.find(a => a.id === actionId)
    return action ? action.roles.includes(role) : false
  }

  // Obtener widgets por sección
  const kpiWidgets = computed(() =>
    visibleWidgets.value.filter(w =>
      ['salesToday', 'activeOrders', 'lowStock', 'newCustomers'].includes(w.id)
    )
  )

  const mainWidgets = computed(() =>
    visibleWidgets.value.filter(w =>
      ['ordersList', 'systemHealth', 'myTasks', 'recentActivity'].includes(w.id)
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
