import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { FeaturesController } from './features.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { RedisModule } from '../../../redis/redis.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule, PrismaModule, RedisModule],
  controllers: [HealthController, FeaturesController],
})
export class HealthModule {}
