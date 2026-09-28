import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AlertEngineService } from './alert-engine.service';
import { UpsertAlertRuleDto } from './dto/upsert-alert-rule.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';
import { AlertType } from '@prisma/client';

@UseGuards(JwtAuthGuard, PermissionsGuard, CapabilityGuard)
@RequireCapability('HAS_COMMERCE')
@Controller('alert-rules')
export class AlertEngineController {
  constructor(
    private readonly alertEngineService: AlertEngineService,
    private readonly commerceResolver: CommerceResolverService,
  ) {}

  @Get()
  @RequirePermission('settings:view')
  async listRules(@CurrentUser() user: any) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.alertEngineService.listRules(commerceId);
  }

  @Put(':alertType')
  @RequirePermission('settings:edit')
  async upsertRule(
    @Param('alertType') alertType: AlertType,
    @CurrentUser() user: any,
    @Body() dto: Omit<UpsertAlertRuleDto, 'alertType'>,
  ) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.alertEngineService.upsertRule(commerceId, { ...dto, alertType });
  }

  @Delete(':alertType')
  @RequirePermission('settings:edit')
  async resetRule(@Param('alertType') alertType: AlertType, @CurrentUser() user: any) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.alertEngineService.resetRule(commerceId, alertType);
  }
}
