/**
 * useDashboardQuickActions — selección del usuario para el widget
 * "Acciones Rápidas" del dashboard (components/dashboard/QuickActions.vue).
 *
 * Independiente de useQuickAccess.ts (que controla el bloque "Acceso rápido"
 * del sidebar): este usa su propio catálogo (QUICK_ACTIONS) y su propio
 * campo de preferencia, ProfileSettings.dashboardQuickActionIds.
 * Si el usuario no ha elegido nada, se usa el orden por defecto (primeras 6).
 */
import { QUICK_ACTIONS, canAccessAction, type QuickActionConfig } from '~/config/dashboard.config'
import { useApi } from '../core/useApi'
import { useModules } from '../commerce/useModules'
import { useProfileContext } from '../users/useProfileContext'

export const MAX_DASHBOARD_QUICK_ACTIONS = 6

export function useDashboardQuickActions() {
  const { user, updateLocalUser } = useAuth()
  const { patch } = useApi()
  const { hasModule } = useModules()

  const role = computed(() => user.value?.role ?? 'NORMAL')
  const { hasCapability } = useProfileContext()
  const savedIds = computed<string[]>(() => user.value?.profileSettings?.dashboardQuickActionIds ?? [])

  // canAccessAction (no solo action.roles.includes): exige las capacidades
  // de cada acción (ej. "Ver Pedidos"/"Gestionar Menú" → HAS_COMMERCE), las
  // mismas que el backend. effectiveModules es estado module-level
  // compartido con useDashboardWidgets.ts (que sí llama loadModules()) — no
  // hace falta duplicar esa llamada acá.
  const availableItems = computed<QuickActionConfig[]>(() =>
    QUICK_ACTIONS.filter(action => canAccessAction(action.id, role.value as any, hasCapability, hasModule))
  )

  const selectedItems = computed<QuickActionConfig[]>(() => {
    const available = availableItems.value
    const ids = savedIds.value
    if (ids.length > 0) {
      const byId = new Map(available.map(a => [a.id, a]))
      const chosen = ids.map(id => byId.get(id)).filter((a): a is QuickActionConfig => !!a)
      if (chosen.length > 0) return chosen.slice(0, MAX_DASHBOARD_QUICK_ACTIONS)
    }
    return available.slice(0, MAX_DASHBOARD_QUICK_ACTIONS)
  })

  const saving = ref(false)
  const error = ref<string | null>(null)

  async function setDashboardQuickActionIds(ids: string[]): Promise<void> {
    saving.value = true
    error.value = null
    try {
      const updated = await patch<{ showCatalog: boolean; showServices: boolean; quickAccessIds: string[]; dashboardQuickActionIds: string[] }>(
        '/profiles/settings',
        { dashboardQuickActionIds: ids },
      )
      updateLocalUser({
        profileSettings: {
          showCatalog: updated.showCatalog,
          showServices: updated.showServices,
          quickAccessIds: updated.quickAccessIds,
          dashboardQuickActionIds: updated.dashboardQuickActionIds,
        },
      })
    } catch (err: any) {
      error.value = err?.message ?? 'No se pudo guardar la preferencia'
      throw err
    } finally {
      saving.value = false
    }
  }

  return { MAX_DASHBOARD_QUICK_ACTIONS, savedIds, availableItems, selectedItems, setDashboardQuickActionIds, saving, error }
}
