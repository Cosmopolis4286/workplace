// JWT expira en 15 minutos; refrescamos preventivamente a los 12 para evitar
// que una llamada a mitad de sesión dependa del reintento reactivo en 401.
const REFRESH_INTERVAL = 12 * 60 * 1000

export default defineNuxtPlugin(() => {
  const auth = useAuth()
  auth.ensureSessionVerified().catch(() => {})

  let refreshTimer: ReturnType<typeof setTimeout> | null = null

  const scheduleRefresh = () => {
    if (refreshTimer) clearTimeout(refreshTimer)
    if (!auth.isAuthenticated.value) return

    refreshTimer = setTimeout(async () => {
      const refreshed = await auth.refreshAccessToken()
      if (refreshed) scheduleRefresh()
    }, REFRESH_INTERVAL)
  }

  watch(auth.isAuthenticated, (isAuth) => {
    if (isAuth) {
      scheduleRefresh()
    } else if (refreshTimer) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }
  }, { immediate: true })
})
