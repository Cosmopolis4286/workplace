import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { TrackingService } from './tracking.service';
import { TrackingGateway } from './tracking.gateway';
import { UpdateLocationDto } from './dto/update-location.dto';

// Sin @RequireModule/@RequireCapability a propósito: a diferencia de
// DeliveryController (exige Commerce), este endpoint también lo consume el cliente final y el
// repartidor — la autorización real es por-entrega, vía
// TrackingService.assertCanView/publishLocation, no por tipo de cuenta.
@Controller('delivery')
@UseGuards(JwtAuthGuard)
export class TrackingController {
  constructor(
    private readonly trackingService: TrackingService,
    private readonly trackingGateway: TrackingGateway
  ) {}

  // Entregas activas asignadas al driver vinculado al usuario logueado — la
  // "app del repartidor". Prefijo /driver/ (no /:id) a propósito: evita que
  // Nest la confunda con GET /delivery/:id de DeliveryController, registrado
  // antes en el árbol de módulos.
  @Get('driver/my-deliveries')
  async myDeliveries(@CurrentUser() user: { id: string }) {
    return this.trackingService.findMyActiveDeliveries(user.id);
  }

  // Fetch inicial (posición actual + ruta + ETA) antes de conectar el WS.
  @Get(':id/tracking')
  async getSnapshot(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    await this.trackingService.assertCanView(id, user.id);
    return this.trackingService.getSnapshot(id);
  }

  // Alternativa HTTP a el evento WS driver:location — mismo throttling y
  // misma autorización (solo el driver asignado, y solo si trackingActive).
  @Post(':id/location')
  async publishLocation(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto
  ) {
    const { accepted, snapshot } = await this.trackingService.publishLocation(id, user.id, dto);
    if (accepted) {
      this.trackingGateway.emitLocationUpdate(id, snapshot);
    }
    return { accepted, snapshot };
  }
}
