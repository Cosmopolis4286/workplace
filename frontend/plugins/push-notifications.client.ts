import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) return

  const { isAuthenticated } = useAuth()
  const { apiFetch } = useApi()

  let currentToken: string | null = null

  async function registerToken(token: string) {
    try {
      await apiFetch('/notifications/device-token', {
        method: 'POST',
        body: JSON.stringify({ token, platform: 'android' }),
      })
      currentToken = token
    } catch (error) {
      console.error('❌ Error registrando device token:', error)
    }
  }

  async function unregisterToken(token: string) {
    try {
      await apiFetch('/notifications/device-token', {
        method: 'DELETE',
        body: JSON.stringify({ token }),
      })
    } catch (error) {
      console.error('❌ Error eliminando device token:', error)
    } finally {
      currentToken = null
    }
  }

  async function init() {
    const permission = await PushNotifications.requestPermissions()
    if (permission.receive !== 'granted') return

    await PushNotifications.register()
  }

  PushNotifications.addListener('registration', (token) => {
    if (isAuthenticated.value) {
      registerToken(token.value)
    }
  })

  PushNotifications.addListener('registrationError', (error) => {
    console.error('❌ Error de registro push:', error)
  })

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('🔔 Notificación push recibida (foreground):', notification)
  })

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const link = action.notification.data?.link
    if (link) {
      navigateTo(link)
    }
  })

  // Al cerrar sesión, eliminar el token del backend para no enviar push a sesiones cerradas
  watch(isAuthenticated, (authenticated) => {
    if (!authenticated && currentToken) {
      unregisterToken(currentToken)
    }
  })

  if (isAuthenticated.value) {
    init().catch((error) => console.error('❌ Error inicializando push notifications:', error))
  }
})
