import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Server } from 'socket.io'

@WebSocketGateway({
  namespace: '/landing',
  cors: { origin: '*', credentials: true },
})
export class LandingGateway {
  @WebSocketServer()
  server: Server

  // Público — sin auth, cualquier visitante de la landing recibe el evento
  broadcastUpdate(section: 'stats' | 'testimonials' | 'features' | 'steps') {
    this.server.emit('landing:update', { section })
  }
}
