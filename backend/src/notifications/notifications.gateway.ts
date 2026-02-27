import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'

@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: '*', credentials: true },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Connection lifecycle ──────────────────────────────────────────────────
  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '')

      if (!token) {
        client.disconnect()
        return
      }

      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      })

      // Lookup the restaurant for this user
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { userId: payload.sub },
        select: { id: true },
      })

      if (!restaurant) {
        client.disconnect()
        return
      }

      client.data.restaurantId = restaurant.id
      // Join scoped room so we can broadcast per-restaurant
      await client.join(`restaurant:${restaurant.id}`)
    } catch {
      client.disconnect()
    }
  }

  handleDisconnect(_client: Socket) {
    // no-op: Socket.IO handles room cleanup automatically
  }

  // ── Events from client ────────────────────────────────────────────────────
  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { restaurantId: string }) {
    client.join(`restaurant:${data.restaurantId}`)
    return { event: 'joined', data: { restaurantId: data.restaurantId } }
  }

  // ── Broadcast helpers ─────────────────────────────────────────────────────
  broadcast(restaurantId: string, notification: any) {
    this.server.to(`restaurant:${restaurantId}`).emit('notification', notification)
  }

  broadcastUnreadCount(restaurantId: string, count: number) {
    this.server.to(`restaurant:${restaurantId}`).emit('unread_count', { count })
  }
}
