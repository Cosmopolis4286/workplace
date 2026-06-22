import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlansModule } from '../plans/plans.module';
import { TelegramModule } from '../telegram/telegram.module';
import { PlatformFeesModule } from '../platform-fees/platform-fees.module';

@Module({
  imports: [NotificationsModule, PlansModule, TelegramModule, PlatformFeesModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
