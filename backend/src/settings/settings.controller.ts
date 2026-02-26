import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common'
import { SettingsService } from './settings.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import {
  UpdateRestaurantInfoDto,
  UpdatePaymentSettingsDto,
  UpdateOperationSettingsDto,
  UpdateNotificationSettingsDto,
} from './dto/update-settings.dto'

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings(@CurrentUser() user: { id: string }) {
    return this.settingsService.getSettings(user.id)
  }

  @Patch('restaurant')
  updateRestaurantInfo(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateRestaurantInfoDto,
  ) {
    return this.settingsService.updateRestaurantInfo(user.id, dto)
  }

  @Patch('payment')
  updatePaymentSettings(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdatePaymentSettingsDto,
  ) {
    return this.settingsService.updatePaymentSettings(user.id, dto)
  }

  @Patch('operations')
  updateOperationSettings(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateOperationSettingsDto,
  ) {
    return this.settingsService.updateOperationSettings(user.id, dto)
  }

  @Patch('notifications')
  updateNotificationSettings(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.settingsService.updateNotificationSettings(user.id, dto)
  }
}
