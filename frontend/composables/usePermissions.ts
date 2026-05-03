import { ref, computed } from 'vue'

// ─── Config ───────────────────────────────────────────────────────────────────
const CACHE_KEY    = 'perm_cache'
const VERSION_KEY  = 'perm_version'   // versión del servidor para invalidar cache
const CACHE_TTL    = 5 * 60 * 1000   // 5 minutos
const REFRESH_INT  = 60_000          // verificar cada minuto si el cache expiró

// ─── Singleton ────────────────────────────────────────────────────────────────
const permissionKeys   = ref<string[]>([])
const userCategory     = ref<string | null>(null)
const userSubcategory  = ref<string | null>(null)
const loading          = ref(false)
const initialized      = ref(false)
// version devuelta por el servidor; cambia cuando admin modifica permisos del rol
const serverVersion    = ref<string | null>(null)

interface CacheEntry {
  keys:        string[]
  category?:   string | null
  subcategory?: string | null
  version?:    string | null
  timestamp:   number
}

// ─── Cache helpers ─────────────────────────────────────────────────────────
function getCache(): CacheEntry | null {
  if (!process.client) return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as CacheEntry) : null
  } catch {
    localStorage.removeItem(CACHE_KEY)
    return null
  }
}

function isCacheValid(entry: CacheEntry | null): boolean {
  if (!entry) return false
  const fresh = Date.now() - entry.timestamp < CACHE_TTL
  if (!fresh) return false
  // Invalidar si el servidor tiene una versión más nueva
  const sv = localStorage.getItem(VERSION_KEY)
  if (sv && entry.version !== sv) return false
  return true
}

function setCache(keys: string[], version?: string | null): void {
  if (!process.client) return
  const entry: CacheEntry = {
    keys,
    category:    userCategory.value,
    subcategory: userSubcategory.value,
    version:     version ?? null,
    timestamp:   Date.now(),
  }
  localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
}

function clearCache(): void {
  if (!process.client) return
  localStorage.removeItem(CACHE_KEY)
}

/**
 * Permite que cualquier parte de la app invalide el cache localmente
 * (ej: cuando el usuario cambia su propio perfil/plan).
 */
export function invalidatePermissionsCache(): void {
  clearCache()
  initialized.value = false
}

/**
 * Llamado desde el backend (ej: vía WebSocket o respuesta de mutation)
 * cuando los permisos del rol cambian. Guarda la nueva versión y limpia cache.
 */
export function setPermissionsVersion(v: string): void {
  if (!process.client) return
  localStorage.setItem(VERSION_KEY, v)
  clearCache()
  initialized.value = false
}

// ─── Rehydrate desde cache al cargar la app ──────────────────────────────
function rehydrate(): void {
  if (initialized.value || !process.client) return
  const entry = getCache()
  if (isCacheValid(entry)) {
    permissionKeys.value  = entry!.keys
    userCategory.value    = entry!.category   ?? null
    userSubcategory.value = entry!.subcategory ?? null
    serverVersion.value   = entry!.version    ?? null
    initialized.value     = true
  }
}

rehydrate()

// ─── Composable ───────────────────────────────────────────────────────────
export const usePermissions = () => {
  const { token, isAuthenticated, refreshAccessToken, getHeaders } = useAuth()
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string

  // ── Checkers ─────────────────────────────────────────────────────────────
  const can    = (permission: string)            => permissionKeys.value.includes(permission)
  const canAny = (...permissions: string[])      => permissions.some(p  => permissionKeys.value.includes(p))
  const canAll = (...permissions: string[])      => permissions.every(p => permissionKeys.value.includes(p))

  // ── Fetch ─────────────────────────────────────────────────────────────────
  async function fetchPermissions(force = false): Promise<void> {
    if (!isAuthenticated.value || loading.value) return

    if (!force && initialized.value && isCacheValid(getCache())) return

    loading.value = true
    try {
      const doFetch = () =>
        fetch(`${apiUrl}/permissions/me`, { headers: { ...getHeaders() } })

      let res = await doFetch()
      if (res.status === 401) {
        const ok = await refreshAccessToken()
        if (!ok) { clearPermissions(); return }
        res = await doFetch()
      }
      if (!res.ok) throw new Error(`${res.status}`)

      const data = await res.json() as {
        keys:        string[]
        category?:   string | null
        subcategory?: string | null
        version?:    string | null
      }

      permissionKeys.value  = data.keys
      userCategory.value    = data.category    ?? null
      userSubcategory.value = data.subcategory ?? null
      serverVersion.value   = data.version     ?? null
      initialized.value     = true

      // Persistir versión del servidor para comparación futura
      if (data.version && process.client) {
        localStorage.setItem(VERSION_KEY, data.version)
      }

      setCache(data.keys, data.version)
    } catch {
      // Degradación elegante: usa cache si existe
    } finally {
      loading.value = false
    }
  }

  async function reloadPermissions(): Promise<void> {
    clearCache()
    initialized.value = false
    await fetchPermissions(true)
  }

  function needsRefresh(): boolean {
    return !isCacheValid(getCache())
  }

  function clearPermissions(): void {
    permissionKeys.value  = []
    userCategory.value    = null
    userSubcategory.value = null
    initialized.value     = false
    serverVersion.value   = null
    clearCache()
  }

  // ── Auto-refresh silencioso cada minuto ───────────────────────────────────
  if (process.client && !_autoRefreshStarted) {
    _autoRefreshStarted = true
    setInterval(() => {
      if (isAuthenticated.value && needsRefresh()) {
        fetchPermissions(true)
      }
    }, REFRESH_INT)
  }

  return {
    permissionKeys:   computed(() => permissionKeys.value),
    userCategory:     computed(() => userCategory.value),
    userSubcategory:  computed(() => userSubcategory.value),
    loading:          computed(() => loading.value),
    initialized:      computed(() => initialized.value),
    can,
    canAny,
    canAll,
    fetchPermissions:  ()  => fetchPermissions(false),
    reloadPermissions,
    needsRefresh,
    clearPermissions,
  }
}

// Evitar registrar múltiples setIntervals al hacer HMR
let _autoRefreshStarted = false
