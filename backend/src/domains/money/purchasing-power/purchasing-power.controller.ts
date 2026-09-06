import { Controller, Get, UseGuards } from '@nestjs/common';
import { PurchasingPowerService } from './purchasing-power.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { AccountTypeGuard } from '../../../common/guards/account-type.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireAccountType } from '../../../common/decorators/require-account-type.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';

@UseGuards(JwtAuthGuard, PermissionsGuard, AccountTypeGuard)
@RequireAccountType('COMMERCE')
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
