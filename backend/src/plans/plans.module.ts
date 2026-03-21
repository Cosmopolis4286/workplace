import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { PlanLimitsService } from './plan-limits.service';
import { SubscriptionsScheduler } from './subscriptions.scheduler';

@Module({
  controllers: [PlansController],
  providers: [PlansService, PlanLimitsService, SubscriptionsScheduler],
  exports: [PlansService, PlanLimitsService],
})
export class PlansModule {}
