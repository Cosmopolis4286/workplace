// plugins/auth-refresh.client.ts
// Plugin de Nuxt para manejar automáticamente el refresh de tokens JWT
// Se ejecuta solo en el cliente (client-side)

import { watch } from 'vue'
import { defineNuxtPlugin, useRuntimeConfig, useNuxtApp, navigateTo } from '#app'
import type { FetchOptions } from 'ofetch'

export default defineNuxtPlugin(() => {
  // Solo ejecutar en cliente
  if (process.server) return

  const auth = useAuth()
  const config = useRuntimeConfig()

  // Interceptor de errores 401 para intentar refresh automáticamente
  const { $fetch } = useNuxtApp()

  // Configurar interceptores de fetch global
  globalThis.$fetch = globalThis.$fetch.create({
    async onRequest({ request, options }) {
      // Agregar access token a todas las peticiones si existe
      const token = auth.token.value
      if (token && !options.headers?.get('Authorization')) {
        options.headers = new Headers(options.headers)
        options.headers.set('Authorization', `Bearer ${token}`)
      }
    },

    async onResponseError({ request, response, options }) {
      // Si recibimos 401 (Unauthorized), intentar refresh
      if (response.status === 401) {
        // Intentar refresh usando el composable
        const refreshed = await auth.refreshAccessToken()
        
        // Si no se pudo refrescar, hacer logout
        if (!refreshed) {
          auth.logout()
          return navigateTo('/login')
        }

        // Reintentar la petición original con el nuevo token
        return $fetch(request, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${auth.token.value}`
          }
        } as FetchOptions)
      }
    }
  })

  // Timer para refresh preventivo (antes de que expire el token)
  // JWT expira en 15 minutos, refrescamos a los 12 minutos
  const REFRESH_INTERVAL = 12 * 60 * 1000 // 12 minutos en ms

  let refreshTimer: NodeJS.Timeout | null = null

  const scheduleRefresh = () => {
    if (refreshTimer) clearTimeout(refreshTimer)
    
    if (!auth.isAuthenticated.value) return

    refreshTimer = setTimeout(async () => {
      try {
        await auth.refreshAccessToken()
        scheduleRefresh() // Reprogramar próximo refresh
      } catch (error) {
        console.error('Auto-refresh failed:', error)
        auth.logout()
        navigateTo('/login')
      }
    }, REFRESH_INTERVAL)
  }

  // Iniciar timer cuando el usuario está autenticado
  watch(() => auth.isAuthenticated.value, (isAuth: boolean) => {
    if (isAuth) {
      scheduleRefresh()
    } else if (refreshTimer) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }
  }, { immediate: true })

  // Limpiar al desmontar - en plugin usamos beforeunload del window
  if (process.client) {
    window.addEventListener('beforeunload', () => {
      if (refreshTimer) clearTimeout(refreshTimer)
    })
  }
})
