// plugins/socket.io.client.ts
// Plugin de Nuxt para Socket.IO - manejo global de WebSocket

import { io, Socket } from 'socket.io-client'
import { computed, readonly, ref } from 'vue'
import type { InjectionKey, Ref } from 'vue'

export interface SocketIOPlugin {
  socket: Socket | null
  connect: (namespace: string, options?: { token?: string; commerceId?: string }) => Socket
  disconnect: () => void
  isConnected: Ref<boolean>
}

export const SocketIOKey: InjectionKey<SocketIOPlugin> = Symbol('socket.io')

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  // apiUrl incluye el prefijo REST '/api' (ej: http://localhost:3001/api),
  // pero los namespaces de WebSocket cuelgan de la raíz del host, no de /api.
  const wsBase = (config.public.apiUrl as string).replace(/\/api\/?$/, '')

  let socket: Socket | null = null
  const isConnected = ref(false)

  const connect = (namespace: string, options: { token?: string; commerceId?: string } = {}) => {
    // Desconectar socket anterior si existe
    if (socket) {
      socket.disconnect()
    }

    // Crear nueva conexión
    socket = io(`${wsBase}${namespace}`, {
      auth: { token: options.token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
    })
    
    // Manejar eventos de conexión
    socket.on('connect', () => {
      isConnected.value = true
      console.log(`[Socket.IO] Connected to ${namespace}`)
      
      // Unirse a room del comercio si se proporcionó
      if (options.commerceId) {
        socket?.emit('join', { commerceId: options.commerceId })
      }
    })
    
    socket.on('disconnect', (reason) => {
      isConnected.value = false
      console.log(`[Socket.IO] Disconnected: ${reason}`)
    })
    
    socket.on('connect_error', (err) => {
      console.error('[Socket.IO] Connection error:', err.message)
    })
    
    return socket
  }
  
  const disconnect = () => {
    if (socket) {
      socket.disconnect()
      socket = null
      isConnected.value = false
    }
  }
  
  // Limpiar al cerrar la pestaña - en plugin usamos beforeunload del window
  if (process.client) {
    window.addEventListener('beforeunload', () => {
      disconnect()
    })
  }
  
  const plugin: SocketIOPlugin = {
    socket: computed(() => socket),
    connect,
    disconnect,
    isConnected: readonly(isConnected),
  }
  
  return {
    provide: {
      socketio: plugin,
    },
  }
})
