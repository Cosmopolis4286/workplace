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
import { CorridasService } from './corridas.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateCorridaDto } from './dto/create-corrida.dto';
import { CalculatePriceDto } from './dto/calculate-price.dto';
import { CorridaStatus, CorridaServiceType } from '@prisma/client';
import { IsEnum } from 'class-validator';

class UpdateCorridaStatusDto {
  @IsEnum(CorridaStatus)
  status: CorridaStatus;
}

@Controller('corridas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CorridasController {
  constructor(private readonly corridasService: CorridasService) {}

  // POST /api/corridas/calculate-price
  @Post('calculate-price')
  @RequirePermission('corridas:create')
  @HttpCode(HttpStatus.OK)
  calculatePrice(@Body() dto: CalculatePriceDto) {
    return this.corridasService.calculatePrice(dto);
  }

  // GET /api/corridas/available — PENDING rides for drivers
  @Get('available')
  @RequirePermission('corridas:manage')
  findAvailable(@Query('serviceType') serviceType?: CorridaServiceType) {
    return this.corridasService.findAvailable(serviceType);
  }

  // GET /api/corridas/mine — passenger's own rides
  @Get('mine')
  @RequirePermission('corridas:view')
  findMine(@CurrentUser() user: { id: string }) {
    return this.corridasService.findMine(user.id);
  }

  // GET /api/corridas/driver — driver's assigned rides
  @Get('driver')
  @RequirePermission('corridas:manage')
  findDriverCorridas(@CurrentUser() user: { id: string }) {
    return this.corridasService.findDriverCorridas(user.id);
  }

  // GET /api/corridas/:id
  @Get(':id')
  @RequirePermission('corridas:view')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.corridasService.findOne(user.id, id);
  }

  // POST /api/corridas — passenger requests a ride
  @Post()
  @RequirePermission('corridas:create')
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateCorridaDto) {
    return this.corridasService.create(user.id, dto);
  }

  // POST /api/corridas/:id/accept — driver accepts
  @Post(':id/accept')
  @RequirePermission('corridas:manage')
  accept(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.corridasService.accept(user.id, id);
  }

  // PATCH /api/corridas/:id/status — driver advances (IN_PROGRESS, COMPLETED)
  @Patch(':id/status')
  @RequirePermission('corridas:manage')
  updateStatus(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateCorridaStatusDto,
  ) {
    return this.corridasService.updateStatus(user.id, id, dto.status);
  }

  // POST /api/corridas/:id/cancel — passenger cancels PENDING
  @Post(':id/cancel')
  @RequirePermission('corridas:create')
  cancel(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.corridasService.cancel(user.id, id);
  }
}
