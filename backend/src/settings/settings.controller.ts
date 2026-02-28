import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common'
import { SettingsService } from './settings.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import {
  UpdateRestaurantInfoDto,
  UpdatePaymentSettingsDto,
  UpdateOperationSettingsDto,
  UpdateNotificationSettingsDto,
} from './dto/update-settings.dto'

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermission('settings:view')
  getSettings(@CurrentUser() user: { id: string }) {
    return this.settingsService.getSettings(user.id)
  }

  @Patch('restaurant')
  @RequirePermission('settings:edit')
  updateRestaurantInfo(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateRestaurantInfoDto,
  ) {
    return this.settingsService.updateRestaurantInfo(user.id, dto)
  }

  @Patch('payment')
  @RequirePermission('settings:edit')
  updatePaymentSettings(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdatePaymentSettingsDto,
  ) {
    return this.settingsService.updatePaymentSettings(user.id, dto)
  }

  @Patch('operations')
  @RequirePermission('settings:edit')
  updateOperationSettings(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateOperationSettingsDto,
  ) {
    return this.settingsService.updateOperationSettings(user.id, dto)
  }

  @Patch('notifications')
  @RequirePermission('settings:edit')
  updateNotificationSettings(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.settingsService.updateNotificationSettings(user.id, dto)
  }
}
