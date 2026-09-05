import { Module } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { ExchangeRatesModule } from '../../money/exchange-rates/exchange-rates.module';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';

@Module({
  imports: [ExchangeRatesModule, NotificationsModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
