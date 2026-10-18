import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { NavigationService } from '../../domains/platform/navigation/navigation.service';
import { PERMISSIONS_FACADE } from '../../domains/identity-access/permissions/permissions.facade';
import { PLAN_LIMITS_FACADE } from '../../domains/money/plans/plan-limits.facade';
import {
  CapabilitiesService,
  CapabilityMap,
} from '../../common/capabilities/capabilities.service';

describe('NavigationService', () => {
  let service: NavigationService;
  let permissionsService: {
    getRolePermissions: jest.Mock;
    getUserOverrides: jest.Mock;
    getActiveProfilePermissions: jest.Mock;
  };
  let planLimitsService: { getPlanLimits: jest.Mock };
  // Cada test fija las capacidades reales del usuario (¿tiene Commerce?
  // ¿qué perfiles ACTIVE?), independiente de `role`. El papel lo deciden los
  // permisos mockeados; esto solo decide los prerrequisitos.
  const NONE: CapabilityMap = {
    HAS_COMMERCE: false,
    HAS_PROFESSIONAL_PROFILE: false,
    HAS_BUSINESS_PROFILE: false,
  };
  const BUSINESS_WITH_COMMERCE: CapabilityMap = {
    HAS_COMMERCE: true,
    HAS_PROFESSIONAL_PROFILE: false,
    HAS_BUSINESS_PROFILE: true,
  };
  const PROFESSIONAL_WITHOUT_COMMERCE: CapabilityMap = {
    HAS_COMMERCE: false,
    HAS_PROFESSIONAL_PROFILE: true,
    HAS_BUSINESS_PROFILE: false,
  };
  const PROFESSIONAL_WITH_COMMERCE: CapabilityMap = {
    HAS_COMMERCE: true,
    HAS_PROFESSIONAL_PROFILE: true,
    HAS_BUSINESS_PROFILE: false,
  };
  let currentCapabilities: CapabilityMap;

  beforeEach(async () => {
    permissionsService = {
      getRolePermissions: jest.fn().mockResolvedValue([]),
      getUserOverrides: jest.fn().mockResolvedValue({}),
      getActiveProfilePermissions: jest.fn().mockResolvedValue([]),
    };
    planLimitsService = {
      getPlanLimits: jest.fn().mockResolvedValue({
        effectiveModules: [],
        categoryName: null,
      }),
    };
    currentCapabilities = NONE;
    const capabilitiesService = {
      resolve: jest.fn().mockImplementation(async () => currentCapabilities),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NavigationService,
        { provide: PERMISSIONS_FACADE, useValue: permissionsService },
        { provide: PLAN_LIMITS_FACADE, useValue: planLimitsService },
        { provide: CapabilitiesService, useValue: capabilitiesService },
      ],
    }).compile();

    service = module.get<NavigationService>(NavigationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('excludes sections with no visible items for a restricted role', async () => {
    // NORMAL sin permisos de rol ni overrides: la mayoría de secciones
    // (empresa, ventas, operaciones) deberían quedar vacías y no aparecer.
    const result = await service.buildNavigationForUser({
      id: 'u1',
      role: Role.NORMAL,
    });

    const sectionIds = result.sections.map((s) => s.id);
    expect(sectionIds).not.toContain('company');
    expect(sectionIds).not.toContain('administration-people');
    expect(sectionIds).not.toContain('administration-catalog');
    expect(sectionIds).not.toContain('administration-money');
    expect(sectionIds).not.toContain('administration-system');
    // "my-account" siempre tiene items sin condición de permiso -> siempre visible
    expect(sectionIds).toContain('my-account');
  });

  it('hides menu:view when the category (allowedModules) does not grant the "menu" module', async () => {
    // Gating es 100% por effectiveModules (plan ∩ categoría.allowedModules,
    // ver PlanLimitsService) — ya no por un nombre de categoría hardcodeado.
    // Cualquier categoría cuyo admin no le agregó "menu" a allowedModules
    // queda afuera, sin importar su nombre.
    permissionsService.getRolePermissions.mockResolvedValue(['menu:view']);
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['services'],
      categoryName: 'Servicios',
    });

    currentCapabilities = BUSINESS_WITH_COMMERCE;
    const result = await service.buildNavigationForUser({
      id: 'u1',
      role: Role.PROFESIONAL,
    });

    const catalogSection = result.sections.find((s) => s.id === 'catalog');
    expect(catalogSection?.items.find((i) => i.id === 'menu')).toBeUndefined();
  });

  it('shows menu:view for any category whose allowedModules grants "menu"', async () => {
    permissionsService.getRolePermissions.mockResolvedValue(['menu:view']);
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['menu'],
      categoryName: 'Comida',
    });

    currentCapabilities = BUSINESS_WITH_COMMERCE;
    const result = await service.buildNavigationForUser({
      id: 'u1',
      role: Role.PROFESIONAL,
    });

    const catalogSection = result.sections.find((s) => s.id === 'catalog');
    expect(catalogSection?.items.find((i) => i.id === 'menu')).toBeDefined();
  });

  it('hides /jobs for a NORMAL user even though jobs:view is granted at the role level', async () => {
    // Role.NORMAL tiene jobs:view/jobs:create en su matriz de permisos por
    // diseño (ver seed.js — alta directa), pero /jobs es "gestiona las
    // vacantes que publicas": sin este gating, un NORMAL sin ningún
    // UserProfile de negocio veía el ítem "Empleos" en la sección "Empresa"
    // sin tener nada que publicar (bug reportado en el sidebar real).
    permissionsService.getRolePermissions.mockResolvedValue(['jobs:view']);
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['jobs'],
      categoryName: null,
    });

    const result = await service.buildNavigationForUser({
      id: 'u1',
      role: Role.NORMAL,
    });

    const companySection = result.sections.find((s) => s.id === 'company');
    expect(companySection).toBeUndefined();
  });

  it('hides /jobs for a FREELANCER without the employees module (solo individual, sin equipo)', async () => {
    // Caso real reportado: un FREELANCER individual (ej. repartidor) veía
    // "Empleos" en la sección "Empresa" aunque no gestiona personal — el
    // primer fix solo distinguía NORMAL de PROFESIONAL vía accountTypeOnly,
    // sin mirar si el plan realmente incluye el módulo 'employees'.
    permissionsService.getRolePermissions.mockResolvedValue(['jobs:view']);
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['jobs', 'corridas', 'delivery'], // sin 'employees'
      categoryName: null,
    });

    currentCapabilities = PROFESSIONAL_WITHOUT_COMMERCE;
    const result = await service.buildNavigationForUser({
      id: 'u1',
      role: Role.PROFESIONAL,
    });

    const companySection = result.sections.find((s) => s.id === 'company');
    expect(companySection?.items.find((i) => i.id === 'jobs')).toBeUndefined();
  });

  it('shows /jobs for a PROFESIONAL user whose plan includes the employees module', async () => {
    permissionsService.getRolePermissions.mockResolvedValue([
      'jobs:view',
      'employees:view',
    ]);
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['jobs', 'employees'],
      categoryName: null,
    });

    currentCapabilities = BUSINESS_WITH_COMMERCE;
    const result = await service.buildNavigationForUser({
      id: 'u1',
      role: Role.PROFESIONAL,
    });

    const companySection = result.sections.find((s) => s.id === 'company');
    expect(companySection?.items.find((i) => i.id === 'jobs')).toBeDefined();
  });

  it('excludes NORMAL from /orders but includes /my-orders (rolesOnly)', async () => {
    permissionsService.getRolePermissions.mockResolvedValue(['orders:view']);
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['orders'],
      categoryName: null,
    });

    const result = await service.buildNavigationForUser({
      id: 'u1',
      role: Role.NORMAL,
    });

    const activitySection = result.sections.find((s) => s.id === 'activity');
    const operationsSection = result.sections.find(
      (s) => s.id === 'operations'
    );
    expect(
      activitySection?.items.find((i) => i.id === 'my-orders')
    ).toBeDefined();
    expect(
      operationsSection?.items.find((i) => i.id === 'orders')
    ).toBeUndefined();
  });

  it('excludes a PROFESSIONAL without Commerce from /orders, /employees but includes /modules, /my-plan (capabilities)', async () => {
    permissionsService.getRolePermissions.mockResolvedValue([
      'orders:view',
      'employees:view',
    ]);
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['orders', 'employees'],
      categoryName: null,
    });

    currentCapabilities = PROFESSIONAL_WITHOUT_COMMERCE;
    const result = await service.buildNavigationForUser({
      id: 'u1',
      role: Role.PROFESIONAL,
    });

    const operationsSection = result.sections.find(
      (s) => s.id === 'operations'
    );
    const companySection = result.sections.find((s) => s.id === 'company');
    const businessSection = result.sections.find((s) => s.id === 'business');
    expect(
      operationsSection?.items.find((i) => i.id === 'orders')
    ).toBeUndefined();
    expect(companySection).toBeUndefined();
    expect(
      businessSection?.items.find((i) => i.id === 'modules')
    ).toBeDefined();
    expect(
      businessSection?.items.find((i) => i.id === 'my-plan')
    ).toBeDefined();
    expect(
      businessSection?.items.find((i) => i.id === 'pricing')
    ).toBeUndefined();
  });

  it('shows /orders, /employees for COMMERCE and excludes /pricing (capabilities)', async () => {
    permissionsService.getRolePermissions.mockResolvedValue([
      'orders:view',
      'employees:view',
    ]);
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['orders', 'employees'],
      categoryName: null,
    });

    currentCapabilities = BUSINESS_WITH_COMMERCE;
    const result = await service.buildNavigationForUser({
      id: 'u1',
      role: Role.PROFESIONAL,
    });

    const operationsSection = result.sections.find(
      (s) => s.id === 'operations'
    );
    const companySection = result.sections.find((s) => s.id === 'company');
    const businessSection = result.sections.find((s) => s.id === 'business');
    expect(
      operationsSection?.items.find((i) => i.id === 'orders')
    ).toBeDefined();
    expect(
      companySection?.items.find((i) => i.id === 'employees')
    ).toBeDefined();
    expect(
      businessSection?.items.find((i) => i.id === 'pricing')
    ).toBeUndefined();
  });

  it('PROFESSIONAL selling product (opción 2): sees /orders and /menu via Commerce, but not /employees (permission is BUSINESS-only)', async () => {
    // comidarapida@demo.com: perfil PROFESSIONAL con Commerce en "Comida".
    // El módulo employees está en su effectiveModules (la categoría lo trae),
    // pero el perfil PROFESSIONAL no concede employees:view — una sola capa
    // decide cada cosa, sin listas de accountType.
    permissionsService.getRolePermissions.mockResolvedValue([
      'orders:view',
      'menu:view',
    ]);
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['orders', 'menu', 'employees'],
      categoryName: 'Comida',
    });

    currentCapabilities = PROFESSIONAL_WITH_COMMERCE;
    const result = await service.buildNavigationForUser({
      id: 'u1',
      role: Role.PROFESIONAL,
    });

    const operationsSection = result.sections.find(
      (s) => s.id === 'operations'
    );
    const catalogSection = result.sections.find((s) => s.id === 'catalog');
    expect(
      operationsSection?.items.find((i) => i.id === 'orders')
    ).toBeDefined();
    expect(catalogSection?.items.find((i) => i.id === 'menu')).toBeDefined();
    expect(result.sections.find((s) => s.id === 'company')).toBeUndefined();
  });

  it('hides /jobs when the employees module comes from the category but the profile lacks employees:view', async () => {
    // comidarapida@demo.com: "Comida" trae 'employees' en allowedModules,
    // pero el perfil PROFESSIONAL no concede employees:view (exclusivo de
    // BUSINESS). /jobs usa 'employees' como señal de "gestiona personal".
    permissionsService.getRolePermissions.mockResolvedValue(['jobs:view']);
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['jobs', 'employees'],
      categoryName: 'Comida',
    });

    currentCapabilities = PROFESSIONAL_WITH_COMMERCE;
    const result = await service.buildNavigationForUser({
      id: 'u1',
      role: Role.PROFESIONAL,
    });

    expect(result.sections.find((s) => s.id === 'company')).toBeUndefined();
  });

  it('hides commerce-bound items when the user has permission and module but NO Commerce', async () => {
    // Diseñador: su categoría trae customers/expenses y su perfil tiene el
    // permiso (kit de venta de producto), pero sin Commerce no hay sobre qué
    // operar — el mismo 403 que daría ModuleAccessGuard.
    permissionsService.getRolePermissions.mockResolvedValue(['customers:view']);
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['customers'],
      categoryName: 'Diseño',
    });

    currentCapabilities = PROFESSIONAL_WITHOUT_COMMERCE;
    const result = await service.buildNavigationForUser({
      id: 'u1',
      role: Role.PROFESIONAL,
    });

    const operationsSection = result.sections.find(
      (s) => s.id === 'operations'
    );
    expect(
      operationsSection?.items.find((i) => i.id === 'customers')
    ).toBeUndefined();
  });

  it('a user override grants a permission the role does not have', async () => {
    permissionsService.getRolePermissions.mockResolvedValue([]);
    permissionsService.getUserOverrides.mockResolvedValue({
      'users:view': true,
    });

    const result = await service.buildNavigationForUser({
      id: 'u1',
      role: Role.ADMIN,
    });

    const adminSection = result.sections.find(
      (s) => s.id === 'administration-people'
    );
    expect(
      adminSection?.items.find((i) => i.id === 'admin-users')
    ).toBeDefined();
  });

  it('SUPERADMIN sees every permission-gated item regardless of role permissions', async () => {
    const result = await service.buildNavigationForUser({
      id: 'u1',
      role: Role.SUPERADMIN,
    });

    const adminSections = result.sections.filter((s) =>
      s.id.startsWith('administration-')
    );
    const totalAdminItems = adminSections.reduce(
      (sum, s) => sum + s.items.length,
      0
    );
    expect(totalAdminItems).toBeGreaterThan(0);
  });

  it('grants a permission via an active UserProfile even when the role does not include it', async () => {
    // Caso central del fix: Role.PROFESIONAL es la unión COMMERCE∪FREELANCER
    // a nivel de rol, pero el ítem debe reflejar el/los UserProfile ACTIVE
    // reales del usuario, igual que hasEffectivePermission ya hace para
    // autorizar el endpoint. Sin este fix, un permiso ausente del rol pero
    // concedido solo vía ProfilePermission nunca aparecería en el sidebar.
    permissionsService.getRolePermissions.mockResolvedValue([]);
    permissionsService.getActiveProfilePermissions.mockResolvedValue([
      'sales:view',
    ]);
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['sales'],
      categoryName: null,
    });

    currentCapabilities = BUSINESS_WITH_COMMERCE;
    const result = await service.buildNavigationForUser({
      id: 'u1',
      role: Role.PROFESIONAL,
    });

    const salesSection = result.sections.find((s) => s.id === 'sales');
    expect(salesSection?.items.find((i) => i.id === 'sales')).toBeDefined();
  });

  it('keeps only Dashboard/Asistente IA in the flat "top" section, grouping the rest into catalog/activity', async () => {
    permissionsService.getRolePermissions.mockResolvedValue([
      'dashboard:view',
      'menu:view',
      'inventory:view',
      'services:view',
      'service_requests:view',
      'opportunities:view',
      'corridas:view',
      'wallets:use',
    ]);
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: [
        'menu',
        'inventory',
        'services',
        'service_requests',
        'corridas',
        'wallets',
      ],
      categoryName: null,
    });

    currentCapabilities = BUSINESS_WITH_COMMERCE;
    const result = await service.buildNavigationForUser({
      id: 'u1',
      role: Role.PROFESIONAL,
    });

    const topSection = result.sections.find((s) => s.id === 'top');
    const catalogSection = result.sections.find((s) => s.id === 'catalog');
    const activitySection = result.sections.find((s) => s.id === 'activity');

    expect(topSection?.items.map((i) => i.id).sort()).toEqual([
      'ai-assistant',
      'dashboard',
    ]);
    expect(catalogSection?.items.find((i) => i.id === 'menu')).toBeDefined();
    expect(
      catalogSection?.items.find((i) => i.id === 'inventory')
    ).toBeDefined();
    expect(
      catalogSection?.items.find((i) => i.id === 'my-services')
    ).toBeDefined();
    expect(
      activitySection?.items.find((i) => i.id === 'service-requests')
    ).toBeDefined();
    expect(
      activitySection?.items.find((i) => i.id === 'opportunities')
    ).toBeDefined();
    expect(activitySection?.items.find((i) => i.id === 'rides')).toBeDefined();
    expect(activitySection?.items.find((i) => i.id === 'wallet')).toBeDefined();
  });

  describe('getRouteMaps', () => {
    it('is static and does not depend on the user', () => {
      const first = service.getRouteMaps();
      const second = service.getRouteMaps();

      expect(first).toEqual(second);
      expect(first.routePermissions['/dashboard']).toBe('dashboard:view');
      expect(first.routeModules['/orders']).toBe('orders');
    });

    it('exposes routeCapabilities so the frontend middleware stops hardcoding COMMERCE_ONLY_ROUTES', () => {
      const { routeCapabilities } = service.getRouteMaps();

      for (const route of [
        '/orders',
        '/customers',
        '/menu',
        '/expenses',
        '/employees',
        '/cash-register',
      ]) {
        expect(routeCapabilities[route]).toBe('HAS_COMMERCE');
      }
      expect(routeCapabilities['/my-services']).toBeUndefined();
    });
  });
});
