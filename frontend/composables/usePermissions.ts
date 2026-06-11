import { ref, computed } from 'vue'

// ─── Config ───────────────────────────────────────────────────────────────────
const CACHE_KEY_PREFIX = 'perm_cache_'
const VERSION_KEY_PREFIX = 'perm_version_'
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

// ─── Cache helpers (namespaced por usuario) ────────────────────────────────
function getCurrentUserId(): string | null {
  if (!process.client) return null
  try {
    const raw = localStorage.getItem('auth_user')
    if (!raw) return null
    const user = JSON.parse(raw) as { id?: string }
    return user?.id ?? null
  } catch {
    return null
  }
}

function cacheKey(): string | null {
  const userId = getCurrentUserId()
  return userId ? `${CACHE_KEY_PREFIX}${userId}` : null
}

function versionKey(): string | null {
  const userId = getCurrentUserId()
  return userId ? `${VERSION_KEY_PREFIX}${userId}` : null
}

function getCache(): CacheEntry | null {
  if (!process.client) return null
  const key = cacheKey()
  if (!key) return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as CacheEntry) : null
  } catch {
    localStorage.removeItem(key)
    return null
  }
}

function isCacheValid(entry: CacheEntry | null): boolean {
  if (!entry) return false
  const fresh = Date.now() - entry.timestamp < CACHE_TTL
  if (!fresh) return false
  // Invalidar si el servidor tiene una versión más nueva
  const vKey = versionKey()
  const sv = vKey ? localStorage.getItem(vKey) : null
  if (sv && entry.version !== sv) return false
  return true
}

function setCache(keys: string[], version?: string | null): void {
  if (!process.client) return
  const key = cacheKey()
  if (!key) return
  const entry: CacheEntry = {
    keys,
    category:    userCategory.value,
    subcategory: userSubcategory.value,
    version:     version ?? null,
    timestamp:   Date.now(),
  }
  localStorage.setItem(key, JSON.stringify(entry))
}

function clearCache(): void {
  if (!process.client) return
  const key = cacheKey()
  if (key) localStorage.removeItem(key)
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
  const vKey = versionKey()
  if (vKey) localStorage.setItem(vKey, v)
  clearCache()
  initialized.value = false
}

// ─── Rehydrate desde cache al cargar la app ──────────────────────────────
function rehydrate(): void {
  if (initialized.value || !process.client) return
  // Limpiar claves globales antiguas (no namespaced por usuario)
  localStorage.removeItem('perm_cache')
  localStorage.removeItem('perm_version')
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
        const vKey = versionKey()
        if (vKey) localStorage.setItem(vKey, data.version)
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
