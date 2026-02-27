import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { NotificationsService } from './notifications.service'

// The full user object from JwtStrategy has shape: { ...user, restaurant: { id, ... } }
function restaurantId(user: any): string {
  return user?.restaurant?.id
}

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query() query: { unread?: string; page?: string; limit?: string },
  ) {
    return this.notificationsService.findAll(restaurantId(user), query)
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: any) {
    return this.notificationsService.getUnreadCount(restaurantId(user))
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(restaurantId(user))
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.markAsRead(id, restaurantId(user))
  }

  @Delete('clear-all')
  clearAll(@CurrentUser() user: any) {
    return this.notificationsService.clearAll(restaurantId(user))
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.remove(id, restaurantId(user))
  }
}
