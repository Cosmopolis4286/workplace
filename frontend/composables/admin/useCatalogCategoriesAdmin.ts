import { ref } from 'vue'
import { useApi } from '~/composables/core/useApi'

// Shape compartido por ServiceCategory y JobCategory — ambos backends
// exponen el mismo CRUD admin, solo cambia el path base. Ver
// CategoryScopeService: userCategoryIds vacío = visible para cualquier rubro.
// Nombrada "Admin" para no chocar con CatalogCategory de useCatalog.ts
// (catálogo público de productos/servicios) bajo el auto-import global.
export interface CatalogAdminCategory {
  id: string
  name: string
  color?: string
  icon?: string
  description?: string
  userCategoryIds: string[]
}

export type CatalogKind = 'services' | 'jobs'

const BASE_PATH: Record<CatalogKind, string> = {
  services: '/services/categories',
  jobs: '/jobs/admin/categories',
}

// jobs.controller.ts envuelve sus respuestas en { data }, services.controller.ts
// las devuelve planas — normalizado acá para que el composable sea uniforme.
function unwrap<T>(res: T | { data: T }): T {
  return (res && typeof res === 'object' && 'data' in (res as any)) ? (res as { data: T }).data : (res as T)
}

export function useCatalogCategoriesAdmin(kind: CatalogKind) {
  const { get, post, put, patch, del } = useApi()
  const basePath = BASE_PATH[kind]
  // jobs expone PATCH, services expone PUT — misma semántica (update parcial).
  const updateFn = kind === 'jobs' ? patch : put

  const categories = ref<CatalogAdminCategory[]>([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      const res = await get<CatalogAdminCategory[] | { data: CatalogAdminCategory[] }>(basePath)
      categories.value = unwrap(res) ?? []
    } finally {
      loading.value = false
    }
  }

  async function create(dto: { name: string; color?: string; icon?: string; description?: string; userCategoryIds?: string[] }) {
    const res = await post<CatalogAdminCategory | { data: CatalogAdminCategory }>(basePath, dto)
    await fetchAll()
    return unwrap(res)
  }

  async function update(id: string, dto: Partial<{ name: string; color: string; icon: string; description: string; userCategoryIds: string[] }>) {
    const res = await updateFn<CatalogAdminCategory | { data: CatalogAdminCategory }>(`${basePath}/${id}`, dto)
    await fetchAll()
    return unwrap(res)
  }

  async function remove(id: string) {
    await del(`${basePath}/${id}`)
    categories.value = categories.value.filter(c => c.id !== id)
  }

  return {
    categories,
    loading,
    fetchAll,
    create,
    update,
    remove,
  }
}
