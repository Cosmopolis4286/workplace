import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { BnplProvider } from '@prisma/client';
import { BnplService } from './bnpl.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UpsertBnplSettingsDto } from './dto/upsert-bnpl-settings.dto';
import { InitiateBnplDto } from './dto/initiate-bnpl.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard, CapabilityGuard)
@RequireCapability('HAS_COMMERCE')
@Controller('bnpl')
export class BnplController {
  constructor(private readonly bnplService: BnplService) {}

  @Get('settings')
  @RequirePermission('settings:view')
  async getSettings(@CurrentUser() user: any) {
    const commerceId = await this.bnplService.getCommerceId(user.id);
    return this.bnplService.getSettings(commerceId);
  }

  @Patch('settings/:provider')
  @RequirePermission('settings:edit')
  async upsertSettings(
    @Param('provider') provider: BnplProvider,
    @CurrentUser() user: any,
    @Body() dto: UpsertBnplSettingsDto
  ) {
    const commerceId = await this.bnplService.getCommerceId(user.id);
    return this.bnplService.upsertSettings(commerceId, provider, dto);
  }

  @Get('eligible-providers')
  @RequirePermission('orders:view')
  async getEligibleProviders(@CurrentUser() user: any) {
    const commerceId = await this.bnplService.getCommerceId(user.id);
    return this.bnplService.getEligibleProviders(commerceId);
  }

  @Post('orders/:orderId/initiate')
  @RequirePermission('orders:create')
  async initiate(
    @Param('orderId') orderId: string,
    @CurrentUser() user: any,
    @Body() dto: InitiateBnplDto
  ) {
    const commerceId = await this.bnplService.getCommerceId(user.id);
    return this.bnplService.initiate(commerceId, orderId, dto.provider);
  }

  @Get('transactions/:id')
  @RequirePermission('orders:view')
  async getStatus(@Param('id') id: string, @CurrentUser() user: any) {
    const commerceId = await this.bnplService.getCommerceId(user.id);
    return this.bnplService.getStatus(id, commerceId);
  }

  @Post('transactions/:id/cancel')
  @RequirePermission('orders:edit')
  async cancel(@Param('id') id: string, @CurrentUser() user: any) {
    const commerceId = await this.bnplService.getCommerceId(user.id);
    return this.bnplService.cancel(id, commerceId);
  }
}
