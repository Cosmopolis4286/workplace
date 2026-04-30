import { Module } from '@nestjs/common';
import { ExchangeRatesController } from './exchange-rates.controller';
import { ExchangeRatesService } from './exchange-rates.service';
import { BcvSyncService } from './bcv-sync.service';
import { BcvSyncCron } from './bcv-sync.cron';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [ExchangeRatesController],
  providers: [ExchangeRatesService, BcvSyncService, BcvSyncCron],
  exports: [ExchangeRatesService, BcvSyncService],
})
export class ExchangeRatesModule {}
