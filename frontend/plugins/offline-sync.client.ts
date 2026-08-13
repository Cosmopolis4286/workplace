import { useOfflineStore } from '~/stores/offline'
import { useApi } from '~/composables/core/useApi'

export default defineNuxtPlugin(() => {
  const offlineStore = useOfflineStore()
  const { apiFetch } = useApi()

  let replaying = false

  async function replayPendingActions() {
    if (replaying) return
    replaying = true
    try {
      while (offlineStore.hasPendingActions) {
        const action = offlineStore.pendingActions[0]
        try {
          await apiFetch(action.url, {
            method: action.method,
            body: action.body ? JSON.stringify(action.body) : undefined,
          })
          offlineStore.removeAction(action.id)
        } catch {
          // Detener el replay para no reordenar la cola; se reintenta en la próxima reconexión
          break
        }
      }
    } finally {
      replaying = false
    }
  }

  offlineStore.setOnlineStatus(navigator.onLine)

  window.addEventListener('online', () => {
    offlineStore.setOnlineStatus(true)
    replayPendingActions()
  })
  window.addEventListener('offline', () => offlineStore.setOnlineStatus(false))

  if (navigator.onLine && offlineStore.hasPendingActions) {
    replayPendingActions()
  }
})
