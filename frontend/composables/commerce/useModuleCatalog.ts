/**
 * useModuleCatalog — catálogo unificado de módulos, servido desde el
 * backend (GET /plans/modules/catalog), que a su vez lee de la tabla
 * SystemModule (fuente canónica, gerenciable por un admin — ya no un
 * array hardcodeado). Reemplaza las copias locales de MODULE_LABELS y de
 * listas de módulos de negocio que existían en permisos.vue, useModules.ts,
 * planes.vue y CategoryModulesModal.vue.
 */
import { ref, computed } from 'vue'
import { useApi } from '../core/useApi'

export interface SystemModuleRow {
  module: string
  label: string
  enabled: boolean
  isBusinessModule: boolean
  isSystemDefault: boolean
}

const catalog = ref<SystemModuleRow[]>([])
const loaded = ref(false)

export function useModuleCatalog() {
  const { get } = useApi()

  async function load(force = false) {
    if (loaded.value && !force) return
    try {
      catalog.value = await get<SystemModuleRow[]>('/plans/modules/catalog')
      loaded.value = true
    } catch {
      // Degradación: labels queda vacío, la UI debe tolerar mostrar el key crudo.
    }
  }

  const labels = computed<Record<string, string>>(() =>
    Object.fromEntries(catalog.value.map((m) => [m.module, m.label]))
  )

  // Subset seleccionable por categoría de negocio (excluye módulos "de
  // sistema" como users/permissions/audit, que no tienen plan/categoría propia).
  const businessModules = computed(() => catalog.value.filter((m) => m.isBusinessModule))

  return {
    catalog: computed(() => catalog.value),
    businessModules,
    labels,
    loaded: computed(() => loaded.value),
    load,
  }
}
