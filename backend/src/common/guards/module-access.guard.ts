import { Inject, Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULE_KEY } from '../decorators/require-module.decorator';
import { PLAN_LIMITS_FACADE, PlanLimitsFacade } from '../../domains/money/plans/plan-limits.facade';
import { CapabilitiesService } from '../capabilities/capabilities.service';
import { isCommerceBoundModule } from '../capabilities/module-requirements';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(PLAN_LIMITS_FACADE) private planLimits: PlanLimitsFacade,
    private capabilities: CapabilitiesService,
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

    // Módulos cuyos datos tienen FK a Commerce: sin Commerce no hay sobre qué
    // operar. Antes el service caía a `userId` como commerceId (listas
    // vacías, 400 por FK al escribir) — ver module-requirements.ts.
    if (isCommerceBoundModule(module) && !(await this.capabilities.has(user.id, 'HAS_COMMERCE'))) {
      throw new ForbiddenException('Esta función requiere un comercio activo en tu cuenta');
    }
    return true;
  }
}
