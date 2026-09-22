import { Test, TestingModule } from '@nestjs/testing'
import { Role } from '@prisma/client'
import { NavigationService } from '../../domains/platform/navigation/navigation.service'
import { PERMISSIONS_FACADE } from '../../domains/identity-access/permissions/permissions.facade'
import { PLAN_LIMITS_FACADE } from '../../domains/money/plans/plan-limits.facade'
import { AccountTypeResolver } from '../../common/account-type/account-type.resolver'

describe('NavigationService', () => {
  let service: NavigationService
  let permissionsService: {
    getRolePermissions: jest.Mock
    getUserOverrides: jest.Mock
    getActiveProfilePermissions: jest.Mock
  }
  let planLimitsService: { getPlanLimits: jest.Mock }
  // role='PROFESIONAL' ya no distingue COMMERCE de FREELANCER — cada test
  // fija explícitamente qué debe devolver AccountTypeResolver (la única
  // fuente real de esa distinción), independiente de `role`.
  let currentAccountType: 'COMMERCE' | 'FREELANCER' | null

  beforeEach(async () => {
    permissionsService = {
      getRolePermissions: jest.fn().mockResolvedValue([]),
      getUserOverrides: jest.fn().mockResolvedValue({}),
      getActiveProfilePermissions: jest.fn().mockResolvedValue([]),
    }
    planLimitsService = {
      getPlanLimits: jest.fn().mockResolvedValue({
        effectiveModules: [],
        categoryName: null,
      }),
    }
    currentAccountType = null
    const accountTypeResolver = {
      resolve: jest.fn().mockImplementation(async () => currentAccountType),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NavigationService,
        { provide: PERMISSIONS_FACADE, useValue: permissionsService },
        { provide: PLAN_LIMITS_FACADE, useValue: planLimitsService },
        { provide: AccountTypeResolver, useValue: accountTypeResolver },
      ],
    }).compile()

    service = module.get<NavigationService>(NavigationService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('excludes sections with no visible items for a restricted role', async () => {
    // NORMAL sin permisos de rol ni overrides: la mayoría de secciones
    // (empresa, ventas, operaciones) deberían quedar vacías y no aparecer.
    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.NORMAL })

    const sectionIds = result.sections.map((s) => s.id)
    expect(sectionIds).not.toContain('company')
    expect(sectionIds).not.toContain('administration-people')
    expect(sectionIds).not.toContain('administration-catalog')
    expect(sectionIds).not.toContain('administration-money')
    expect(sectionIds).not.toContain('administration-system')
    // "my-account" siempre tiene items sin condición de permiso -> siempre visible
    expect(sectionIds).toContain('my-account')
  })

  it('hides menu:view when the category (allowedModules) does not grant the "menu" module', async () => {
    // Gating es 100% por effectiveModules (plan ∩ categoría.allowedModules,
    // ver PlanLimitsService) — ya no por un nombre de categoría hardcodeado.
    // Cualquier categoría cuyo admin no le agregó "menu" a allowedModules
    // queda afuera, sin importar su nombre.
    permissionsService.getRolePermissions.mockResolvedValue(['menu:view'])
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['services'],
      categoryName: 'Servicios',
    })

    currentAccountType = 'COMMERCE'
    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.PROFESIONAL })

    const catalogSection = result.sections.find((s) => s.id === 'catalog')
    expect(catalogSection?.items.find((i) => i.id === 'menu')).toBeUndefined()
  })

  it('shows menu:view for any category whose allowedModules grants "menu"', async () => {
    permissionsService.getRolePermissions.mockResolvedValue(['menu:view'])
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['menu'],
      categoryName: 'Comida',
    })

    currentAccountType = 'COMMERCE'
    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.PROFESIONAL })

    const catalogSection = result.sections.find((s) => s.id === 'catalog')
    expect(catalogSection?.items.find((i) => i.id === 'menu')).toBeDefined()
  })

  it('hides /jobs for a NORMAL user even though jobs:view is granted at the role level', async () => {
    // Role.NORMAL tiene jobs:view/jobs:create en su matriz de permisos por
    // diseño (ver seed.js — alta directa), pero /jobs es "gestiona las
    // vacantes que publicas": sin este gating, un NORMAL sin ningún
    // UserProfile de negocio veía el ítem "Empleos" en la sección "Empresa"
    // sin tener nada que publicar (bug reportado en el sidebar real).
    permissionsService.getRolePermissions.mockResolvedValue(['jobs:view'])
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['jobs'],
      categoryName: null,
    })

    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.NORMAL })

    const companySection = result.sections.find((s) => s.id === 'company')
    expect(companySection).toBeUndefined()
  })

  it('hides /jobs for a FREELANCER without the employees module (solo individual, sin equipo)', async () => {
    // Caso real reportado: un FREELANCER individual (ej. repartidor) veía
    // "Empleos" en la sección "Empresa" aunque no gestiona personal — el
    // primer fix solo distinguía NORMAL de PROFESIONAL vía accountTypeOnly,
    // sin mirar si el plan realmente incluye el módulo 'employees'.
    permissionsService.getRolePermissions.mockResolvedValue(['jobs:view'])
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['jobs', 'corridas', 'delivery'], // sin 'employees'
      categoryName: null,
    })

    currentAccountType = 'FREELANCER'
    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.PROFESIONAL })

    const companySection = result.sections.find((s) => s.id === 'company')
    expect(companySection?.items.find((i) => i.id === 'jobs')).toBeUndefined()
  })

  it('shows /jobs for a PROFESIONAL user whose plan includes the employees module', async () => {
    permissionsService.getRolePermissions.mockResolvedValue(['jobs:view', 'employees:view'])
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['jobs', 'employees'],
      categoryName: null,
    })

    currentAccountType = 'COMMERCE'
    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.PROFESIONAL })

    const companySection = result.sections.find((s) => s.id === 'company')
    expect(companySection?.items.find((i) => i.id === 'jobs')).toBeDefined()
  })

  it('excludes NORMAL from /orders but includes /my-orders (rolesOnly)', async () => {
    permissionsService.getRolePermissions.mockResolvedValue(['orders:view'])
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['orders'],
      categoryName: null,
    })

    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.NORMAL })

    const activitySection = result.sections.find((s) => s.id === 'activity')
    const operationsSection = result.sections.find((s) => s.id === 'operations')
    expect(activitySection?.items.find((i) => i.id === 'my-orders')).toBeDefined()
    expect(operationsSection?.items.find((i) => i.id === 'orders')).toBeUndefined()
  })

  it('excludes FREELANCER from /orders, /employees but includes /modules, /my-plan (accountType)', async () => {
    permissionsService.getRolePermissions.mockResolvedValue(['orders:view', 'employees:view'])
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['orders', 'employees'],
      categoryName: null,
    })

    currentAccountType = 'FREELANCER'
    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.PROFESIONAL })

    const operationsSection = result.sections.find((s) => s.id === 'operations')
    const companySection = result.sections.find((s) => s.id === 'company')
    const businessSection = result.sections.find((s) => s.id === 'business')
    expect(operationsSection?.items.find((i) => i.id === 'orders')).toBeUndefined()
    expect(companySection).toBeUndefined()
    expect(businessSection?.items.find((i) => i.id === 'modules')).toBeDefined()
    expect(businessSection?.items.find((i) => i.id === 'my-plan')).toBeDefined()
    expect(businessSection?.items.find((i) => i.id === 'pricing')).toBeUndefined()
  })

  it('shows /orders, /employees for COMMERCE and excludes /pricing (accountType)', async () => {
    permissionsService.getRolePermissions.mockResolvedValue(['orders:view', 'employees:view'])
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['orders', 'employees'],
      categoryName: null,
    })

    currentAccountType = 'COMMERCE'
    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.PROFESIONAL })

    const operationsSection = result.sections.find((s) => s.id === 'operations')
    const companySection = result.sections.find((s) => s.id === 'company')
    const businessSection = result.sections.find((s) => s.id === 'business')
    expect(operationsSection?.items.find((i) => i.id === 'orders')).toBeDefined()
    expect(companySection?.items.find((i) => i.id === 'employees')).toBeDefined()
    expect(businessSection?.items.find((i) => i.id === 'pricing')).toBeUndefined()
  })

  it('a user override grants a permission the role does not have', async () => {
    permissionsService.getRolePermissions.mockResolvedValue([])
    permissionsService.getUserOverrides.mockResolvedValue({ 'users:view': true })

    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.ADMIN })

    const adminSection = result.sections.find((s) => s.id === 'administration-people')
    expect(adminSection?.items.find((i) => i.id === 'admin-users')).toBeDefined()
  })

  it('SUPERADMIN sees every permission-gated item regardless of role permissions', async () => {
    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.SUPERADMIN })

    const adminSections = result.sections.filter((s) => s.id.startsWith('administration-'))
    const totalAdminItems = adminSections.reduce((sum, s) => sum + s.items.length, 0)
    expect(totalAdminItems).toBeGreaterThan(0)
  })

  it('grants a permission via an active UserProfile even when the role does not include it', async () => {
    // Caso central del fix: Role.PROFESIONAL es la unión COMMERCE∪FREELANCER
    // a nivel de rol, pero el ítem debe reflejar el/los UserProfile ACTIVE
    // reales del usuario, igual que hasEffectivePermission ya hace para
    // autorizar el endpoint. Sin este fix, un permiso ausente del rol pero
    // concedido solo vía ProfilePermission nunca aparecería en el sidebar.
    permissionsService.getRolePermissions.mockResolvedValue([])
    permissionsService.getActiveProfilePermissions.mockResolvedValue(['sales:view'])
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['sales'],
      categoryName: null,
    })

    currentAccountType = 'COMMERCE'
    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.PROFESIONAL })

    const salesSection = result.sections.find((s) => s.id === 'sales')
    expect(salesSection?.items.find((i) => i.id === 'sales')).toBeDefined()
  })

  it('keeps only Dashboard/Asistente IA in the flat "top" section, grouping the rest into catalog/activity', async () => {
    permissionsService.getRolePermissions.mockResolvedValue([
      'dashboard:view', 'menu:view', 'inventory:view', 'services:view', 'service_requests:view',
      'opportunities:view', 'corridas:view', 'wallets:use',
    ])
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['menu', 'inventory', 'services', 'service_requests', 'corridas', 'wallets'],
      categoryName: null,
    })

    currentAccountType = 'COMMERCE'
    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.PROFESIONAL })

    const topSection = result.sections.find((s) => s.id === 'top')
    const catalogSection = result.sections.find((s) => s.id === 'catalog')
    const activitySection = result.sections.find((s) => s.id === 'activity')

    expect(topSection?.items.map((i) => i.id).sort()).toEqual(['ai-assistant', 'dashboard'])
    expect(catalogSection?.items.find((i) => i.id === 'menu')).toBeDefined()
    expect(catalogSection?.items.find((i) => i.id === 'inventory')).toBeDefined()
    expect(catalogSection?.items.find((i) => i.id === 'my-services')).toBeDefined()
    expect(activitySection?.items.find((i) => i.id === 'service-requests')).toBeDefined()
    expect(activitySection?.items.find((i) => i.id === 'opportunities')).toBeDefined()
    expect(activitySection?.items.find((i) => i.id === 'rides')).toBeDefined()
    expect(activitySection?.items.find((i) => i.id === 'wallet')).toBeDefined()
  })

  describe('getRouteMaps', () => {
    it('is static and does not depend on the user', () => {
      const first = service.getRouteMaps()
      const second = service.getRouteMaps()

      expect(first).toEqual(second)
      expect(first.routePermissions['/dashboard']).toBe('dashboard:view')
      expect(first.routeModules['/orders']).toBe('orders')
    })
  })
})
