import { Controller, Get, UseGuards } from '@nestjs/common';
import { BusinessHealthService } from './business-health.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';

@UseGuards(JwtAuthGuard, PermissionsGuard, CapabilityGuard)
@Controller('business-health')
export class BusinessHealthController {
  constructor(
    private readonly businessHealthService: BusinessHealthService,
    private readonly commerceResolver: CommerceResolverService
  ) {}

  @Get('score')
  @RequirePermission('dashboard:view')
  @RequireCapability('HAS_COMMERCE')
  async getScore(@CurrentUser() user: any) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.businessHealthService.getScore(commerceId);
  }

  // platform:monitor (no COMMERCE): resumen agregado para SUPERADMIN/ADMIN,
  // ver comentario en BusinessHealthService.getPlatformSummary.
  @Get('platform-summary')
  @RequirePermission('platform:monitor')
  getPlatformSummary() {
    return this.businessHealthService.getPlatformSummary();
  }
}
