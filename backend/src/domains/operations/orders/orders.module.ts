import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ORDERS_FACADE } from './orders.facade';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';
import { PlansModule } from '../../money/plans/plans.module';
import { TelegramModule } from '../../engagement/telegram/telegram.module';
import { ReputationModule } from '../../reputation/reputation.module';
import { ReceiptsModule } from '../receipts/receipts.module';
import { CashModule } from '../cash/cash.module';

@Module({
  imports: [
    NotificationsModule,
    PlansModule,
    TelegramModule,
    ReputationModule,
    ReceiptsModule,
    CashModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    { provide: ORDERS_FACADE, useExisting: OrdersService },
  ],
  exports: [OrdersService, ORDERS_FACADE],
})
export class OrdersModule {}
