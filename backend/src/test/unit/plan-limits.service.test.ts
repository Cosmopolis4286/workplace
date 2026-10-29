import { Test, TestingModule } from '@nestjs/testing';
import { PlanLimitsService } from '../../domains/money/plans/plan-limits.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SYSTEM_MODULES_FACADE } from '../../domains/platform/system-modules/system-modules.facade';
import { CapabilitiesService } from '../../common/capabilities/capabilities.service';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('PlanLimitsService', () => {
  let service: PlanLimitsService;

  const mockPrismaService = {
    user: { findUnique: jest.fn() },
    subscription: { findFirst: jest.fn() },
    userCategory: { findUnique: jest.fn() },
    commerce: { findUnique: jest.fn() },
    product: { count: jest.fn() },
    sellerStatement: { count: jest.fn().mockResolvedValue(0) },
    employee: { count: jest.fn() },
    branch: { count: jest.fn() },
    order: { count: jest.fn() },
    // AccountTypeResolver.resolve() — por defecto sin perfiles ACTIVE de
    // negocio (accountType null), los tests que necesiten FREELANCER lo
    // sobreescriben explícitamente.
    userProfile: { findMany: jest.fn().mockResolvedValue([]) },
  };

  // HAS_PROFESSIONAL_PROFILE — por defecto sin perfil PROFESSIONAL ACTIVE;
  // los tests que lo necesitan lo sobreescriben explícitamente.
  const mockCapabilities = { has: jest.fn().mockResolvedValue(false) };

  const mockSystemModulesService = {
    getDisabledModules: jest.fn().mockResolvedValue([]),
    listBusinessModules: jest
      .fn()
      .mockResolvedValue([
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
        'jobs',
        'catalog',
        'corridas',
        'wallets',
      ]),
  };

  const userId = 'user-123';
  const commerceId = 'commerce-123';

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCapabilities.has.mockResolvedValue(false);
    mockSystemModulesService.getDisabledModules.mockResolvedValue([]);
    mockSystemModulesService.listBusinessModules.mockResolvedValue([
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
      'jobs',
      'catalog',
      'corridas',
      'wallets',
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanLimitsService,
        { provide: CapabilitiesService, useValue: mockCapabilities },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SYSTEM_MODULES_FACADE, useValue: mockSystemModulesService },
      ],
    }).compile();

    service = module.get<PlanLimitsService>(PlanLimitsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPlanLimits — role bypass', () => {
    it.each([Role.SUPERADMIN, Role.ADMIN, Role.NORMAL])(
      'grants unlimited limits to %s regardless of subscription',
      async (role) => {
        mockPrismaService.user.findUnique.mockResolvedValue({
          role,
          categoryId: null,
        });

        const limits = await service.getPlanLimits(userId);

        expect(limits.maxProducts).toBe(-1);
        expect(limits.maxEmployees).toBe(-1);
        expect(limits.planName).toBe('Sin límite');
        // Nunca debe consultar suscripción para estos roles.
        expect(mockPrismaService.subscription.findFirst).not.toHaveBeenCalled();
      }
    );

    it('respects the global kill-switch even for SUPERADMIN', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: Role.SUPERADMIN,
        categoryId: null,
      });
      mockSystemModulesService.getDisabledModules.mockResolvedValue(['menu']);

      const limits = await service.getPlanLimits(userId);

      expect(limits.effectiveModules).not.toContain('menu');
    });
  });

  describe('getPlanLimits — COMMERCE with subscription', () => {
    it('uses the active plan limits when a subscription exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: Role.PROFESIONAL,
        categoryId: null,
      });
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        plan: {
          name: 'Pro',
          maxProducts: 50,
          maxEmployees: 5,
          maxBranches: 2,
          maxOrders: 500,
          maxStorage: 1000,
          enabledModules: ['dashboard', 'menu', 'orders'],
        },
      });

      const limits = await service.getPlanLimits(userId);

      expect(limits.planName).toBe('Pro');
      expect(limits.maxProducts).toBe(50);
      expect(limits.effectiveModules).toEqual(['dashboard', 'menu', 'orders']);
    });

    it('falls back to free-tier limits when there is no active subscription', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: Role.PROFESIONAL,
        categoryId: null,
      });
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);

      const limits = await service.getPlanLimits(userId);

      expect(limits.planName).toBe('Sin plan');
      expect(limits.maxProducts).toBe(10);
    });

    it('intersects plan modules with category allowed modules', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: Role.PROFESIONAL,
        categoryId: 'cat-1',
      });
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        plan: {
          name: 'Pro',
          maxProducts: 50,
          maxEmployees: 5,
          maxBranches: 2,
          maxOrders: 500,
          maxStorage: 1000,
          enabledModules: ['dashboard', 'menu', 'orders', 'delivery'],
        },
      });
      mockPrismaService.userCategory.findUnique
        .mockResolvedValueOnce({ allowedModules: ['dashboard', 'menu'] }) // intersectWithCategory
        .mockResolvedValueOnce({ name: 'Servicios' }); // categoryName lookup
      mockPrismaService.commerce.findUnique.mockResolvedValue({
        settings: null,
      });

      const limits = await service.getPlanLimits(userId);

      // La categoría restringe: solo dashboard/menu quedan, aunque el plan
      // incluya orders/delivery.
      expect(limits.effectiveModules).toEqual(['dashboard', 'menu']);
      expect(limits.categoryName).toBe('Servicios');
    });

    it('widens a "comercio" category (no services) with the service-provider base modules for a FREELANCER/SERVICE_PROVIDER user', async () => {
      // Caso real: comidarapida@demo.com — categoría "Comida" (techo 100%
      // comercio, sin services/jobs) pero el usuario es SERVICE_PROVIDER, sin
      // Commerce. Sin este ensanchado, su plan "Pro" (que sí incluye
      // services) nunca se lo otorgaba porque la categoría lo filtraba.
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: Role.PROFESIONAL,
        categoryId: 'cat-comida',
      });
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        plan: {
          name: 'Pro',
          maxProducts: 50,
          maxEmployees: 5,
          maxBranches: 2,
          maxOrders: 500,
          maxStorage: 1000,
          enabledModules: ['dashboard', 'menu', 'services', 'jobs'],
        },
      });
      mockPrismaService.userCategory.findUnique
        .mockResolvedValueOnce({ allowedModules: ['dashboard', 'menu'] }) // Comida: sin services/jobs
        .mockResolvedValueOnce({ name: 'Comida' });
      mockPrismaService.commerce.findUnique.mockResolvedValue({
        settings: null,
      });
      // Un UserProfile PROFESSIONAL ACTIVE => HAS_PROFESSIONAL_PROFILE
      mockCapabilities.has.mockResolvedValue(true);

      const limits = await service.getPlanLimits(userId);

      expect(limits.effectiveModules).toEqual(
        expect.arrayContaining(['dashboard', 'menu', 'services', 'jobs'])
      );
      expect(mockCapabilities.has).toHaveBeenCalledWith(
        userId,
        'HAS_PROFESSIONAL_PROFILE'
      );
    });

    it('does NOT widen the category for a COMMERCE user in the same category (no gana módulos extra)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: Role.PROFESIONAL,
        categoryId: 'cat-comida',
      });
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        plan: {
          name: 'Pro',
          maxProducts: 50,
          maxEmployees: 5,
          maxBranches: 2,
          maxOrders: 500,
          maxStorage: 1000,
          enabledModules: ['dashboard', 'menu', 'services', 'jobs'],
        },
      });
      mockPrismaService.userCategory.findUnique
        .mockResolvedValueOnce({ allowedModules: ['dashboard', 'menu'] })
        .mockResolvedValueOnce({ name: 'Comida' });
      mockPrismaService.commerce.findUnique.mockResolvedValue({
        settings: null,
      });
      // Solo perfil BUSINESS ACTIVE => sin HAS_PROFESSIONAL_PROFILE (default del mock)

      const limits = await service.getPlanLimits(userId);

      expect(limits.effectiveModules).toEqual(['dashboard', 'menu']);
      expect(limits.effectiveModules).not.toContain('services');
    });

    it('does not filter by papel: effectiveModules is plan ∩ category, business-only modules are gated by permissions instead', async () => {
      // Caso real: comidarapida@demo.com (PROFESSIONAL) con el plan "Pro"
      // completo en categoría "Comida". Antes se restaban employees/branches/
      // purchases/... por accountType (MODULE_ACCOUNT_TYPE). Ahora el techo de
      // rubro/plan los incluye y es la matriz de permisos la que decide: el
      // perfil PROFESSIONAL no tiene employees:*/branches:*/... (ver
      // permission-defaults.test.ts), así que ni el sidebar ni el guard los
      // habilitan. Una sola capa por pregunta.
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: Role.PROFESIONAL,
        categoryId: 'cat-comida',
      });
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        plan: {
          name: 'Pro',
          maxProducts: 50,
          maxEmployees: 5,
          maxBranches: 2,
          maxOrders: 500,
          maxStorage: 1000,
          enabledModules: [
            'dashboard',
            'menu',
            'orders',
            'delivery',
            'customers',
            'services',
            'jobs',
            'employees',
            'branches',
            'purchases',
            'suppliers',
            'accounts',
            'inventory',
          ],
        },
      });
      mockPrismaService.userCategory.findUnique
        .mockResolvedValueOnce({
          allowedModules: [
            'dashboard',
            'menu',
            'orders',
            'delivery',
            'customers',
            'employees',
            'branches',
            'purchases',
            'suppliers',
            'accounts',
            'inventory',
          ],
        })
        .mockResolvedValueOnce({ name: 'Comida' });
      mockPrismaService.commerce.findUnique.mockResolvedValue({
        settings: null,
      });
      mockCapabilities.has.mockResolvedValue(true);

      const limits = await service.getPlanLimits(userId);

      expect(limits.effectiveModules).toEqual(
        expect.arrayContaining([
          'dashboard',
          'menu',
          'orders',
          'delivery',
          'customers',
          'services',
          'jobs',
          'employees',
          'branches',
          'purchases',
          'suppliers',
          'accounts',
          'inventory',
        ])
      );
    });

    it('widens with service modules for a user with BOTH BUSINESS and PROFESSIONAL profiles (multi-perfil)', async () => {
      // Antes AccountTypeResolver colapsaba a 'COMMERCE' (BUSINESS gana) y
      // este usuario perdía services/jobs aunque tuviera el perfil
      // PROFESSIONAL activo. HAS_PROFESSIONAL_PROFILE se evalúa por perfil.
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: Role.PROFESIONAL,
        categoryId: 'cat-comida',
      });
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        plan: {
          name: 'Pro',
          maxProducts: 50,
          maxEmployees: 5,
          maxBranches: 2,
          maxOrders: 500,
          maxStorage: 1000,
          enabledModules: ['dashboard', 'menu', 'services', 'jobs'],
        },
      });
      mockPrismaService.userCategory.findUnique
        .mockResolvedValueOnce({ allowedModules: ['dashboard', 'menu'] })
        .mockResolvedValueOnce({ name: 'Comida' });
      mockPrismaService.commerce.findUnique.mockResolvedValue({
        settings: null,
      });
      mockCapabilities.has.mockResolvedValue(true);

      const limits = await service.getPlanLimits(userId);

      expect(limits.effectiveModules).toEqual(
        expect.arrayContaining(['services', 'jobs'])
      );
    });

    it('does NOT grant menu/orders to a COMMERCE user in a non-product category, even if the plan includes them', async () => {
      // Caso real: tecnologia@demo.com — COMMERCE (tiene Commerce propio) en
      // categoría "Tecnología", cuyo allowedModules NO incluye menu/orders/
      // inventory (vende software, no productos físicos). El eje correcto acá
      // es la categoría, no accountType — un COMMERCE no debe ganar menu solo
      // por tener Commerce formal si su rubro no vende producto.
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: Role.PROFESIONAL,
        categoryId: 'cat-tecnologia',
      });
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        plan: {
          name: 'Pro',
          maxProducts: 50,
          maxEmployees: 5,
          maxBranches: 2,
          maxOrders: 500,
          maxStorage: 1000,
          enabledModules: [
            'dashboard',
            'menu',
            'orders',
            'services',
            'jobs',
            'appointments',
          ],
        },
      });
      mockPrismaService.userCategory.findUnique
        .mockResolvedValueOnce({
          allowedModules: ['dashboard', 'services', 'jobs', 'appointments'],
        })
        .mockResolvedValueOnce({ name: 'Tecnología' });
      mockPrismaService.commerce.findUnique.mockResolvedValue({
        settings: null,
      });
      // Solo perfil BUSINESS ACTIVE => sin HAS_PROFESSIONAL_PROFILE (default del mock)

      const limits = await service.getPlanLimits(userId);

      expect(limits.effectiveModules).toEqual(
        expect.arrayContaining([
          'dashboard',
          'services',
          'jobs',
          'appointments',
        ])
      );
      expect(limits.effectiveModules).not.toContain('menu');
      expect(limits.effectiveModules).not.toContain('orders');
    });
  });

  describe('estado de cuenta vencido', () => {
    it('bloquea crear productos y activar servicios hasta pagar', async () => {
      mockPrismaService.sellerStatement.count.mockResolvedValueOnce(1);
      await expect(service.assertProductLimit('u1', 'c1')).rejects.toThrow(
        'estado de cuenta vencido'
      );
      mockPrismaService.sellerStatement.count.mockResolvedValueOnce(1);
      await expect(service.assertServiceLimit('u1')).rejects.toThrow(
        'estado de cuenta vencido'
      );
      expect(mockPrismaService.product.count).not.toHaveBeenCalled();
    });
  });

  describe('assertProductLimit', () => {
    it('does not throw when the plan is unlimited', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: Role.NORMAL,
        categoryId: null,
      });

      await expect(
        service.assertProductLimit(userId, commerceId)
      ).resolves.toBeUndefined();
      expect(mockPrismaService.product.count).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException once the product count reaches the plan limit', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: Role.PROFESIONAL,
        categoryId: null,
      });
      mockPrismaService.subscription.findFirst.mockResolvedValue(null); // free tier: maxProducts 10
      mockPrismaService.product.count.mockResolvedValue(10);

      await expect(
        service.assertProductLimit(userId, commerceId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows creating a product when under the limit', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: Role.PROFESIONAL,
        categoryId: null,
      });
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);
      mockPrismaService.product.count.mockResolvedValue(9);

      await expect(
        service.assertProductLimit(userId, commerceId)
      ).resolves.toBeUndefined();
    });
  });

  describe('assertEmployeeLimit', () => {
    it('throws when the plan does not include employee management (limit 0)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: Role.PROFESIONAL,
        categoryId: null,
      });
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        plan: {
          name: 'Starter',
          maxProducts: 10,
          maxEmployees: 0,
          maxBranches: 0,
          maxOrders: 30,
          maxStorage: 0,
          enabledModules: ['dashboard'],
        },
      });

      await expect(
        service.assertEmployeeLimit(userId, commerceId)
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrismaService.employee.count).not.toHaveBeenCalled();
    });
  });

  describe('assertOrderLimit', () => {
    it('only counts orders created since the start of the current month', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: Role.PROFESIONAL,
        categoryId: null,
      });
      mockPrismaService.subscription.findFirst.mockResolvedValue(null); // free tier: maxOrders 30
      mockPrismaService.order.count.mockResolvedValue(29);

      await service.assertOrderLimit(userId, commerceId);

      const callArgs = mockPrismaService.order.count.mock.calls[0][0];
      expect(callArgs.where.commerceId).toBe(commerceId);
      expect(callArgs.where.createdAt.gte.getDate()).toBe(1);
    });

    it('throws ForbiddenException once the monthly order limit is reached', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: Role.PROFESIONAL,
        categoryId: null,
      });
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);
      mockPrismaService.order.count.mockResolvedValue(30);

      await expect(
        service.assertOrderLimit(userId, commerceId)
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
