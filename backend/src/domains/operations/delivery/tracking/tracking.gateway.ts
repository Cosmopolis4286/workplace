import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TrackingService } from './tracking.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

// Namespace separado de /notifications: el tracking es un stream de alta
// frecuencia (posición GPS) con su propio modelo de autorización por-entrega
// (ver TrackingService.assertCanView), distinto del modelo por-comercio/
// por-usuario de NotificationsGateway. Mismo patrón de auth por handshake.
@WebSocketGateway({
  namespace: '/tracking',
  cors: { origin: '*', credentials: true },
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly trackingService: TrackingService
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      client.data.userId = payload.sub;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: Socket) {
    // no-op: Socket.IO limpia las rooms automáticamente
  }

  // Un cliente/repartidor/comercio se suscribe a UNA entrega puntual. La
  // autorización se re-verifica en cada join (nunca se asume por el solo
  // hecho de tener un JWT válido) — ver TrackingService.assertCanView.
  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deliveryId: string }
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId || !data?.deliveryId) {
      return { event: 'error', data: { message: 'Solicitud inválida' } };
    }

    try {
      await this.trackingService.assertCanView(data.deliveryId, userId);
    } catch {
      return { event: 'error', data: { message: 'No autorizado' } };
    }

    await client.join(this.room(data.deliveryId));
    return { event: 'joined', data: { deliveryId: data.deliveryId } };
  }

  @SubscribeMessage('leave')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { deliveryId: string }) {
    if (data?.deliveryId) client.leave(this.room(data.deliveryId));
  }

  // El repartidor publica su posición directamente por WS (además del
  // endpoint REST equivalente) para minimizar latencia — ambos caminos
  // pasan por TrackingService.publishLocation, que re-valida autorización
  // y aplica el mismo throttling por distancia/tiempo.
  @SubscribeMessage('driver:location')
  async handleDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deliveryId: string } & Record<string, unknown>
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId || !data?.deliveryId) return;

    const dto = plainToInstance(UpdateLocationDto, data);
    const errors = await validate(dto);
    if (errors.length > 0) {
      return { event: 'error', data: { message: 'Coordenadas inválidas' } };
    }

    try {
      const { accepted, snapshot } = await this.trackingService.publishLocation(
        data.deliveryId,
        userId,
        dto
      );
      if (accepted) {
        this.emitLocationUpdate(data.deliveryId, snapshot);
      }
    } catch (err) {
      this.logger.warn(`driver:location rejected: ${(err as Error).message}`);
      return { event: 'error', data: { message: (err as Error).message } };
    }
  }

  // ─── Broadcast helpers (invocados también desde TrackingService/DeliveryService) ───

  emitLocationUpdate(deliveryId: string, location: unknown) {
    this.server.to(this.room(deliveryId)).emit('DELIVERY_LOCATION_UPDATED', {
      deliveryId,
      location,
    });
  }

  emitStatusUpdate(deliveryId: string, status: string, trackingActive: boolean) {
    this.server.to(this.room(deliveryId)).emit('DELIVERY_STATUS_UPDATED', {
      deliveryId,
      status,
      trackingActive,
    });
    // El estado terminal corta la sala: nadie sigue recibiendo ubicación
    // después de que trackingActive pasa a false.
    if (!trackingActive) {
      this.server.socketsLeave(this.room(deliveryId));
    }
  }

  private room(deliveryId: string) {
    return `delivery:${deliveryId}`;
  }
}
