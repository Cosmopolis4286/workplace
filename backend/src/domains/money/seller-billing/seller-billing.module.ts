import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { PaymentsModule } from '../payments/payments.module';
import { SellerBillingController } from './seller-billing.controller';
import { SellerBillingCron } from './seller-billing.cron';
import { SellerBillingService } from './seller-billing.service';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    ExchangeRatesModule,
    PaymentsModule,
  ],
  controllers: [SellerBillingController],
  providers: [SellerBillingService, SellerBillingCron],
  exports: [SellerBillingService],
})
export class SellerBillingModule {}
