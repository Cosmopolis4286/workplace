import { ref, computed } from 'vue'

// ─── Configuración ────────────────────────────────────────────────────────────
const CACHE_KEY = 'perm_cache'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos en milisegundos

// ─── Singleton global (compartido entre todas las instancias del composable) ──

const permissionKeys = ref<string[]>([])
const userCategory = ref<string | null>(null)
const userSubcategory = ref<string | null>(null)
const loading = ref(false)
const initialized = ref(false)

interface CacheEntry {
  keys: string[]
  category?: string | null
  subcategory?: string | null
  timestamp: number
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

function isCacheValid(entry: CacheEntry | null): boolean {
  if (!entry) return false
  const age = Date.now() - entry.timestamp
  return age < CACHE_TTL
}

function getCache(): CacheEntry | null {
  if (!process.client) return null
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    return JSON.parse(cached) as CacheEntry
  } catch {
    localStorage.removeItem(CACHE_KEY)
    return null
  }
}

function setCache(keys: string[]): void {
  if (!process.client) return
  const entry: CacheEntry = {
    keys,
    category: userCategory.value,
    subcategory: userSubcategory.value,
    timestamp: Date.now(),
  }
  localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
}

function clearCache(): void {
  if (!process.client) return
  localStorage.removeItem(CACHE_KEY)
}

// ─── Warm-cache: carga desde localStorage antes del primer fetch ──────────────

function rehydratePermissions(): void {
  if (initialized.value || !process.client) return
  const cache = getCache()
  if (isCacheValid(cache)) {
    permissionKeys.value = cache.keys
    userCategory.value = cache.category || null
    userSubcategory.value = cache.subcategory || null
    initialized.value = true
  }
}

rehydratePermissions()

// ─── Composable ───────────────────────────────────────────────────────────────

export const usePermissions = () => {
  const { token, isAuthenticated, refreshAccessToken, getHeaders } = useAuth()
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string

  // ── Checkers reactivos ────────────────────────────────────────────────────

  const can = (permission: string): boolean =>
    permissionKeys.value.includes(permission)

  const canAny = (...permissions: string[]): boolean =>
    permissions.some(p => permissionKeys.value.includes(p))

  const canAll = (...permissions: string[]): boolean =>
    permissions.every(p => permissionKeys.value.includes(p))

  // ── Fetch desde backend ───────────────────────────────────────────────────

  async function fetchPermissions(force = false): Promise<void> {
    if (!isAuthenticated.value || loading.value) return

    // Si no forzamos, verificar si el caché aún es válido
    if (!force && initialized.value) {
      const cache = getCache()
      if (isCacheValid(cache)) {
        return // Caché válido, no hacer petición
      }
    }

    loading.value = true
    try {
      const doFetch = () =>
        fetch(`${apiUrl}/permissions/me`, {
          headers: { ...getHeaders() },
        })

      let res = await doFetch()
      if (res.status === 401) {
        const ok = await refreshAccessToken()
        if (!ok) { clearPermissions(); return }
        res = await doFetch()
      }
      if (!res.ok) throw new Error('Failed to fetch permissions')

      const data = await res.json() as { keys: string[], category?: string | null, subcategory?: string | null }
      permissionKeys.value = data.keys
      userCategory.value = data.category || null
      userSubcategory.value = data.subcategory || null
      initialized.value = true
      setCache(data.keys)
    } catch {
      // Graceful degradation: warm cache ya se cargó en rehydrate
    } finally {
      loading.value = false
    }
  }

  /**
   * Fuerza la recarga de permisos desde el backend, ignorando caché
   */
  async function reloadPermissions(): Promise<void> {
    clearCache()
    await fetchPermissions(true) // force = true
  }

  /**
   * Verifica si el caché necesita actualización (para UI de "refresh disponible")
   */
  function needsRefresh(): boolean {
    const cache = getCache()
    return !isCacheValid(cache)
  }

  function clearPermissions(): void {
    permissionKeys.value = []
    userCategory.value = null
    userSubcategory.value = null
    initialized.value = false
    clearCache()
  }

  // ── Auto-refresh: verificar cada minuto si el caché expiró ─────────────────

  if (process.client) {
    setInterval(() => {
      if (isAuthenticated.value && needsRefresh()) {
        // Caché expirado, recargar silenciosamente
        fetchPermissions(true)
      }
    }, 60000) // Verificar cada minuto
  }

  return {
    permissionKeys: computed(() => permissionKeys.value),
    userCategory: computed(() => userCategory.value),
    userSubcategory: computed(() => userSubcategory.value),
    loading: computed(() => loading.value),
    initialized: computed(() => initialized.value),
    can,
    canAny,
    canAll,
    fetchPermissions: () => fetchPermissions(false),
    reloadPermissions,
    needsRefresh,
    clearPermissions,
  }
}
