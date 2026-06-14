import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'

export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) {
    return
  }

  const { lock } = useAppLock()
  const { isAppLockEnabled } = useBiometric()
  const { isAuthenticated } = useAuth()

  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive && isAuthenticated.value && isAppLockEnabled()) {
      lock()
    }
  })
})
