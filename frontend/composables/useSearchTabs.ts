import { ref } from 'vue'
import { useRuntimeConfig } from '#app'

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
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string

  async function loadTabs(force = false) {
    if (_loaded.value && !force) return
    _loading.value = true
    _error.value = null
    try {
      const res = await fetch(`${apiUrl}/api/search-tabs/public`)
      if (!res.ok) throw new Error('Error al cargar tabs')
      _tabs.value = await res.json()
      _loaded.value = true
    } catch (e: any) {
      _error.value = e.message
    } finally {
      _loading.value = false
    }
  }

  // ─── Admin: authenticated CRUD ──────────────────────────────────────────────

  async function adminLoadAll(headers: Record<string, string>) {
    const res = await fetch(`${apiUrl}/api/search-tabs`, { headers })
    if (!res.ok) throw new Error('Error al cargar tabs')
    return res.json() as Promise<SearchTab[]>
  }

  async function adminCreate(
    data: Omit<SearchTab, 'id' | 'createdAt' | 'updatedAt'>,
    headers: Record<string, string>,
  ) {
    const res = await fetch(`${apiUrl}/api/search-tabs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Error al crear tab')
    }
    return res.json() as Promise<SearchTab>
  }

  async function adminUpdate(
    id: string,
    data: Partial<Omit<SearchTab, 'id' | 'key' | 'createdAt' | 'updatedAt'>>,
    headers: Record<string, string>,
  ) {
    const res = await fetch(`${apiUrl}/api/search-tabs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Error al actualizar tab')
    }
    return res.json() as Promise<SearchTab>
  }

  async function adminToggle(id: string, headers: Record<string, string>) {
    const res = await fetch(`${apiUrl}/api/search-tabs/${id}/toggle`, {
      method: 'PATCH',
      headers,
    })
    if (!res.ok) throw new Error('Error al cambiar estado del tab')
    return res.json() as Promise<SearchTab>
  }

  async function adminReorder(ids: string[], headers: Record<string, string>) {
    const res = await fetch(`${apiUrl}/api/search-tabs/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ ids }),
    })
    if (!res.ok) throw new Error('Error al reordenar tabs')
    return res.json() as Promise<SearchTab[]>
  }

  async function adminDelete(id: string, headers: Record<string, string>) {
    const res = await fetch(`${apiUrl}/api/search-tabs/${id}`, {
      method: 'DELETE',
      headers,
    })
    if (!res.ok) throw new Error('Error al eliminar tab')
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
