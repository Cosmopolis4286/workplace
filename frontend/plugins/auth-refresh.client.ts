// plugins/auth-refresh.client.ts
// Plugin de Nuxt para manejar automáticamente el refresh de tokens JWT
// Se ejecuta solo en el cliente (client-side)

import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(() => {
  // Solo ejecutar en cliente
  if (process.server) return

  const authStore = useAuthStore()
  const config = useRuntimeConfig()

  // Interceptor de errores 401 para intentar refresh automáticamente
  const { $fetch } = useNuxtApp()

  // Configurar interceptores de fetch global
  globalThis.$fetch = globalThis.$fetch.create({
    async onRequest({ request, options }) {
      // Agregar access token a todas las peticiones si existe
      const token = authStore.accessToken
      if (token && !options.headers?.Authorization) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${token}`
        }
      }
    },

    async onResponseError({ request, response, options }) {
      // Si recibimos 401 (Unauthorized), intentar refresh
      if (response.status === 401) {
        const refreshToken = authStore.refreshToken
        
        // Si no hay refresh token, redirigir a login
        if (!refreshToken) {
          authStore.logout()
          return navigateTo('/login')
        }

        try {
          // Intentar refresh
          const { accessToken, refreshToken: newRefreshToken } = await $fetch('/api/auth/refresh', {
            method: 'POST',
            body: { refreshToken }
          })

          // Guardar nuevos tokens
          authStore.setTokens(accessToken, newRefreshToken)

          // Reintentar la petición original con el nuevo token
          return $fetch(request, {
            ...options,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${accessToken}`
            }
          })
        } catch (refreshError) {
          // Si el refresh falla, logout y redirigir
          authStore.logout()
          return navigateTo('/login')
        }
      }
    }
  })

  // Timer para refresh preventivo (antes de que expire el token)
  // JWT expira en 15 minutos, refrescamos a los 12 minutos
  const REFRESH_INTERVAL = 12 * 60 * 1000 // 12 minutos en ms

  let refreshTimer: NodeJS.Timeout | null = null

  const scheduleRefresh = () => {
    if (refreshTimer) clearTimeout(refreshTimer)
    
    if (!authStore.isAuthenticated || !authStore.refreshToken) return

    refreshTimer = setTimeout(async () => {
      try {
        const { accessToken, refreshToken } = await $fetch('/api/auth/refresh', {
          method: 'POST',
          body: { refreshToken: authStore.refreshToken }
        })
        authStore.setTokens(accessToken, refreshToken)
        scheduleRefresh() // Reprogramar próximo refresh
      } catch (error) {
        console.error('Auto-refresh failed:', error)
        authStore.logout()
        navigateTo('/login')
      }
    }, REFRESH_INTERVAL)
  }

  // Iniciar timer cuando el usuario está autenticado
  watch(() => authStore.isAuthenticated, (isAuth) => {
    if (isAuth) {
      scheduleRefresh()
    } else if (refreshTimer) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }
  }, { immediate: true })

  // Limpiar al desmontar
  onBeforeUnmount(() => {
    if (refreshTimer) clearTimeout(refreshTimer)
  })
})
