/**
 * useNavigation — árbol de navegación del sidebar, servido desde el backend
 * (GET /navigation). Reemplaza los arrays hardcoded que antes vivían en
 * SidebarContent.vue (topNavItemsDef, NAV_GROUPS, bloque "Administración",
 * etc.) y los mapas ruta→permiso/módulo duplicados en los middlewares.
 */
import { ref, computed } from 'vue'
import { useApi } from './useApi'

export interface NavItem {
  id: string
  to: string
  label: string
  icon: string
  permission: string | null
}

export interface NavSection {
  id: string
  label: string | null
  flat: boolean
  items: NavItem[]
}

export interface NavigationResponse {
  sections: NavSection[]
  routePermissions: Record<string, string | null>
  routeModules: Record<string, string>
  generatedAt: string
}

const sections = ref<NavSection[]>([])
const routePermissions = ref<Record<string, string | null>>({})
const routeModules = ref<Record<string, string>>({})
const loaded = ref(false)
const loading = ref(false)

export function useNavigation() {
  const { get } = useApi()

  async function loadNavigation(force = false) {
    if (loaded.value && !force) return
    if (loading.value) return
    loading.value = true
    try {
      const data = await get<NavigationResponse>('/navigation')
      sections.value = data.sections
      routePermissions.value = data.routePermissions
      routeModules.value = data.routeModules
      loaded.value = true
    } catch {
      // Degradación: sections vacío, el sidebar no muestra items restringidos.
    } finally {
      loading.value = false
    }
  }

  function invalidate() {
    loaded.value = false
    sections.value = []
  }

  const topSection      = computed(() => sections.value.find((s) => s.id === 'top'))
  const adminSection    = computed(() => sections.value.find((s) => s.id === 'administration'))
  const miCuentaSection = computed(() => sections.value.find((s) => s.id === 'my-account'))
  const negocioSection  = computed(() => sections.value.find((s) => s.id === 'business'))
  const groupSections   = computed(() =>
    sections.value.filter((s) => !['top', 'administration', 'my-account', 'business'].includes(s.id))
  )

  return {
    sections: computed(() => sections.value),
    routePermissions: computed(() => routePermissions.value),
    routeModules: computed(() => routeModules.value),
    loaded: computed(() => loaded.value),
    loading: computed(() => loading.value),
    loadNavigation,
    invalidate,
    topSection,
    adminSection,
    miCuentaSection,
    negocioSection,
    groupSections,
  }
}
