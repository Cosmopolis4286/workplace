import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';

function notifScope(user: any) {
  return user?.commerce?.id
    ? { commerceId: user.commerce.id }
    : { userId: user?.sub ?? user?.id };
}

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query() query: { unread?: string; page?: string; limit?: string }
  ) {
    return this.notificationsService.findAll(notifScope(user), query);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: any) {
    return this.notificationsService.getUnreadCount(notifScope(user));
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(notifScope(user));
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.markAsRead(id, notifScope(user));
  }

  @Delete('clear-all')
  clearAll(@CurrentUser() user: any) {
    return this.notificationsService.clearAll(notifScope(user));
  }

  @Post('device-token')
  registerDeviceToken(
    @CurrentUser() user: any,
    @Body() dto: RegisterDeviceTokenDto
  ) {
    return this.notificationsService.registerDeviceToken(user.id, dto);
  }

  @Delete('device-token')
  removeDeviceToken(
    @CurrentUser() user: any,
    @Body() dto: { token: string }
  ) {
    return this.notificationsService.removeDeviceToken(user.id, dto.token);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.remove(id, notifScope(user));
  }
}
