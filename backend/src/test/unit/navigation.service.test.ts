import { Test, TestingModule } from '@nestjs/testing'
import { Role } from '@prisma/client'
import { NavigationService } from '../../domains/platform/navigation/navigation.service'
import { PermissionsService } from '../../domains/identity-access/permissions/permissions.service'
import { PlanLimitsService } from '../../domains/money/plans/plan-limits.service'

describe('NavigationService', () => {
  let service: NavigationService
  let permissionsService: { getRolePermissions: jest.Mock; getUserOverrides: jest.Mock }
  let planLimitsService: { getPlanLimits: jest.Mock }

  beforeEach(async () => {
    permissionsService = {
      getRolePermissions: jest.fn().mockResolvedValue([]),
      getUserOverrides: jest.fn().mockResolvedValue({}),
    }
    planLimitsService = {
      getPlanLimits: jest.fn().mockResolvedValue({
        effectiveModules: [],
        categoryName: null,
      }),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NavigationService,
        { provide: PermissionsService, useValue: permissionsService },
        { provide: PlanLimitsService, useValue: planLimitsService },
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
    expect(sectionIds).not.toContain('administration')
    // "my-account" siempre tiene items sin condición de permiso -> siempre visible
    expect(sectionIds).toContain('my-account')
  })

  it('respects requiresCategory: menu:view only shows for category "Comida"', async () => {
    permissionsService.getRolePermissions.mockResolvedValue(['menu:view'])
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['menu'],
      categoryName: 'Servicios', // distinta de "Comida"
    })

    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.COMMERCE })

    const topSection = result.sections.find((s) => s.id === 'top')
    expect(topSection?.items.find((i) => i.id === 'menu')).toBeUndefined()
  })

  it('shows menu:view when category is exactly "Comida" and module/permission are granted', async () => {
    permissionsService.getRolePermissions.mockResolvedValue(['menu:view'])
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['menu'],
      categoryName: 'Comida',
    })

    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.COMMERCE })

    const topSection = result.sections.find((s) => s.id === 'top')
    expect(topSection?.items.find((i) => i.id === 'menu')).toBeDefined()
  })

  it('excludes NORMAL from /orders but includes /my-orders (rolesOnly)', async () => {
    permissionsService.getRolePermissions.mockResolvedValue(['orders:view'])
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['orders'],
      categoryName: null,
    })

    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.NORMAL })

    const topSection = result.sections.find((s) => s.id === 'top')
    const operationsSection = result.sections.find((s) => s.id === 'operations')
    expect(topSection?.items.find((i) => i.id === 'my-orders')).toBeDefined()
    expect(operationsSection?.items.find((i) => i.id === 'orders')).toBeUndefined()
  })

  it('excludes FREELANCER from /orders, /employees but includes /modules, /my-plan (accountType)', async () => {
    permissionsService.getRolePermissions.mockResolvedValue(['orders:view', 'employees:view'])
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['orders', 'employees'],
      categoryName: null,
    })

    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.FREELANCER })

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

    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.COMMERCE })

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

    const adminSection = result.sections.find((s) => s.id === 'administration')
    expect(adminSection?.items.find((i) => i.id === 'admin-users')).toBeDefined()
  })

  it('SUPERADMIN sees every permission-gated item regardless of role permissions', async () => {
    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.SUPERADMIN })

    const adminSection = result.sections.find((s) => s.id === 'administration')
    expect(adminSection?.items.length).toBeGreaterThan(0)
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
