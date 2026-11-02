import { Inject, Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  Role,
  ServiceStatus,
  JobStatus,
  SellerStatementStatus,
} from '@prisma/client';
import {
  SystemModulesFacade,
  SYSTEM_MODULES_FACADE,
} from '../../platform/system-modules/system-modules.facade';
import { PlanLimitsFacade, PlanLimits } from './plan-limits.facade';
import { CapabilitiesService } from '../../../common/capabilities/capabilities.service';

// AppModule ya no es un union type cerrado — el catálogo de módulos de
// negocio ahora es dinámico (tabla SystemModule, isBusinessModule=true),
// gerenciable por un admin sin tocar código. Ver SystemModulesService.
export type AppModule = string;
export type { PlanLimits };

const UNLIMITED_LIMITS_BASE = {
  maxProducts: -1,
  maxEmployees: -1,
  maxBranches: -1,
  maxOrders: -1,
  maxStorage: -1,
  maxServices: -1,
  maxServiceRequests: -1,
  maxJobs: -1,
  planName: 'Sin límite',
  categoryName: null as string | null,
};

// Free-tier fallback when no active subscription exists
const FREE_MODULES = [
  'dashboard',
  'menu',
  'orders',
  'customers',
  'settings',
  'notifications',
  // Un freelancer sin plan sigue necesitando poder operar su negocio básico:
  // publicar servicios, recibir solicitudes y ver su billetera. Los límites
  // reales del tier gratuito (cantidad de servicios/solicitudes) se aplican
  // aparte vía assertServiceLimit/assertServiceRequestLimit, no ocultando el módulo.
  'services',
  'service_requests',
  'wallets',
];
// "Techo" mínimo de un FREELANCER/SERVICE_PROVIDER, sin importar qué
// UserCategory eligió — la categoría describe QUÉ vende (comida, diseño,
// plomería...), no CÓMO opera (con o sin Commerce físico). Categorías como
// "Comida"/"Comercio" tienen un allowedModules pensado 100% para comercio
// físico (menu/inventory/orders), porque nacieron asumiendo que todo usuario
// ahí es COMMERCE — pero un freelancer que vende comida a domicilio sin
// local también puede elegir esa categoría (ver seed.js, comidarapida@demo.com).
// Sin esto, ese caso quedaba con un sidebar vacío de "services" aunque su
// plan sí lo incluyera, porque intersectWithCategory() nunca se lo otorgaba.
// Unión (no reemplazo) con category.allowedModules: un COMMERCE en la misma
// categoría no gana nada nuevo, solo se amplía el techo para quien no tiene
// Commerce.
// "appointments" NO va acá a propósito, aunque suene a "cita de servicio
// profesional": el modelo Appointment real es reserva de MESA de restaurante
// (tableNumber/partySize, commerceId obligatorio) — un FREELANCER nunca
// puede usarlo (permiso exclusivo del perfil BUSINESS). La agenda de un FREELANCER vive
// en ServiceRequest.preferredDate, no en este módulo.
const SERVICE_PROVIDER_BASE_MODULES = ['services', 'service_requests', 'jobs'];

const FREE_LIMITS: PlanLimits = {
  maxProducts: 10,
  maxEmployees: 1,
  maxBranches: 1,
  maxOrders: 30,
  maxStorage: 0,
  maxServices: 3,
  maxServiceRequests: -1,
  maxJobs: 3,
  enabledModules: FREE_MODULES,
  effectiveModules: FREE_MODULES,
  planName: 'Sin plan',
  categoryName: null,
};

