import { Test, TestingModule } from '@nestjs/testing'
import { Role } from '@prisma/client'
import { NavigationService } from '../../domains/platform/navigation/navigation.service'
import { PermissionsService } from '../../permissions/permissions.service'
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
    expect(sectionIds).not.toContain('empresa')
    expect(sectionIds).not.toContain('administracion')
    // "mi-cuenta" siempre tiene items sin condición de permiso -> siempre visible
    expect(sectionIds).toContain('mi-cuenta')
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

  it('excludes NORMAL from /pedidos but includes /mis-pedidos (rolesOnly)', async () => {
    permissionsService.getRolePermissions.mockResolvedValue(['orders:view'])
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['orders'],
      categoryName: null,
    })

    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.NORMAL })

    const topSection = result.sections.find((s) => s.id === 'top')
    const operacionesSection = result.sections.find((s) => s.id === 'operaciones')
    expect(topSection?.items.find((i) => i.id === 'mis-pedidos')).toBeDefined()
    expect(operacionesSection?.items.find((i) => i.id === 'pedidos')).toBeUndefined()
  })

  it('excludes FREELANCER from /pedidos, /empleados but includes /modulos, /mi-plan (accountType)', async () => {
    permissionsService.getRolePermissions.mockResolvedValue(['orders:view', 'employees:view'])
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['orders', 'employees'],
      categoryName: null,
    })

    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.FREELANCER })

    const operacionesSection = result.sections.find((s) => s.id === 'operaciones')
    const empresaSection = result.sections.find((s) => s.id === 'empresa')
    const negocioSection = result.sections.find((s) => s.id === 'negocio')
    expect(operacionesSection?.items.find((i) => i.id === 'pedidos')).toBeUndefined()
    expect(empresaSection).toBeUndefined()
    expect(negocioSection?.items.find((i) => i.id === 'modulos')).toBeDefined()
    expect(negocioSection?.items.find((i) => i.id === 'mi-plan')).toBeDefined()
    expect(negocioSection?.items.find((i) => i.id === 'precios')).toBeUndefined()
  })

  it('shows /pedidos, /empleados for COMMERCE and excludes /precios (accountType)', async () => {
    permissionsService.getRolePermissions.mockResolvedValue(['orders:view', 'employees:view'])
    planLimitsService.getPlanLimits.mockResolvedValue({
      effectiveModules: ['orders', 'employees'],
      categoryName: null,
    })

    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.COMMERCE })

    const operacionesSection = result.sections.find((s) => s.id === 'operaciones')
    const empresaSection = result.sections.find((s) => s.id === 'empresa')
    const negocioSection = result.sections.find((s) => s.id === 'negocio')
    expect(operacionesSection?.items.find((i) => i.id === 'pedidos')).toBeDefined()
    expect(empresaSection?.items.find((i) => i.id === 'empleados')).toBeDefined()
    expect(negocioSection?.items.find((i) => i.id === 'precios')).toBeUndefined()
  })

  it('a user override grants a permission the role does not have', async () => {
    permissionsService.getRolePermissions.mockResolvedValue([])
    permissionsService.getUserOverrides.mockResolvedValue({ 'users:view': true })

    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.ADMIN })

    const adminSection = result.sections.find((s) => s.id === 'administracion')
    expect(adminSection?.items.find((i) => i.id === 'admin-usuarios')).toBeDefined()
  })

  it('SUPERADMIN sees every permission-gated item regardless of role permissions', async () => {
    const result = await service.buildNavigationForUser({ id: 'u1', role: Role.SUPERADMIN })

    const adminSection = result.sections.find((s) => s.id === 'administracion')
    expect(adminSection?.items.length).toBeGreaterThan(0)
  })

  describe('getRouteMaps', () => {
    it('is static and does not depend on the user', () => {
      const first = service.getRouteMaps()
      const second = service.getRouteMaps()

      expect(first).toEqual(second)
      expect(first.routePermissions['/dashboard']).toBe('dashboard:view')
      expect(first.routeModules['/pedidos']).toBe('orders')
    })
  })
})
