import { ref, computed, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './useAuth'

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

let socket: Socket | null = null
let socketRestaurantId: string | null = null

// ─── Composable ───────────────────────────────────────────────────────────────

export const useNotifications = () => {
  const { token, refreshTokens } = useAuth()
  const config = useRuntimeConfig()
  const apiBase = config.public.apiUrl as string

  // ── Auth-aware fetch ──────────────────────────────────────────────────────
  async function apiFetch(path: string, options: RequestInit = {}) {
    const doRequest = async (tkn: string) =>
      fetch(`${apiBase}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tkn}`,
          ...(options.headers ?? {}),
        },
      })

    let res = await doRequest(token.value)
    if (res.status === 401) {
      const ok = await refreshTokens()
      if (!ok) throw new Error('Sesión expirada')
      res = await doRequest(token.value)
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message ?? `Error ${res.status}`)
    }
    return res.json()
  }

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
      const res = await apiFetch(`/notifications${qs ? '?' + qs : ''}`)
      notifications.value = res.data
      totalCount.value     = res.total
    } catch (e: any) {
      error.value = e.message
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
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' })
    } catch {
      n.read   = false
      n.readAt = null
    }
  }

  // ── REST: mark all as read ────────────────────────────────────────────────
  async function markAllAsRead() {
    notifications.value.forEach(n => { n.read = true; n.readAt = new Date().toISOString() })
    try {
      await apiFetch('/notifications/read-all', { method: 'PATCH' })
    } catch (e: any) {
      error.value = e.message
    }
  }

  // ── REST: delete one ──────────────────────────────────────────────────────
  async function deleteNotification(id: string) {
    notifications.value = notifications.value.filter(n => n.id !== id)
    try {
      await apiFetch(`/notifications/${id}`, { method: 'DELETE' })
    } catch (e: any) {
      error.value = e.message
    }
  }

  // ── REST: clear all ───────────────────────────────────────────────────────
  async function clearAll() {
    notifications.value = []
    totalCount.value    = 0
    try {
      await apiFetch('/notifications/clear-all', { method: 'DELETE' })
    } catch (e: any) {
      error.value = e.message
    }
  }

  // ── WebSocket: connect ────────────────────────────────────────────────────
  function connectWebSocket(commerceId: string) {
    if (socket && socketRestaurantId === commerceId) return // already connected

    disconnectWebSocket()

    // socket.io-client handles the HTTP→WebSocket upgrade internally
    socket = io(`${apiBase}/notifications`, {
      auth:              { token: token.value },
      transports:        ['websocket'],
      reconnection:      true,
      reconnectionDelay: 2000,
    })

    socketRestaurantId = commerceId

    socket.on('connect', () => {
      socket!.emit('join', { commerceId })
    })

    socket.on('notification', (notification: Notification) => {
      // Prepend new notification and keep latest 100
      notifications.value.unshift(notification)
      if (notifications.value.length > 100) notifications.value.pop()
      totalCount.value++
    })

    socket.on('unread_count', ({ count }: { count: number }) => {
      // Sync count from server broadcast (e.g. another tab marked all as read)
      const currentRead = notifications.value.filter(n => n.read).length
      const currentUnread = notifications.value.length - currentRead
      if (count !== currentUnread) {
        // Reload to stay in sync
        fetchNotifications()
      }
    })

    socket.on('connect_error', () => {
      // Silent — will reconnect automatically
    })
  }

  function disconnectWebSocket() {
    if (socket) {
      socket.disconnect()
      socket = null
      socketRestaurantId = null
    }
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
