import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

// All modules that exist in the system (match Permission.module values in seed)
export const ALL_MODULES = [
  'dashboard',
  'menu',
  'inventory',
  'orders',
  'customers',
  'appointments',
  'delivery',
  'expenses',
  'analytics',
  'reports',
  'sales',
  'employees',
  'branches',
  'settings',
  'notifications',
  'services',
  'service_requests',
  'catalog',
  'corridas',
  'wallets',
] as const;

export type AppModule = (typeof ALL_MODULES)[number];

export interface PlanLimits {
  maxProducts: number;
  maxEmployees: number;
  maxBranches: number;
  maxOrders: number; // per month, -1 = unlimited
  maxStorage: number;
  enabledModules: string[]; // modules included in the plan
  effectiveModules: string[]; // plan ∩ category (what the user actually sees)
  planName: string;
  categoryName: string | null;
}

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
export class PlanLimitsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Core: plan limits + effective modules ──────────────────────────────────

  async getPlanLimits(userId: string): Promise<PlanLimits> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, categoryId: true },
    });

    // ADMIN/SUPERADMIN/NORMAL: unrestricted
    if (
      user?.role === Role.SUPERADMIN ||
      user?.role === Role.ADMIN ||
      user?.role === Role.NORMAL
    ) {
      return UNLIMITED_LIMITS;
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
    const effectiveModules = await this.intersectWithCategory(
      planModules,
      user?.categoryId ?? null
    );

    return {
      ...planLimitsBase,
      effectiveModules,
      categoryName:
        effectiveModules !== planModules
          ? ((
              await this.prisma.userCategory.findUnique({
                where: { id: user!.categoryId! },
                select: { name: true },
              })
            )?.name ?? null)
          : null,
    };
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
