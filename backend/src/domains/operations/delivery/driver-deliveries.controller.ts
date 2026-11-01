import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import {
  RateLimit,
  RateLimitGuard,
} from '../../../common/guards/rate-limit.guard';
import { DeliveryService } from './delivery.service';
import { DriverUpdateStatusDto } from './dto/driver-update-status.dto';

// La "app del repartidor": sin el módulo/permisos de delivery del comercio
// (el repartidor es un usuario aparte). La autorización es ser el repartidor
// asignado a la entrega (DeliveryService.driverUpdateStatus).
@Controller('delivery')
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class DriverDeliveriesController {
  constructor(private readonly deliveries: DeliveryService) {}

  @Post('driver/:id/status')
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 30,
    keyGenerator: (req) => `delivery:driver:status:${(req as any).user?.id}`,
  })
  updateStatus(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: DriverUpdateStatusDto
  ) {
    return this.deliveries.driverUpdateStatus(user.id, id, dto);
  }
}
