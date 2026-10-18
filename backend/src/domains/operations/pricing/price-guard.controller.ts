import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PriceGuardService } from './price-guard.service';
import { SimulatePriceDto } from './dto/simulate-price.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';

@UseGuards(JwtAuthGuard, PermissionsGuard, CapabilityGuard)
@RequireCapability('HAS_COMMERCE')
@Controller('price-guard')
export class PriceGuardController {
  constructor(
    private readonly priceGuardService: PriceGuardService,
    private readonly commerceResolver: CommerceResolverService
  ) {}

  @Get(':productId/min-price')
  @RequirePermission('purchases:view')
  async getMinPrice(
    @Param('productId') productId: string,
    @CurrentUser() user: any
  ) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.priceGuardService.getMinPrice(productId, commerceId);
  }

  @Post(':productId/simulate')
  @RequirePermission('purchases:view')
  async simulate(
    @Param('productId') productId: string,
    @CurrentUser() user: any,
    @Body() dto: SimulatePriceDto
  ) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.priceGuardService.simulatePriceChange(
      productId,
      commerceId,
      dto.costIncreasePct ?? 0
    );
  }
}
