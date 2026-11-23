import { computed, ref } from 'vue'
import { loadOutbox } from '../../utils/offlineCache'

/**
 * Estado compartido del modo sin conexión: si hay red, desde cuándo se
 * muestran datos guardados y cuántas acciones esperan para enviarse.
 */
const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
// Hora de la copia más antigua que se está mostrando (null = datos en vivo).
const servingCacheFrom = ref<string | null>(null)
const pendingCount = ref(loadOutbox().length)

export function useOfflineStatus() {
  function markOnline(value: boolean) {
    online.value = value
    if (value) servingCacheFrom.value = null
  }

  function markServedFromCache(at: string) {
    if (!servingCacheFrom.value || at < servingCacheFrom.value) servingCacheFrom.value = at
  }

  function markLive() {
    servingCacheFrom.value = null
  }

  function refreshPending() {
    pendingCount.value = loadOutbox().length
  }

  return {
    online: computed(() => online.value),
    servingCacheFrom: computed(() => servingCacheFrom.value),
    pendingCount: computed(() => pendingCount.value),
    markOnline,
    markServedFromCache,
    markLive,
    refreshPending,
  }
}
