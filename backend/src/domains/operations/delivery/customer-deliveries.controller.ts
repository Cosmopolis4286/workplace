import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import {
  RateLimit,
  RateLimitGuard,
} from '../../../common/guards/rate-limit.guard';
import { TrackingService } from './tracking/tracking.service';
import { DeliveryFeedbackService } from './delivery-feedback.service';
import { RateDeliveryDto } from './dto/rate-delivery.dto';

// El lado del cliente: sus entregas y la calificación al repartidor. Sin
// permisos de comercio: la autorización es ser el cliente de la entrega.
@Controller('delivery')
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class CustomerDeliveriesController {
  constructor(
    private readonly tracking: TrackingService,
    private readonly feedback: DeliveryFeedbackService
  ) {}

  @Get('customer/mine')
  mine(@CurrentUser() user: { id: string }) {
    return this.tracking.findMyCustomerDeliveries(user.id);
  }

  @Get(':id/rating')
  myRating(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.feedback.getMyRating(id, user.id);
  }

  @Post(':id/rating')
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 10,
    keyGenerator: (req) => `delivery:rating:${(req as any).user?.id}`,
  })
  rate(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RateDeliveryDto
  ) {
    return this.feedback.rate(id, user.id, dto);
  }
}
