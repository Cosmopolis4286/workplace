import { ref } from 'vue'
import { useServiceRequestMessages } from './useServiceRequestMessages'

// Singleton a nivel de módulo (mismo patrón que useNotifications) — un solo
// contador global compartido por SidebarContent.vue y service-requests.vue,
// para no duplicar estado ni desincronizar el badge entre ambos.
const unreadCount = ref(0)

export function useServiceRequestsUnreadBadge() {
  const { fetchUnreadCount } = useServiceRequestMessages()

  async function refresh() {
    try {
      const { count } = await fetchUnreadCount()
      unreadCount.value = count
    } catch {
      // non-blocking
    }
  }

  return { unreadCount, refresh }
}
