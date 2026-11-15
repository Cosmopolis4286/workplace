import { Module } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { ExchangeRatesModule } from '../../money/exchange-rates/exchange-rates.module';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';
import { AlertEngineModule } from '../alert-engine/alert-engine.module';
import { PlansModule } from '../../money/plans/plans.module';

@Module({
  imports: [
    ExchangeRatesModule,
    NotificationsModule,
    AlertEngineModule,
    PlansModule,
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
