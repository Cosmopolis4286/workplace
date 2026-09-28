import { Test, TestingModule } from '@nestjs/testing'
import { Reflector } from '@nestjs/core'
import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { ModuleAccessGuard } from '../../common/guards/module-access.guard'
import { PLAN_LIMITS_FACADE } from '../../domains/money/plans/plan-limits.facade'
import { CapabilitiesService } from '../../common/capabilities/capabilities.service'

describe('ModuleAccessGuard', () => {
  let guard: ModuleAccessGuard
  let reflector: Reflector
  let planLimits: { assertModuleAccess: jest.Mock }
  let capabilities: { has: jest.Mock }

  function makeContext(user: any): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext
  }

  beforeEach(async () => {
    planLimits = { assertModuleAccess: jest.fn() }
    capabilities = { has: jest.fn().mockResolvedValue(true) }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModuleAccessGuard,
        Reflector,
        { provide: PLAN_LIMITS_FACADE, useValue: planLimits },
        { provide: CapabilitiesService, useValue: capabilities },
      ],
    }).compile()

    guard = module.get<ModuleAccessGuard>(ModuleAccessGuard)
    reflector = module.get<Reflector>(Reflector)
  })

  it('allows the request when no @RequireModule metadata is set', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined)

    const result = await guard.canActivate(makeContext({ id: 'u1', role: 'PROFESIONAL' }))

    expect(result).toBe(true)
    expect(planLimits.assertModuleAccess).not.toHaveBeenCalled()
  })

  it.each(['SUPERADMIN', 'ADMIN', 'NORMAL'])('bypasses %s without calling assertModuleAccess', async (role) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('menu')

    const result = await guard.canActivate(makeContext({ id: 'u1', role }))

    expect(result).toBe(true)
    expect(planLimits.assertModuleAccess).not.toHaveBeenCalled()
  })

  it('calls assertModuleAccess(userId, module) for a PROFESIONAL user', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('menu')
    planLimits.assertModuleAccess.mockResolvedValue(undefined)

    const result = await guard.canActivate(makeContext({ id: 'u1', role: 'PROFESIONAL' }))

    expect(result).toBe(true)
    expect(planLimits.assertModuleAccess).toHaveBeenCalledWith('u1', 'menu')
  })

  it('propagates the ForbiddenException thrown by assertModuleAccess (module not in effectiveModules)', async () => {
    // Caso real: un FREELANCER de categoría "Tecnología" (allowedModules sin
    // 'menu') intentando POST /menu/products directo por API — el mismo
    // 403 que el sidebar ya anticipa vía effectiveModules.
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('menu')
    planLimits.assertModuleAccess.mockRejectedValue(new ForbiddenException('nope'))

    await expect(guard.canActivate(makeContext({ id: 'u1', role: 'PROFESIONAL' }))).rejects.toThrow(
      ForbiddenException
    )
  })

  it('rejects a commerce-bound module when the user has no Commerce, even if the category allows it', async () => {
    // Caso real: profesional de "Diseño" — su categoría trae customers/
    // expenses, pero sin Commerce no hay sobre qué operar (FK obligatoria).
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('customers')
    planLimits.assertModuleAccess.mockResolvedValue(undefined)
    capabilities.has.mockResolvedValue(false)

    await expect(guard.canActivate(makeContext({ id: 'u1', role: 'PROFESIONAL' }))).rejects.toThrow(
      ForbiddenException
    )
    expect(capabilities.has).toHaveBeenCalledWith('u1', 'HAS_COMMERCE')
  })

  it('does not require a Commerce for modules outside COMMERCE_BOUND_MODULES', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('services')
    planLimits.assertModuleAccess.mockResolvedValue(undefined)

    const result = await guard.canActivate(makeContext({ id: 'u1', role: 'PROFESIONAL' }))

    expect(result).toBe(true)
    expect(capabilities.has).not.toHaveBeenCalled()
  })

  it('returns false when there is no user on the request', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('menu')

    const result = await guard.canActivate(makeContext(undefined))

    expect(result).toBe(false)
    expect(planLimits.assertModuleAccess).not.toHaveBeenCalled()
  })
})
