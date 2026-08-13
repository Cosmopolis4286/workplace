import { ref } from 'vue'
import { useApi } from './useApi'

export interface SearchTab {
  id: string
  key: string
  label: string
  icon: string | null
  color: string
  isEnabled: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

const _tabs = ref<SearchTab[]>([])
const _loading = ref(false)
const _loaded = ref(false)
const _error = ref<string | null>(null)

export function useSearchTabs() {
  const { get, post, put, patch, del } = useApi()

  // ─── Público: tabs habilitados para el hero de búsqueda ─────────────────────

  async function loadTabs(force = false) {
    if (_loaded.value && !force) return
    _loading.value = true
    _error.value = null
    try {
      _tabs.value = await get<SearchTab[]>('/search-tabs/public')
      _loaded.value = true
    } catch (e: any) {
      _error.value = e?.message
    } finally {
      _loading.value = false
    }
  }

  // ─── Admin: gestión completa ─────────────────────────────────────────────────

  async function adminLoadAll(): Promise<SearchTab[]> {
    return get<SearchTab[]>('/search-tabs')
  }

  async function adminCreate(
    data: Omit<SearchTab, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<SearchTab> {
    return post<SearchTab>('/search-tabs', data)
  }

  async function adminUpdate(
    id: string,
    data: Partial<Omit<SearchTab, 'id' | 'key' | 'createdAt' | 'updatedAt'>>,
  ): Promise<SearchTab> {
    return put<SearchTab>(`/search-tabs/${id}`, data)
  }

  async function adminToggle(id: string): Promise<SearchTab> {
    return patch<SearchTab>(`/search-tabs/${id}/toggle`, {})
  }

  async function adminReorder(ids: string[]): Promise<SearchTab[]> {
    return patch<SearchTab[]>('/search-tabs/reorder', { ids })
  }

  async function adminDelete(id: string): Promise<void> {
    await del(`/search-tabs/${id}`)
  }

  return {
    tabs: _tabs,
    loading: _loading,
    error: _error,
    loadTabs,
    adminLoadAll,
    adminCreate,
    adminUpdate,
    adminToggle,
    adminReorder,
    adminDelete,
  }
}
