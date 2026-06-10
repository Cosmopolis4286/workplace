import { ref } from 'vue'
import { useRuntimeConfig } from '#app'
import { useAuth } from './useAuth'

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
  const { token, refreshAccessToken } = useAuth()

  // ─── Auth-aware fetch ───────────────────────────────────────────────────────
  async function apiFetch(path: string, options: RequestInit = {}) {
    const config = useRuntimeConfig()
    const base = config.public.apiUrl as string

    const doRequest = async (tkn: string | null) =>
      fetch(`${base}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(tkn ? { Authorization: `Bearer ${tkn}` } : {}),
          ...(options.headers ?? {}),
        },
      })

    let res = await doRequest(token.value)
    if (res.status === 401) {
      const ok = await refreshAccessToken()
      if (!ok) throw new Error('Sesión expirada')
      res = await doRequest(token.value)
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message ?? `Error ${res.status}`)
    }
    if (res.status === 204) return null
    return res.json()
  }

  // ─── Público: tabs habilitados para el hero de búsqueda ─────────────────────

  async function loadTabs(force = false) {
    if (_loaded.value && !force) return
    _loading.value = true
    _error.value = null
    try {
      _tabs.value = await apiFetch('/search-tabs/public')
      _loaded.value = true
    } catch (e: any) {
      _error.value = e.message
    } finally {
      _loading.value = false
    }
  }

  // ─── Admin: gestión completa ─────────────────────────────────────────────────

  async function adminLoadAll(): Promise<SearchTab[]> {
    return apiFetch('/search-tabs')
  }

  async function adminCreate(
    data: Omit<SearchTab, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<SearchTab> {
    return apiFetch('/search-tabs', { method: 'POST', body: JSON.stringify(data) })
  }

  async function adminUpdate(
    id: string,
    data: Partial<Omit<SearchTab, 'id' | 'key' | 'createdAt' | 'updatedAt'>>,
  ): Promise<SearchTab> {
    return apiFetch(`/search-tabs/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async function adminToggle(id: string): Promise<SearchTab> {
    return apiFetch(`/search-tabs/${id}/toggle`, { method: 'PATCH' })
  }

  async function adminReorder(ids: string[]): Promise<SearchTab[]> {
    return apiFetch('/search-tabs/reorder', { method: 'PATCH', body: JSON.stringify({ ids }) })
  }

  async function adminDelete(id: string): Promise<void> {
    await apiFetch(`/search-tabs/${id}`, { method: 'DELETE' })
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
