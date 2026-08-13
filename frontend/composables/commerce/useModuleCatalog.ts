/**
 * useModuleCatalog — catálogo unificado de módulos (key + label), servido
 * desde el backend (GET /plans/modules/catalog). Reemplaza las copias locales
 * de MODULE_LABELS que existían en permisos.vue, useModules.ts, planes.vue y
 * CategoryModulesModal.vue.
 */
import { ref, computed } from 'vue'
import { useApi } from '../core/useApi'

export interface ModuleMeta {
  key: string
  label: string
}

const catalog = ref<ModuleMeta[]>([])
const loaded = ref(false)

export function useModuleCatalog() {
  const { get } = useApi()

  async function load(force = false) {
    if (loaded.value && !force) return
    try {
      catalog.value = await get<ModuleMeta[]>('/plans/modules/catalog')
      loaded.value = true
    } catch {
      // Degradación: labels queda vacío, la UI debe tolerar mostrar el key crudo.
    }
  }

  const labels = computed<Record<string, string>>(() =>
    Object.fromEntries(catalog.value.map((m) => [m.key, m.label]))
  )

  return {
    catalog: computed(() => catalog.value),
    labels,
    loaded: computed(() => loaded.value),
    load,
  }
}
