import { ApiError, useApi } from '~/composables/core/useApi'
import { useAuth } from '~/composables/auth/useAuth'
import { useOfflineStatus } from '~/composables/core/useOfflineStatus'
import { useToast } from '~/composables/ui/useToast'
import { isNetworkError, loadOutbox, saveOutbox } from '~/utils/offlineCache'

/**
 * Reenvía las acciones guardadas sin señal (utils/offlineCache.ts) cuando
 * vuelve la conexión. Solo las del usuario con sesión; en orden.
 * - Sin red: se detiene y reintenta en la próxima reconexión.
 * - El servidor la rechaza (4xx, p. ej. el pedido ya estaba entregado): se
 *   descarta para no trabar la cola para siempre, y se avisa.
 */
export default defineNuxtPlugin(() => {
  const { apiFetch } = useApi()
  const { user } = useAuth()
  const status = useOfflineStatus()
  const toast = useToast()
  let replaying = false

  async function replay() {
    const userId = user.value?.id
    if (replaying || !userId) return
    replaying = true
    let sent = 0
    try {
      for (const item of loadOutbox().filter(i => i.userId === userId)) {
        try {
          await apiFetch(item.url, { method: item.method, body: JSON.stringify(item.body ?? {}) })
          sent++
        } catch (err) {
          if (isNetworkError(err)) break
          const message = err instanceof ApiError ? err.message : 'error'
          toast.warning(`No se pudo enviar "${item.label}"`, message)
        }
        saveOutbox(loadOutbox().filter(i => i.id !== item.id))
      }
    } finally {
      replaying = false
      status.refreshPending()
      if (sent > 0) toast.success(`Volvió la señal: ${sent} ${sent === 1 ? 'acción enviada' : 'acciones enviadas'}`)
    }
  }

  status.markOnline(navigator.onLine)
  window.addEventListener('online', () => {
    status.markOnline(true)
    replay()
  })
  window.addEventListener('offline', () => status.markOnline(false))

  if (navigator.onLine) replay()
})
