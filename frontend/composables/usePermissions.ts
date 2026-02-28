import { ref, computed } from 'vue'

// ─── Singleton global (compartido entre todas las instancias del composable) ──

const permissionKeys = ref<string[]>([])
const loading = ref(false)
const initialized = ref(false)

// ─── Warm-cache: carga desde localStorage antes del primer fetch ──────────────

function rehydratePermissions(): void {
  if (initialized.value || !process.client) return
  try {
    const cached = localStorage.getItem('perm_keys')
    if (cached) {
      permissionKeys.value = JSON.parse(cached) as string[]
      initialized.value = true
    }
  } catch {
    localStorage.removeItem('perm_keys')
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

  async function fetchPermissions(): Promise<void> {
    if (!isAuthenticated.value || loading.value) return
    loading.value = true
    try {
      const doFetch = () =>
        fetch(`${apiUrl}/api/permissions/me`, {
          headers: { ...getHeaders() },
        })

      let res = await doFetch()
      if (res.status === 401) {
        const ok = await refreshAccessToken()
        if (!ok) { clearPermissions(); return }
        res = await doFetch()
      }
      if (!res.ok) throw new Error('Failed to fetch permissions')

      const data = await res.json() as { keys: string[] }
      permissionKeys.value = data.keys
      initialized.value = true

      if (process.client) {
        localStorage.setItem('perm_keys', JSON.stringify(data.keys))
      }
    } catch {
      // Graceful degradation: localStorage warm cache ya se cargó en rehydrate
    } finally {
      loading.value = false
    }
  }

  function clearPermissions(): void {
    permissionKeys.value = []
    initialized.value = false
    if (process.client) localStorage.removeItem('perm_keys')
  }

  return {
    permissionKeys: computed(() => permissionKeys.value),
    loading: computed(() => loading.value),
    initialized: computed(() => initialized.value),
    can,
    canAny,
    canAll,
    fetchPermissions,
    clearPermissions,
  }
}
