import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { PlanLimitsService } from './plan-limits.service';
import { PLAN_LIMITS_FACADE } from './plan-limits.facade';
import { SubscriptionsScheduler } from './subscriptions.scheduler';

@Module({
  controllers: [PlansController],
  providers: [
    PlansService,
    PlanLimitsService,
    { provide: PLAN_LIMITS_FACADE, useExisting: PlanLimitsService },
    SubscriptionsScheduler,
  ],
  // PlanLimitsService se sigue exportando (plans.controller.ts es intra-módulo
  // y usa métodos de administración fuera del contrato de la facade). Los
  // consumidores de OTROS dominios deben inyectar PLAN_LIMITS_FACADE, no
  // PlanLimitsService directo — ver Fase 4 del refactor arquitectónico.
  exports: [PlansService, PlanLimitsService, PLAN_LIMITS_FACADE],
})
export class PlansModule {}
