import { Controller, Get, UseGuards } from '@nestjs/common';
import { PurchasingPowerService } from './purchasing-power.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';

@UseGuards(JwtAuthGuard, PermissionsGuard, CapabilityGuard)
@RequireCapability('HAS_COMMERCE')
@Controller('purchasing-power')
export class PurchasingPowerController {
  constructor(
    private readonly purchasingPowerService: PurchasingPowerService,
    private readonly commerceResolver: CommerceResolverService,
  ) {}

  @Get()
  @RequirePermission('purchases:view')
  async getPurchasingPower(@CurrentUser() user: any) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.purchasingPowerService.getPurchasingPower(commerceId);
  }
}
