import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: '*', credentials: true },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  // ── Connection lifecycle ──────────────────────────────────────────────────
  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace(
          'Bearer ',
          ''
        );

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });

      // Always join user room for direct notifications
      client.data.userId = payload.sub;
      await client.join(`user:${payload.sub}`);

      // Also join restaurant room if the user has one
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { userId: payload.sub },
        select: { id: true },
      });

      if (restaurant) {
        client.data.commerceId = restaurant.id;
        await client.join(`restaurant:${restaurant.id}`);
      }
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: Socket) {
    // no-op: Socket.IO handles room cleanup automatically
  }

  // ── Events from client ────────────────────────────────────────────────────
  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { commerceId: string }
  ) {
    client.join(`restaurant:${data.commerceId}`);
    return { event: 'joined', data: { commerceId: data.commerceId } };
  }

  // ── Broadcast helpers ─────────────────────────────────────────────────────
  broadcast(commerceId: string, notification: any) {
    this.server
      .to(`restaurant:${commerceId}`)
      .emit('notification', notification);
  }

  broadcastToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  broadcastUnreadCount(commerceId: string, count: number) {
    this.server.to(`restaurant:${commerceId}`).emit('unread_count', { count });
  }
}
