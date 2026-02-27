import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { DeliveryService } from './delivery.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { CreateDriverDto } from './dto/create-driver.dto'
import { UpdateDriverDto } from './dto/update-driver.dto'
import { CreateDeliveryDto } from './dto/create-delivery.dto'
import { UpdateDeliveryDto } from './dto/update-delivery.dto'
import { QueryDeliveriesDto } from './dto/query-delivery.dto'
import { DeliveryStatus, DriverStatus } from '@prisma/client'
import { IsEnum, IsString } from 'class-validator'

class UpdateDeliveryStatusDto {
  @IsEnum(DeliveryStatus)
  status: DeliveryStatus
}

class UpdateDriverStatusDto {
  @IsEnum(DriverStatus)
  status: DriverStatus
}

class AssignDriverDto {
  @IsString()
  driverId: string
}

@Controller('delivery')
@UseGuards(JwtAuthGuard)
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  // ─── Stats ────────────────────────────────────────────────────────────────

  @Get('stats')
  getStats(@CurrentUser() user: { id: string }) {
    return this.deliveryService.getStats(user.id)
  }

  // ─── Drivers ──────────────────────────────────────────────────────────────

  @Get('drivers')
  findAllDrivers(@CurrentUser() user: { id: string }) {
    return this.deliveryService.findAllDrivers(user.id)
  }

  @Post('drivers')
  createDriver(@CurrentUser() user: { id: string }, @Body() dto: CreateDriverDto) {
    return this.deliveryService.createDriver(user.id, dto)
  }

  @Put('drivers/:id')
  updateDriver(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateDriverDto,
  ) {
    return this.deliveryService.updateDriver(user.id, id, dto)
  }

  @Patch('drivers/:id/status')
  updateDriverStatus(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateDriverStatusDto,
  ) {
    return this.deliveryService.updateDriverStatus(user.id, id, dto.status)
  }

  @Delete('drivers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDriver(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.deliveryService.removeDriver(user.id, id)
  }

  // ─── Deliveries ───────────────────────────────────────────────────────────

  @Get()
  findAll(@CurrentUser() user: { id: string }, @Query() query: QueryDeliveriesDto) {
    return this.deliveryService.findAllDeliveries(user.id, query)
  }

  @Get(':id')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.deliveryService.findOneDelivery(user.id, id)
  }

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateDeliveryDto) {
    return this.deliveryService.createDelivery(user.id, dto)
  }

  @Put(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryDto,
  ) {
    return this.deliveryService.updateDelivery(user.id, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.deliveryService.removeDelivery(user.id, id)
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryStatusDto,
  ) {
    return this.deliveryService.updateDeliveryStatus(user.id, id, dto.status)
  }

  @Patch(':id/assign')
  assignDriver(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: AssignDriverDto,
  ) {
    return this.deliveryService.assignDriver(user.id, id, dto.driverId)
  }
}
