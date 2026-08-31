import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

@WebSocketGateway({
  namespace: '/landing',
  cors: { origin: '*', credentials: true },
})
export class LandingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  // Público — sin auth, cualquier visitante de la landing recibe el evento
  broadcastUpdate(section: 'stats' | 'testimonials' | 'features' | 'steps') {
    this.server.emit('landing:update', { section })
  }

  // El badge "Plataforma activa" (AuthMarketingPanel) escucha este evento en
  // vez de hacer polling HTTP a /health — cada conexión/desconexión del
  // propio namespace público ya prueba que el WebSocket server está up.
  broadcastHealth(status: 'up' | 'degraded' | 'down' = 'up') {
    this.server.emit('landing:health', { status })
  }

  handleConnection(client: Socket) {
    client.emit('landing:health', { status: 'up' })
  }

  handleDisconnect() {}
}
