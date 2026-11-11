import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { UsageCreditsController } from './usage-credits.controller';
import { UsageCreditsService } from './usage-credits.service';
import { UsageCreditsCron } from './usage-credits.cron';
import { USAGE_CREDITS_FACADE } from './usage-credits.facade';

@Module({
  imports: [PrismaModule, NotificationsModule, ExchangeRatesModule],
  controllers: [UsageCreditsController],
  providers: [
    UsageCreditsService,
    UsageCreditsCron,
    { provide: USAGE_CREDITS_FACADE, useExisting: UsageCreditsService },
  ],
  exports: [USAGE_CREDITS_FACADE],
})
export class UsageCreditsModule {}
