import { Controller, Get, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  UpdateCommerceInfoDto,
  UpdatePaymentSettingsDto,
  UpdateOperationSettingsDto,
  UpdateNotificationSettingsDto,
  UpdateModuleSettingsDto,
  UpdateBusinessNameDto,
  UpdatePriceGuardSettingsDto,
  UpdateLocationDto,
  UpdateFreelancerProfileDto,
} from './dto/update-settings.dto';
import {
  UpdateCommerceSlugDto,
  UpdateFreelancerSlugDto,
} from './dto/update-commerce-slug.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard, CapabilityGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermission('settings:view')
  getSettings(@CurrentUser() user: { id: string }) {
    return this.settingsService.getSettings(user.id);
  }

  @Patch('commerce')
  @RequirePermission('settings:edit')
  @RequireCapability('HAS_COMMERCE')
  updateCommerceInfo(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateCommerceInfoDto
  ) {
    return this.settingsService.updateCommerceInfo(user.id, dto);
  }

  // Sin @RequireCapability: a diferencia de 'commerce' (exige HAS_COMMERCE), este
  // endpoint lo usa el onboarding para ambos tipos de cuenta — el nombre se
  // guarda en Commerce.name o FreelancerSettings.professionalName según
  // corresponda (ver SettingsService.updateBusinessName).
  @Patch('business-name')
  @RequirePermission('settings:edit')
  updateBusinessName(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateBusinessNameDto
  ) {
    return this.settingsService.updateBusinessName(user.id, dto);
  }

  // Sin @RequireCapability, mismo criterio que 'business-name': ambos tipos
  // de cuenta fijan su ubicación base para MatchingService.
  @Patch('location')
  @RequirePermission('settings:edit')
  updateLocation(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateLocationDto
  ) {
    return this.settingsService.updateLocation(user.id, dto);
  }

  @Patch('payment')
  @RequirePermission('settings:edit')
  updatePaymentSettings(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdatePaymentSettingsDto
  ) {
    return this.settingsService.updatePaymentSettings(user.id, dto);
  }

  @Get('commerce/check-slug')
  @RequirePermission('settings:view')
  @RequireCapability('HAS_COMMERCE')
  checkCommerceSlug(
    @CurrentUser() user: { id: string },
    @Query('slug') slug: string
  ) {
    if (!slug || slug.length < 3) {
      return {
        available: false,
        canChange: true,
        daysLeft: 0,
        nextChangeAt: null,
      };
    }
    return this.settingsService.checkCommerceSlugAvailability(user.id, slug);
  }

  @Patch('commerce/slug')
  @RequirePermission('settings:edit')
  @RequireCapability('HAS_COMMERCE')
  updateCommerceSlug(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateCommerceSlugDto
  ) {
    return this.settingsService.updateCommerceSlug(user.id, dto.slug);
  }

  @Get('freelancer/check-slug')
  @RequirePermission('settings:view')
  @RequireCapability('HAS_PROFESSIONAL_PROFILE')
  checkFreelancerSlug(
    @CurrentUser() user: { id: string },
    @Query('slug') slug: string
  ) {
    if (!slug || slug.length < 3) {
      return {
        available: false,
        canChange: true,
        daysLeft: 0,
        nextChangeAt: null,
      };
    }
    return this.settingsService.checkFreelancerSlugAvailability(user.id, slug);
  }

  @Patch('freelancer/slug')
  @RequirePermission('settings:edit')
  @RequireCapability('HAS_PROFESSIONAL_PROFILE')
  updateFreelancerSlug(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateFreelancerSlugDto
  ) {
    return this.settingsService.updateFreelancerSlug(user.id, dto.slug);
  }

  // Simétrico a 'commerce' (HAS_COMMERCE): bio + redes del perfil público
  // profesional (/pro/:slug) — ver SettingsService.updateFreelancerProfile.
  @Patch('freelancer/profile')
  @RequirePermission('settings:edit')
  @RequireCapability('HAS_PROFESSIONAL_PROFILE')
  updateFreelancerProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateFreelancerProfileDto
  ) {
    return this.settingsService.updateFreelancerProfile(user.id, dto);
  }

  @Patch('operations')
  @RequirePermission('settings:edit')
  @RequireCapability('HAS_COMMERCE')
  updateOperationSettings(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateOperationSettingsDto
  ) {
    return this.settingsService.updateOperationSettings(user.id, dto);
  }

  @Patch('price-guard')
  @RequirePermission('settings:edit')
  @RequireCapability('HAS_COMMERCE')
  updatePriceGuardSettings(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdatePriceGuardSettingsDto
  ) {
    return this.settingsService.updatePriceGuardSettings(user.id, dto);
  }

  @Patch('notifications')
  @RequirePermission('settings:edit')
  updateNotificationSettings(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateNotificationSettingsDto
  ) {
    return this.settingsService.updateNotificationSettings(user.id, dto);
  }

  @Get('modules')
  @RequirePermission('settings:view')
  getModuleSettings(@CurrentUser() user: { id: string }) {
    return this.settingsService.getModuleSettings(user.id);
  }

  @Patch('modules')
  @RequirePermission('settings:edit')
  updateModuleSettings(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateModuleSettingsDto
  ) {
    return this.settingsService.updateModuleSettings(user.id, dto);
  }
}
