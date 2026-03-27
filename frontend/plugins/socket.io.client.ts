// plugins/socket.io.client.ts
// Plugin de Nuxt para Socket.IO - manejo global de WebSocket

import { io, Socket } from 'socket.io-client'
import type { InjectionKey } from 'vue'

export interface SocketIOPlugin {
  socket: Socket | null
  connect: (namespace: string, options?: { token?: string; commerceId?: string }) => Socket
  disconnect: () => void
  isConnected: Ref<boolean>
}

export const SocketIOKey: InjectionKey<SocketIOPlugin> = Symbol('socket.io')

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiUrl as string
  
  let socket: Socket | null = null
  const isConnected = ref(false)
  
  const connect = (namespace: string, options: { token?: string; commerceId?: string } = {}) => {
    // Desconectar socket anterior si existe
    if (socket) {
      socket.disconnect()
    }
    
    // Crear nueva conexión
    socket = io(`${apiBase}${namespace}`, {
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
  
  // Limpiar al desmontar la app
  onBeforeUnmount(() => {
    disconnect()
  })
  
  const plugin: SocketIOPlugin = {
    socket: readonly(socket),
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
