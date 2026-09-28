import { Inject, Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULE_KEY } from '../decorators/require-module.decorator';
import { PLAN_LIMITS_FACADE, PlanLimitsFacade } from '../../domains/money/plans/plan-limits.facade';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(PLAN_LIMITS_FACADE) private planLimits: PlanLimitsFacade,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const module = this.reflector.getAllAndOverride<string>(MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @RequireModule() → skip this guard
    if (!module) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    // SUPERADMIN/ADMIN/NORMAL: sin restricción de plan/categoría — mismo
    // bypass que ya aplica PlanLimitsService.getPlanLimits() internamente.
    if (user.role === 'SUPERADMIN' || user.role === 'ADMIN' || user.role === 'NORMAL') return true;

    // Lanza ForbiddenException con el motivo real (plan vs categoría) si
    // effectiveModules (plan ∩ categoría) no incluye el módulo — mismo
    // cálculo que alimenta el sidebar, así el request real nunca contradice
    // lo que el usuario ve como disponible.
    await this.planLimits.assertModuleAccess(user.id, module);
    return true;
  }
}