@Injectable()
export class PlanLimitsService implements PlanLimitsFacade {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SYSTEM_MODULES_FACADE)
    private readonly systemModulesService: SystemModulesFacade,
    private readonly capabilities: CapabilitiesService
  ) {}

  // ─── Core: plan limits + effective modules ──────────────────────────────────

  async getPlanLimits(userId: string): Promise<PlanLimits> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, categoryId: true },
    });

    // Global kill-switch applies to EVERYONE, including SUPERADMIN — it's a
    // maintenance/feature-flag layer, not an RBAC concern.
    const globallyDisabled =
      await this.systemModulesService.getDisabledModules();

    // ADMIN/SUPERADMIN/NORMAL: unrestricted by plan/category
    if (
      user?.role === Role.SUPERADMIN ||
      user?.role === Role.ADMIN ||
      user?.role === Role.NORMAL
    ) {
      const allModules = await this.systemModulesService.listBusinessModules();
      return {
        ...UNLIMITED_LIMITS_BASE,
        enabledModules: allModules,
        effectiveModules: allModules.filter(
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
          maxServices: sub.plan.maxServices,
          maxServiceRequests: sub.plan.maxServiceRequests,
          maxJobs: sub.plan.maxJobs,
          enabledModules: sub.plan.enabledModules,
          planName: sub.plan.name,
        }
      : {
          maxProducts: FREE_LIMITS.maxProducts,
          maxEmployees: FREE_LIMITS.maxEmployees,
          maxBranches: FREE_LIMITS.maxBranches,
          maxOrders: FREE_LIMITS.maxOrders,
          maxStorage: FREE_LIMITS.maxStorage,
          maxServices: FREE_LIMITS.maxServices,
          maxServiceRequests: FREE_LIMITS.maxServiceRequests,
          maxJobs: FREE_LIMITS.maxJobs,
          enabledModules: FREE_MODULES,
          planName: FREE_LIMITS.planName,
        };

    // Intersect with category allowed modules
    const categoryFiltered = await this.intersectWithCategory(
      planModules,
      user?.categoryId ?? null,
      userId
    );

    // Intersect with the commerce's own self-service opt-outs
    const commercePreferenceFiltered =
      await this.intersectWithCommercePreference(categoryFiltered, userId);

    // Finally, the global kill-switch — overrides everything above
    const effectiveModules = commercePreferenceFiltered.filter(
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
    const globallyDisabled =
      await this.systemModulesService.getDisabledModules();

    if (
      user?.role === Role.SUPERADMIN ||
      user?.role === Role.ADMIN ||
      user?.role === Role.NORMAL
    ) {
      const allModules = await this.systemModulesService.listBusinessModules();
      return allModules.filter((m) => !globallyDisabled.includes(m));
    }

    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'TRIAL'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    const planModules = sub?.plan.enabledModules ?? FREE_MODULES;
    const categoryFiltered = await this.intersectWithCategory(
      planModules,
      user?.categoryId ?? null,
      userId
    );
    return categoryFiltered.filter((m) => !globallyDisabled.includes(m));
  }

  // plan.enabledModules ∩ category.allowedModules — el techo de RUBRO/PLAN,
  // nada más. El PAPEL (comercio vs. profesional) ya no se filtra acá: lo
  // decide la matriz de permisos (employees:*, cash:*... solo los concede el
  // perfil BUSINESS), y NavigationService/ModuleAccessGuard combinan ambas
  // capas. Antes se restaba MODULE_ACCOUNT_TYPE cuando accountType ===
  // 'FREELANCER': una tercera fuente de "quién es comercio" que además
  // listaba claves inexistentes en system_modules.
  //
  // Único ajuste por perfil: quien tiene un perfil PROFESSIONAL ACTIVE suma
  // el techo de servicios (SERVICE_PROVIDER_BASE_MODULES) aunque su
  // categoría no lo traiga. Se evalúa por perfil (CapabilitiesService), no
  // por accountType colapsado: un usuario BUSINESS + PROFESSIONAL también lo
  // recibe (antes BUSINESS "ganaba" y lo perdía).
  private async intersectWithCategory(
    planModules: string[],
    categoryId: string | null,
    userId: string
  ): Promise<string[]> {
    if (!categoryId) return planModules;

    const category = await this.prisma.userCategory.findUnique({
      where: { id: categoryId },
      select: { allowedModules: true },
    });

    // Categoría sin allowedModules definidos: no restringe nada.
    if (!category || category.allowedModules.length === 0) return planModules;

    let categoryModules = category.allowedModules;
    if (await this.capabilities.has(userId, 'HAS_PROFESSIONAL_PROFILE')) {
      categoryModules = [
        ...new Set([...categoryModules, ...SERVICE_PROVIDER_BASE_MODULES]),
      ];
    }

    return planModules.filter((m) => categoryModules.includes(m));
  }

  // Removes modules the commerce itself chose to hide from its own sidebar.
  // Self-service only restricts further — it can never grant access beyond
  // what the plan/category already allow.
  private async intersectWithCommercePreference(
    modules: string[],
    userId: string
  ): Promise<string[]> {
    const commerce = await this.prisma.commerce.findUnique({
      where: { userId },
      select: { settings: { select: { disabledModules: true } } },
    });
    const disabled = commerce?.settings?.disabledModules ?? [];
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

  // Estado de cuenta vencido (OVERDUE) o suspendido: no puede publicar ni
  // activar nada nuevo hasta pagar (ver SellerBillingService). Va en los
  // mismos puntos que ya controlan "¿puede publicar más?": servicios y productos.
  private async assertNoOverdueStatement(userId: string) {
    const overdue = await this.prisma.sellerStatement.count({
      where: {
        sellerUserId: userId,
        status: {
          in: [SellerStatementStatus.OVERDUE, SellerStatementStatus.SUSPENDED],
        },
      },
    });
    if (overdue > 0) {
      throw new ForbiddenException(
        'Tienes un estado de cuenta vencido. Págalo en "Estado de cuenta" para volver a publicar.'
      );
    }
  }

  async assertProductLimit(userId: string, commerceId: string) {
    await this.assertNoOverdueStatement(userId);
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

  // Sin una cuenta de cobro activa el cliente no tiene dónde pagar (pago
  // directo) ni el proveedor dónde recibir lo liberado de una garantía.
  private async assertHasCollectionAccount(userId: string) {
    const accounts = await this.prisma.sellerPaymentAccount.count({
      where: { userId, isActive: true },
    });
    if (accounts === 0) {
      throw new ForbiddenException(
        'Agrega una cuenta de cobro (pago móvil, transferencia o Zelle) en Configuración antes de publicar servicios: es donde te pagan tus clientes.'
      );
    }
  }

  async assertServiceLimit(userId: string) {
    await this.assertNoOverdueStatement(userId);
    await this.assertHasCollectionAccount(userId);
    const limits = await this.getPlanLimits(userId);
    if (limits.maxServices === -1) return;
    const count = await this.prisma.service.count({
      where: { userId, status: ServiceStatus.ACTIVE },
    });
    if (count >= limits.maxServices) {
      throw new ForbiddenException(
        `Has alcanzado el límite de ${limits.maxServices} servicios activos de tu plan "${limits.planName}". Actualiza tu plan para agregar más.`
      );
    }
  }

  async assertJobLimit(userId: string) {
    const limits = await this.getPlanLimits(userId);
    if (limits.maxJobs === -1) return;
    const count = await this.prisma.job.count({
      where: { employerId: userId, status: JobStatus.ACTIVE },
    });
    if (count >= limits.maxJobs) {
      throw new ForbiddenException(
        `Has alcanzado el límite de ${limits.maxJobs} empleos activos de tu plan "${limits.planName}". Actualiza tu plan para publicar más.`
      );
    }
  }

  async assertServiceRequestLimit(providerId: string) {
    const limits = await this.getPlanLimits(providerId);
    if (limits.maxServiceRequests === -1) return;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const count = await this.prisma.serviceRequest.count({
      where: { providerId, createdAt: { gte: startOfMonth } },
    });
    if (count >= limits.maxServiceRequests) {
      throw new ForbiddenException(
        `Has alcanzado el límite de ${limits.maxServiceRequests} solicitudes mensuales de tu plan "${limits.planName}". Actualiza tu plan para continuar.`
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
