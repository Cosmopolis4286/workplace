import { Module } from '@nestjs/common'
import { PlansController } from './plans.controller'
import { PlansService } from './plans.service'
import { PlanLimitsService } from './plan-limits.service'

@Module({
  controllers: [PlansController],
  providers: [PlansService, PlanLimitsService],
  exports: [PlansService, PlanLimitsService],
})
export class PlansModule {}
