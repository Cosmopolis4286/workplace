import { Module } from '@nestjs/common';
import { ExchangeRatesController } from './exchange-rates.controller';
import { ExchangeRatesService } from './exchange-rates.service';
import { BcvSyncService } from './bcv-sync.service';
import { BcvSyncCron } from './bcv-sync.cron';
import { EXCHANGE_RATES_FACADE } from './exchange-rates.facade';
import { PrismaModule } from '../../../prisma/prisma.module';
import { RedisModule } from '../../../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [ExchangeRatesController],
  providers: [
    ExchangeRatesService,
    BcvSyncService,
    BcvSyncCron,
    { provide: EXCHANGE_RATES_FACADE, useExisting: ExchangeRatesService },
  ],
  // Otros dominios (purchases, suppliers) inyectan EXCHANGE_RATES_FACADE.
  exports: [ExchangeRatesService, BcvSyncService, EXCHANGE_RATES_FACADE],
})
export class ExchangeRatesModule {}
