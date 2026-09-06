import { Module } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { ExchangeRatesModule } from '../../money/exchange-rates/exchange-rates.module';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';
import { AlertEngineModule } from '../alert-engine/alert-engine.module';

@Module({
  imports: [ExchangeRatesModule, NotificationsModule, AlertEngineModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
