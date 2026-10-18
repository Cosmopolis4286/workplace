import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RidesService } from './rides.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { KycApprovedGuard } from '../../../common/guards/kyc-approved.guard';
import { RateLimit } from '../../../common/guards/rate-limit.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CreateRideDto } from './dto/create-ride.dto';
import { CalculatePriceDto } from './dto/calculate-price.dto';
import { RideStatus, RideServiceType } from '@prisma/client';
import { IsEnum } from 'class-validator';

class UpdateRideStatusDto {
  @IsEnum(RideStatus)
  status: RideStatus;
}

@Controller('rides')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  // POST /api/rides/calculate-price
  @Post('calculate-price')
  @RequirePermission('corridas:create')
  @HttpCode(HttpStatus.OK)
  calculatePrice(@Body() dto: CalculatePriceDto) {
    return this.ridesService.calculatePrice(dto);
  }

  // GET /api/rides/available — PENDING rides for drivers
  @Get('available')
  @RequirePermission('corridas:manage')
  findAvailable(@Query('serviceType') serviceType?: RideServiceType) {
    return this.ridesService.findAvailable(serviceType);
  }

  // GET /api/rides/mine — passenger's own rides
  @Get('mine')
  @RequirePermission('corridas:view')
  findMine(@CurrentUser() user: { id: string }) {
    return this.ridesService.findMine(user.id);
  }

  // GET /api/rides/driver — driver's assigned rides
  @Get('driver')
  @RequirePermission('corridas:manage')
  findDriverRides(@CurrentUser() user: { id: string }) {
    return this.ridesService.findDriverRides(user.id);
  }

  // GET /api/rides/:id
  @Get(':id')
  @RequirePermission('corridas:view')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.ridesService.findOne(user.id, id);
  }

  // POST /api/rides — passenger requests a ride
  @Post()
  @UseGuards(KycApprovedGuard)
  @RequirePermission('corridas:create')
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 10,
    keyGenerator: (req) => `rides:create:${(req as any).user?.id}`,
  })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateRideDto) {
    return this.ridesService.create(user.id, dto);
  }

  // POST /api/rides/:id/accept — driver accepts
  @Post(':id/accept')
  @UseGuards(KycApprovedGuard)
  @RequirePermission('corridas:manage')
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 20,
    keyGenerator: (req) => `rides:accept:${(req as any).user?.id}`,
  })
  accept(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.ridesService.accept(user.id, id);
  }

  // PATCH /api/rides/:id/status — driver advances (IN_PROGRESS, COMPLETED)
  @Patch(':id/status')
  @RequirePermission('corridas:manage')
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 20,
    keyGenerator: (req) => `rides:status:${(req as any).user?.id}`,
  })
  updateStatus(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateRideStatusDto
  ) {
    return this.ridesService.updateStatus(user.id, id, dto.status);
  }

  // POST /api/rides/:id/cancel — passenger cancels PENDING
  @Post(':id/cancel')
  @RequirePermission('corridas:create')
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 10,
    keyGenerator: (req) => `rides:cancel:${(req as any).user?.id}`,
  })
  cancel(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.ridesService.cancel(user.id, id);
  }
}
