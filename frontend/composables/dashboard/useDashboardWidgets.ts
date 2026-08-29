import { computed } from 'vue'
import {
  DASHBOARD_WIDGETS,
  QUICK_ACTIONS,
  getHeroConfig,
  canAccessWidget,
  canAccessAction,
  type UserRole,
  type AccountType,
  type WidgetConfig,
  type QuickActionConfig,
} from '~/config/dashboard.config'
import { useDashboardQuickActions } from '~/composables/dashboard/useDashboardQuickActions'

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
  // role=PROFESIONAL ya no distingue COMMERCE de FREELANCER — accountType
  // (resuelto por el backend, ver useAuth().User.accountType) es la fuente
  // real para los widgets/acciones/hero que sí necesitan esa distinción.
  const accountType = computed<AccountType | null>(() => user.value?.accountType ?? null)

  // Widgets visibles según el rol del usuario
  const visibleWidgets = computed<WidgetConfig[]>(() => {
    const role = userRole.value
    if (!role) return []

    return DASHBOARD_WIDGETS.filter(
      widget => canAccessWidget(widget.id, role, accountType.value) && widget.defaultVisible
    ).sort((a, b) => a.priority - b.priority)
  })

  // Todas las acciones rápidas disponibles para el rol
  const availableActions = computed<QuickActionConfig[]>(() => {
    const role = userRole.value
    if (!role) return []

    return QUICK_ACTIONS.filter(action => canAccessAction(action.id, role, accountType.value))
  })

  // Acciones elegidas por el usuario (o las primeras 6 si no ha configurado nada)
  const quickActions = computed<QuickActionConfig[]>(() => selectedQuickActions.value)

  // Configuración del hero según rol
  const heroConfig = computed(() => {
    const role = userRole.value
    if (!role) return getHeroConfig('NORMAL')
    return getHeroConfig(role, accountType.value)
  })

  // Verificar si el usuario puede ver un widget específico
  const canViewWidget = (widgetId: string): boolean => {
    const role = userRole.value
    if (!role) return false
    return canAccessWidget(widgetId, role, accountType.value)
  }

  // Verificar si el usuario puede ver una acción específica
  const canViewAction = (actionId: string): boolean => {
    const role = userRole.value
    if (!role) return false
    return canAccessAction(actionId, role, accountType.value)
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
