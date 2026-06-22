import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { IsEnum, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { FeeTransactionType, FeePayer } from '@prisma/client';
import { PlatformFeesService } from './platform-fees.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

class UpsertRateBodyDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number;

  @IsEnum(FeePayer)
  payer: FeePayer;
}

class CreateOverrideBodyDto {
  @IsEnum(FeeTransactionType)
  type: FeeTransactionType;

  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number;

  @IsOptional()
  @IsEnum(FeePayer)
  payer?: FeePayer;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

@Controller('platform-fees')
export class PlatformFeesController {
  constructor(private readonly platformFeesService: PlatformFeesService) {}

  @Get('rates/public')
  getPublicRates() {
    return this.platformFeesService.getPublicRates();
  }

  @Get('rates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  getRates() {
    return this.platformFeesService.getRates();
  }

  @Put('rates/:type')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  upsertRate(
    @Param('type') type: FeeTransactionType,
    @Body() dto: UpsertRateBodyDto,
    @CurrentUser() user: any,
  ) {
    return this.platformFeesService.upsertRate(type, dto, user.id);
  }

  @Get('overrides')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  getOverrides() {
    return this.platformFeesService.getOverrides();
  }

  @Post('overrides')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  createOverride(@Body() dto: CreateOverrideBodyDto) {
    return this.platformFeesService.createOverride(dto);
  }

  @Delete('overrides/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  deleteOverride(@Param('id') id: string) {
    return this.platformFeesService.deleteOverride(id);
  }
}
