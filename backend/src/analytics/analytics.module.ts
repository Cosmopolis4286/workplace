import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { CommerceAnalyticsStrategy } from './strategies/commerce-analytics.strategy';
import { FreelancerAnalyticsStrategy } from './strategies/freelancer-analytics.strategy';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, CommerceAnalyticsStrategy, FreelancerAnalyticsStrategy],
})
export class AnalyticsModule {}
