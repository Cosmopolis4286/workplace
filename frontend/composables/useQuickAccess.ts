/**
 * useQuickAccess — catálogo de accesos rápidos disponibles + preferencia del usuario.
 *
 * El usuario elige hasta 3 accesos (de los que tiene permiso/módulo) para
 * mostrar en el bloque "Acceso rápido" del sidebar. La selección se persiste
 * en ProfileSettings.quickAccessIds (backend) vía PATCH /api/profiles/settings.
 * Si el usuario no ha elegido nada, se usa un orden por defecto (auto-pick).
 */

export interface QuickAccessCandidate {
  id: string
  to: string
  label: string
  permission: string | null
  icon: string
  gradient: string
  normalOnly?: boolean
}

export const QUICK_ACCESS_CANDIDATES: QuickAccessCandidate[] = [
  { id: 'pedidos',              to: '/pedidos',              label: 'Pedidos',     permission: 'orders:view',           icon: 'orders',    gradient: 'bg-gradient-to-br from-workplace-red to-red-700',   normalOnly: false },
  { id: 'mis-pedidos',          to: '/mis-pedidos',          label: 'Pedidos',     permission: null,                    icon: 'orders',    gradient: 'bg-gradient-to-br from-green-500 to-emerald-600',   normalOnly: true  },
  { id: 'solicitudes-servicio', to: '/solicitudes-servicio', label: 'Solicitudes', permission: 'service_requests:view', icon: 'requests',  gradient: 'bg-gradient-to-br from-red-400 to-rose-600',         normalOnly: false },
  { id: 'gastos',               to: '/gastos',               label: 'Gastos',      permission: 'expenses:view',         icon: 'sales',     gradient: 'bg-gradient-to-br from-red-600 to-rose-800',         normalOnly: false },
  { id: 'servicios',            to: '/servicios',            label: 'Servicios',   permission: 'services:view',         icon: 'services',  gradient: 'bg-gradient-to-br from-gray-700 to-gray-900',        normalOnly: false },
  { id: 'cliente-dashboard',    to: '/cliente-dashboard',    label: 'Mi Panel',    permission: 'orders:view',           icon: 'customers', gradient: 'bg-gradient-to-br from-rose-500 to-workplace-red',  normalOnly: false },
  { id: 'dashboard',            to: '/dashboard',            label: 'Dashboard',   permission: 'dashboard:view',        icon: 'dashboard', gradient: 'bg-gradient-to-br from-workplace-red to-red-800',   normalOnly: false },
  { id: 'analytics',            to: '/analytics',            label: 'Analytics',   permission: 'analytics:view',        icon: 'analytics', gradient: 'bg-gradient-to-br from-rose-600 to-red-900',        normalOnly: false },
  { id: 'clientes',             to: '/clientes',             label: 'Clientes',    permission: 'customers:view',        icon: 'customers', gradient: 'bg-gradient-to-br from-red-500 to-rose-700',        normalOnly: false },
  { id: 'delivery',             to: '/delivery',             label: 'Delivery',    permission: 'delivery:view',         icon: 'delivery',  gradient: 'bg-gradient-to-br from-gray-600 to-gray-800',       normalOnly: false },
  { id: 'agendamientos',        to: '/agendamientos',        label: 'Agendas',     permission: 'appointments:view',     icon: 'appointments', gradient: 'bg-gradient-to-br from-rose-400 to-red-600',     normalOnly: false },
]

export const MAX_QUICK_ACCESS = 3

export function useQuickAccess() {
  const { user, updateLocalUser, getHeaders } = useAuth()
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string

  const savedIds = computed<string[]>(() => user.value?.profileSettings?.quickAccessIds ?? [])

  function availableFor(role: string, canSee: (permission: string | null, to?: string) => boolean): QuickAccessCandidate[] {
    return QUICK_ACCESS_CANDIDATES.filter(i => {
      if (i.normalOnly && role !== 'NORMAL') return false
      if (!i.normalOnly && role === 'NORMAL') return false
      return canSee(i.permission, i.to)
    })
  }

  const saving = ref(false)
  const error = ref<string | null>(null)

  async function setQuickAccessIds(ids: string[]): Promise<void> {
    saving.value = true
    error.value = null
    try {
      const updated = await $fetch<{ showCatalog: boolean; showServices: boolean; quickAccessIds: string[] }>(
        `${apiUrl}/profiles/settings`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: getHeaders(),
          body: { quickAccessIds: ids },
        }
      )
      updateLocalUser({
        profileSettings: {
          showCatalog: updated.showCatalog,
          showServices: updated.showServices,
          quickAccessIds: updated.quickAccessIds,
        },
      })
    } catch (err: any) {
      error.value = err?.data?.message ?? 'No se pudo guardar la preferencia'
      throw err
    } finally {
      saving.value = false
    }
  }

  return { QUICK_ACCESS_CANDIDATES, MAX_QUICK_ACCESS, savedIds, availableFor, setQuickAccessIds, saving, error }
}
