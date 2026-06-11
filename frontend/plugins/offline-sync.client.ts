import { useOfflineStore } from '~/stores/offline'

export default defineNuxtPlugin(() => {
  const offlineStore = useOfflineStore()

  offlineStore.setOnlineStatus(navigator.onLine)

  window.addEventListener('online', () => offlineStore.setOnlineStatus(true))
  window.addEventListener('offline', () => offlineStore.setOnlineStatus(false))
})
