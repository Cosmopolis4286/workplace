// plugins/socket.io.client.ts
// Plugin de Nuxt para Socket.IO - manejo global de WebSocket
//
// Soporta múltiples namespaces conectados en simultáneo (ej. /notifications
// + /tracking), indexados por namespace. La API previa (un solo socket
// implícito) se mantiene intacta para no romper useNotifications.ts: sin
// namespace explícito, `socket`/`disconnect()` operan sobre el último
// namespace conectado.

import { io, Socket } from 'socket.io-client'
import { computed, readonly, ref } from 'vue'
import type { InjectionKey, Ref } from 'vue'

export interface SocketIOPlugin {
  socket: Socket | null
  connect: (namespace: string, options?: { token?: string; commerceId?: string }) => Socket
  disconnect: (namespace?: string) => void
  isConnected: Ref<boolean>
  isNamespaceConnected: (namespace: string) => boolean
}

export const SocketIOKey: InjectionKey<SocketIOPlugin> = Symbol('socket.io')

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  // apiUrl incluye el prefijo REST '/api' (ej: http://localhost:3001/api),
  // pero los namespaces de WebSocket cuelgan de la raíz del host, no de /api.
  const wsBase = (config.public.apiUrl as string).replace(/\/api\/?$/, '')

  const sockets = new Map<string, Socket>()
  const connectedNamespaces = ref<Set<string>>(new Set())
  let lastNamespace: string | null = null

  const isConnected = computed(() =>
    lastNamespace ? connectedNamespaces.value.has(lastNamespace) : false
  )

  const connect = (namespace: string, options: { token?: string; commerceId?: string } = {}) => {
    // Desconectar socket previo del MISMO namespace si existe (reconexión
    // con credenciales nuevas), sin afectar otros namespaces activos.
    const existing = sockets.get(namespace)
    if (existing) {
      existing.disconnect()
      sockets.delete(namespace)
    }

    const socket = io(`${wsBase}${namespace}`, {
      auth: { token: options.token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
    })

    socket.on('connect', () => {
      connectedNamespaces.value = new Set(connectedNamespaces.value).add(namespace)
      console.log(`[Socket.IO] Connected to ${namespace}`)

      if (options.commerceId) {
        socket.emit('join', { commerceId: options.commerceId })
      }
    })

    socket.on('disconnect', (reason) => {
      const next = new Set(connectedNamespaces.value)
      next.delete(namespace)
      connectedNamespaces.value = next
      console.log(`[Socket.IO] Disconnected from ${namespace}: ${reason}`)
    })

    socket.on('connect_error', (err) => {
      console.error(`[Socket.IO] Connection error on ${namespace}:`, err.message)
    })

    sockets.set(namespace, socket)
    lastNamespace = namespace
    return socket
  }

  const disconnect = (namespace?: string) => {
    const target = namespace ?? lastNamespace
    if (!target) return

    const socket = sockets.get(target)
    if (socket) {
      socket.disconnect()
      sockets.delete(target)
    }
    const next = new Set(connectedNamespaces.value)
    next.delete(target)
    connectedNamespaces.value = next

    if (target === lastNamespace) {
      lastNamespace = null
    }
  }

  const isNamespaceConnected = (namespace: string) => connectedNamespaces.value.has(namespace)

  // Limpiar al cerrar la pestaña - en plugin usamos beforeunload del window
  if (process.client) {
    window.addEventListener('beforeunload', () => {
      sockets.forEach((s) => s.disconnect())
      sockets.clear()
    })
  }

  const plugin: SocketIOPlugin = {
    socket: computed(() => (lastNamespace ? sockets.get(lastNamespace) ?? null : null)) as unknown as Socket | null,
    connect,
    disconnect,
    isConnected: readonly(isConnected) as unknown as Ref<boolean>,
    isNamespaceConnected,
  }

  return {
    provide: {
      socketio: plugin,
    },
  }
})
