/**
 * useNavigation — árbol de navegación del sidebar, servido desde el backend
 * (GET /navigation). Reemplaza los arrays hardcoded que antes vivían en
 * SidebarContent.vue (topNavItemsDef, NAV_GROUPS, bloque "Administración",
 * etc.) y los mapas ruta→permiso/módulo duplicados en los middlewares.
 */
import { ref, computed } from 'vue'
import { useApi } from './useApi'
import type { Capability } from '../auth/useAuth'

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
  // Ruta → capacidad requerida (ej. '/orders' → 'HAS_COMMERCE'). Reemplaza
  // la lista COMMERCE_ONLY_ROUTES que vivía hardcoded en middleware/auth.ts.
  routeCapabilities: Record<string, Capability>
  // Ruta → módulos alternativos: basta uno (con su permiso `:view`). Ej.
  // '/jobs' → ['employees']: publicar vacantes es de quien tiene personal.
  routeAnyModules: Record<string, string[]>
  generatedAt: string
}

const sections = ref<NavSection[]>([])
const routePermissions = ref<Record<string, string | null>>({})
const routeModules = ref<Record<string, string>>({})
const routeCapabilities = ref<Record<string, Capability>>({})
const routeAnyModules = ref<Record<string, string[]>>({})
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
      routeCapabilities.value = data.routeCapabilities ?? {}
      routeAnyModules.value = data.routeAnyModules ?? {}
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

  // "Administración" son 4 secciones hermanas (personas/catálogo/dinero/
  // sistema) en vez de una sola lista de 13 ítems — cada una colapsable por
  // separado (ver SidebarNavSection.vue). ADMIN_SECTION_IDS fija su orden de
  // presentación porque no viene garantizado por el orden de llegada del array.
  const ADMIN_SECTION_IDS = ['administration-people', 'administration-catalog', 'administration-money', 'administration-system']

  const topSection      = computed(() => sections.value.find((s) => s.id === 'top'))
  const adminSections   = computed(() =>
    ADMIN_SECTION_IDS
      .map((id) => sections.value.find((s) => s.id === id))
      .filter((s): s is NavSection => !!s)
  )
  const miCuentaSection = computed(() => sections.value.find((s) => s.id === 'my-account'))
  const negocioSection  = computed(() => sections.value.find((s) => s.id === 'business'))
  const groupSections   = computed(() =>
    sections.value.filter((s) => !['top', ...ADMIN_SECTION_IDS, 'my-account', 'business'].includes(s.id))
  )

  return {
    sections: computed(() => sections.value),
    routePermissions: computed(() => routePermissions.value),
    routeModules: computed(() => routeModules.value),
    routeCapabilities: computed(() => routeCapabilities.value),
    routeAnyModules: computed(() => routeAnyModules.value),
    loaded: computed(() => loaded.value),
    loading: computed(() => loading.value),
    loadNavigation,
    invalidate,
    topSection,
    adminSections,
    miCuentaSection,
    negocioSection,
    groupSections,
  }
}
