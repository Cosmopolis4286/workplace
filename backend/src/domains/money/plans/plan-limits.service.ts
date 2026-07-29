import { Inject, Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Role } from '@prisma/client';
import { SystemModulesFacade, SYSTEM_MODULES_FACADE } from '../../platform/system-modules/system-modules.facade';
import { MODULE_CATALOG } from '../../../common/data/module-catalog.data';
import { PlanLimitsFacade, PlanLimits } from './plan-limits.facade';

// Módulos de NEGOCIO (con plan/categoría propia) — subset de MODULE_CATALOG.
// Los módulos "de sistema" (users, permissions, audit, etc.) viven en el
// catálogo pero no participan de plan∩categoría, así que se excluyen aquí.
const BUSINESS_MODULE_KEYS = [
  'dashboard', 'menu', 'inventory', 'orders', 'customers', 'appointments',
  'delivery', 'expenses', 'analytics', 'reports', 'sales', 'employees',
  'branches', 'settings', 'notifications', 'services', 'service_requests',
  'jobs', 'catalog', 'corridas', 'wallets',
] as const;

export const ALL_MODULES = MODULE_CATALOG
  .filter((m) => (BUSINESS_MODULE_KEYS as readonly string[]).includes(m.key))
  .map((m) => m.key) as (typeof BUSINESS_MODULE_KEYS)[number][];

export type AppModule = (typeof ALL_MODULES)[number];
export type { PlanLimits };

const UNLIMITED_LIMITS: PlanLimits = {
  maxProducts: -1,
  maxEmployees: -1,
  maxBranches: -1,
  maxOrders: -1,
  maxStorage: -1,
  enabledModules: [...ALL_MODULES],
  effectiveModules: [...ALL_MODULES],
  planName: 'Sin límite',
  categoryName: null,
};

// Free-tier fallback when no active subscription exists
const FREE_MODULES = [
  'dashboard',
  'menu',
  'orders',
  'customers',
  'settings',
  'notifications',
];
const FREE_LIMITS: PlanLimits = {
  maxProducts: 10,
  maxEmployees: 1,
  maxBranches: 1,
  maxOrders: 30,
  maxStorage: 0,
  enabledModules: FREE_MODULES,
  effectiveModules: FREE_MODULES,
  planName: 'Sin plan',
  categoryName: null,
};

