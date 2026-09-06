import { Module } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { ExchangeRatesModule } from '../../money/exchange-rates/exchange-rates.module';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';
import { AlertEngineModule } from '../alert-engine/alert-engine.module';

@Module({
  imports: [ExchangeRatesModule, NotificationsModule, AlertEngineModule],
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
