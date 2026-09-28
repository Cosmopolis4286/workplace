import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { GroupBuyingService } from './group-buying.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CreatePledgeDto } from './dto/create-pledge.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';

@UseGuards(JwtAuthGuard, PermissionsGuard, CapabilityGuard)
@RequireCapability('HAS_COMMERCE')
@Controller('group-buying')
export class GroupBuyingController {
  constructor(
    private readonly groupBuyingService: GroupBuyingService,
    private readonly commerceResolver: CommerceResolverService,
  ) {}

  @Get('campaigns')
  @RequirePermission('purchases:view')
  async listOpen() {
    return this.groupBuyingService.listOpen();
  }

  @Get('campaigns/:id')
  @RequirePermission('purchases:view')
  async getCampaign(@Param('id') id: string) {
    return this.groupBuyingService.getCampaign(id);
  }

  @Post('campaigns')
  @RequirePermission('purchases:create')
  async createCampaign(@CurrentUser() user: any, @Body() dto: CreateCampaignDto) {
    return this.groupBuyingService.createCampaign(user.id, dto);
  }

  @Post('campaigns/:id/close')
  @RequirePermission('purchases:create')
  async close(@Param('id') id: string, @CurrentUser() user: any) {
    return this.groupBuyingService.close(id, user.id);
  }

  @Post('campaigns/:id/cancel')
  @RequirePermission('purchases:create')
  async cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.groupBuyingService.cancel(id, user.id);
  }

  @Post('campaigns/:id/pledges')
  @RequirePermission('purchases:create')
  async pledge(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreatePledgeDto,
  ) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.groupBuyingService.pledge(id, commerceId, dto);
  }

  @Delete('campaigns/:id/pledges')
  @RequirePermission('purchases:create')
  async cancelPledge(@Param('id') id: string, @CurrentUser() user: any) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.groupBuyingService.cancelPledge(id, commerceId);
  }
}
