import type { Socket } from 'socket.io-client'
import { useApi } from './useApi'

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType = 'ORDER' | 'DELIVERY' | 'INVENTORY' | 'APPOINTMENT' | 'EXPENSE' | 'SYSTEM'
export type NotificationColor = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  readAt?: string | null
  icon: string
  color: NotificationColor
  link?: string | null
  metadata?: Record<string, any> | null
  commerceId: string
  createdAt: string
}

// ─── Global singleton state ───────────────────────────────────────────────────

const notifications  = ref<Notification[]>([])
const loading        = ref(false)
const error          = ref<string | null>(null)
const totalCount     = ref(0)
const unreadCount    = computed(() => notifications.value.filter(n => !n.read).length)

let socketRestaurantId: string | null = null

// ─── Composable ───────────────────────────────────────────────────────────────

export const useNotifications = () => {
  const { $socketio } = useNuxtApp()
  const { token } = useAuth()
  const { get, patch, del } = useApi()

  // ── REST: load notifications ──────────────────────────────────────────────
  async function fetchNotifications(opts: { unread?: boolean; page?: number; limit?: number } = {}) {
    loading.value = true
    error.value   = null
    try {
      const params = new URLSearchParams()
      if (opts.unread)  params.set('unread', 'true')
      if (opts.page)    params.set('page',   String(opts.page))
      if (opts.limit)   params.set('limit',  String(opts.limit))
      const qs = params.toString()
      const res = await get<{ data: Notification[]; total: number }>(`/notifications${qs ? '?' + qs : ''}`)
      notifications.value = res.data
      totalCount.value     = res.total
    } catch (e: any) {
      error.value = e?.message
    } finally {
      loading.value = false
    }
  }

  // ── REST: mark one as read ────────────────────────────────────────────────
  async function markAsRead(id: string) {
    const n = notifications.value.find(n => n.id === id)
    if (!n || n.read) return
    // Optimistic update
    n.read   = true
    n.readAt = new Date().toISOString()
    try {
      await patch(`/notifications/${id}/read`, {})
    } catch {
      n.read   = false
      n.readAt = null
    }
  }

  // ── REST: mark all as read ────────────────────────────────────────────────
  async function markAllAsRead() {
    notifications.value.forEach(n => { n.read = true; n.readAt = new Date().toISOString() })
    try {
      await patch('/notifications/read-all', {})
    } catch (e: any) {
      error.value = e?.message
    }
  }

  // ── REST: delete one ──────────────────────────────────────────────────────
  async function deleteNotification(id: string) {
    notifications.value = notifications.value.filter(n => n.id !== id)
    try {
      await del(`/notifications/${id}`)
    } catch (e: any) {
      error.value = e?.message
    }
  }

  // ── REST: clear all ───────────────────────────────────────────────────────
  async function clearAll() {
    notifications.value = []
    totalCount.value    = 0
    try {
      await del('/notifications/clear-all')
    } catch (e: any) {
      error.value = e?.message
    }
  }

  // ── WebSocket: connect usando plugin ─────────────────────────────────────
  function connectWebSocket(commerceId: string) {
    if (socketRestaurantId === commerceId && $socketio.isConnected.value) return

    disconnectWebSocket()
    socketRestaurantId = commerceId

    // Usar plugin Socket.IO
    const socket = $socketio.connect('/notifications', {
      token: token.value,
      commerceId,
    })

    // Escuchar eventos específicos de notificaciones
    socket.on('notification', (notification: Notification) => {
      notifications.value.unshift(notification)
      if (notifications.value.length > 100) notifications.value.pop()
      totalCount.value++
    })

    socket.on('unread_count', ({ count }: { count: number }) => {
      const currentRead = notifications.value.filter(n => n.read).length
      const currentUnread = notifications.value.length - currentRead
      if (count !== currentUnread) {
        fetchNotifications()
      }
    })
  }

  function disconnectWebSocket() {
    $socketio.disconnect()
    socketRestaurantId = null
  }

  // ── Init: fetch + connect ─────────────────────────────────────────────────
  async function init(commerceId: string) {
    await fetchNotifications({ limit: 30 })
    connectWebSocket(commerceId)
  }

  return {
    notifications,
    loading,
    error,
    unreadCount,
    totalCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    init,
    disconnectWebSocket,
  }
}