@Injectable()
export class PlanLimitsService implements PlanLimitsFacade {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SYSTEM_MODULES_FACADE) private readonly systemModulesService: SystemModulesFacade
  ) {}

  // ─── Core: plan limits + effective modules ──────────────────────────────────

  async getPlanLimits(userId: string): Promise<PlanLimits> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, categoryId: true },
    });

    // Global kill-switch applies to EVERYONE, including SUPERADMIN — it's a
    // maintenance/feature-flag layer, not an RBAC concern.
    const globallyDisabled = await this.systemModulesService.getDisabledModules();

    // ADMIN/SUPERADMIN/NORMAL: unrestricted by plan/category
    if (
      user?.role === Role.SUPERADMIN ||
      user?.role === Role.ADMIN ||
      user?.role === Role.NORMAL
    ) {
      return {
        ...UNLIMITED_LIMITS,
        effectiveModules: UNLIMITED_LIMITS.effectiveModules.filter(
          (m) => !globallyDisabled.includes(m)
        ),
      };
    }

    // Get active subscription
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'TRIAL'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    const planModules = sub?.plan.enabledModules ?? FREE_MODULES;
    const planLimitsBase = sub
      ? {
          maxProducts: sub.plan.maxProducts,
          maxEmployees: sub.plan.maxEmployees,
          maxBranches: sub.plan.maxBranches,
          maxOrders: sub.plan.maxOrders,
          maxStorage: sub.plan.maxStorage,
          enabledModules: sub.plan.enabledModules,
          planName: sub.plan.name,
        }
      : {
          maxProducts: FREE_LIMITS.maxProducts,
          maxEmployees: FREE_LIMITS.maxEmployees,
          maxBranches: FREE_LIMITS.maxBranches,
          maxOrders: FREE_LIMITS.maxOrders,
          maxStorage: FREE_LIMITS.maxStorage,
          enabledModules: FREE_MODULES,
          planName: FREE_LIMITS.planName,
        };

    // Intersect with category allowed modules
    const categoryFiltered = await this.intersectWithCategory(
      planModules,
      user?.categoryId ?? null
    );

    // Intersect with the commerce's own self-service opt-outs
    const restaurantFiltered = await this.intersectWithRestaurantPreference(
      categoryFiltered,
      userId
    );

    // Finally, the global kill-switch — overrides everything above
    const effectiveModules = restaurantFiltered.filter(
      (m) => !globallyDisabled.includes(m)
    );

    return {
      ...planLimitsBase,
      effectiveModules,
      categoryName:
        categoryFiltered !== planModules
          ? ((
              await this.prisma.userCategory.findUnique({
                where: { id: user!.categoryId! },
                select: { name: true },
              })
            )?.name ?? null)
          : null,
    };
  }

  /**
   * Modules the commerce's plan + category grant, after the global kill-switch
   * but BEFORE the commerce's own self-service opt-outs — i.e. the full set of
   * checkboxes available to toggle in the self-service modules page.
   */
  async getSelectableModules(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, categoryId: true },
    });
    const globallyDisabled = await this.systemModulesService.getDisabledModules();

    if (
      user?.role === Role.SUPERADMIN ||
      user?.role === Role.ADMIN ||
      user?.role === Role.NORMAL
    ) {
      return UNLIMITED_LIMITS.effectiveModules.filter((m) => !globallyDisabled.includes(m));
    }

    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'TRIAL'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    const planModules = sub?.plan.enabledModules ?? FREE_MODULES;
    const categoryFiltered = await this.intersectWithCategory(planModules, user?.categoryId ?? null);
    return categoryFiltered.filter((m) => !globallyDisabled.includes(m));
  }

  // Returns plan.enabledModules ∩ category.allowedModules
  // If user has no category, returns plan modules unchanged (no restriction)
  private async intersectWithCategory(
    planModules: string[],
    categoryId: string | null
  ): Promise<string[]> {
    if (!categoryId) return planModules;

    const category = await this.prisma.userCategory.findUnique({
      where: { id: categoryId },
      select: { allowedModules: true },
    });

    // If category has no allowedModules defined, no restriction
    if (!category || category.allowedModules.length === 0) return planModules;

    return planModules.filter((m) => category.allowedModules.includes(m));
  }

  // Removes modules the commerce itself chose to hide from its own sidebar.
  // Self-service only restricts further — it can never grant access beyond
  // what the plan/category already allow.
  private async intersectWithRestaurantPreference(
    modules: string[],
    userId: string
  ): Promise<string[]> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
      select: { settings: { select: { disabledModules: true } } },
    });
    const disabled = restaurant?.settings?.disabledModules ?? [];
    if (disabled.length === 0) return modules;
    return modules.filter((m) => !disabled.includes(m));
  }

  // ─── Module access ──────────────────────────────────────────────────────────

  hasModule(limits: PlanLimits, module: string): boolean {
    return limits.effectiveModules.includes(module);
  }

  async assertModuleAccess(userId: string, module: string) {
    const limits = await this.getPlanLimits(userId);
    if (!this.hasModule(limits, module)) {
      const inPlan = limits.enabledModules.includes(module);
      if (!inPlan) {
        throw new ForbiddenException(
          `El módulo "${module}" no está incluido en tu plan "${limits.planName}". Actualiza tu plan para acceder.`
        );
      } else {
        throw new ForbiddenException(
          `El módulo "${module}" no está disponible para tu categoría de negocio "${limits.categoryName}".`
        );
      }
    }
  }

  // ─── Resource limits ────────────────────────────────────────────────────────

  async assertProductLimit(userId: string, commerceId: string) {
    const limits = await this.getPlanLimits(userId);
    if (limits.maxProducts === -1) return;
    const count = await this.prisma.product.count({ where: { commerceId } });
    if (count >= limits.maxProducts) {
      throw new ForbiddenException(
        `Has alcanzado el límite de ${limits.maxProducts} productos de tu plan "${limits.planName}". Actualiza tu plan para agregar más.`
      );
    }
  }

  async assertEmployeeLimit(userId: string, commerceId: string) {
    const limits = await this.getPlanLimits(userId);
    if (limits.maxEmployees === -1) return;
    if (limits.maxEmployees === 0) {
      throw new ForbiddenException(
        `Tu plan "${limits.planName}" no incluye gestión de empleados.`
      );
    }
    const count = await this.prisma.employee.count({ where: { commerceId } });
    if (count >= limits.maxEmployees) {
      throw new ForbiddenException(
        `Has alcanzado el límite de ${limits.maxEmployees} empleados de tu plan "${limits.planName}". Actualiza tu plan para agregar más.`
      );
    }
  }

  async assertBranchLimit(userId: string, commerceId: string) {
    const limits = await this.getPlanLimits(userId);
    if (limits.maxBranches === -1) return;
    if (limits.maxBranches === 0) {
      throw new ForbiddenException(
        `Tu plan "${limits.planName}" no incluye gestión de sucursales.`
      );
    }
    const count = await this.prisma.branch.count({ where: { commerceId } });
    if (count >= limits.maxBranches) {
      throw new ForbiddenException(
        `Has alcanzado el límite de ${limits.maxBranches} sucursales de tu plan "${limits.planName}". Actualiza tu plan para agregar más.`
      );
    }
  }

  async assertOrderLimit(userId: string, commerceId: string) {
    const limits = await this.getPlanLimits(userId);
    if (limits.maxOrders === -1) return;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const count = await this.prisma.order.count({
      where: { commerceId, createdAt: { gte: startOfMonth } },
    });
    if (count >= limits.maxOrders) {
      throw new ForbiddenException(
        `Has alcanzado el límite de ${limits.maxOrders} pedidos mensuales de tu plan "${limits.planName}". Actualiza tu plan para continuar.`
      );
    }
  }

  // ─── Usage for frontend ─────────────────────────────────────────────────────

  async getUsage(userId: string, commerceId: string) {
    const limits = await this.getPlanLimits(userId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [products, employees, branches, ordersThisMonth] = await Promise.all([
      this.prisma.product.count({ where: { commerceId } }),
      this.prisma.employee.count({ where: { commerceId } }),
      this.prisma.branch.count({ where: { commerceId } }),
      this.prisma.order.count({
        where: { commerceId, createdAt: { gte: startOfMonth } },
      }),
    ]);

    return {
      limits,
      usage: { products, employees, branches, ordersThisMonth },
    };
  }
}
