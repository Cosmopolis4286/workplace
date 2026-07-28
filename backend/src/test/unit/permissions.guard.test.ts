import { Test, TestingModule } from '@nestjs/testing'
import { Reflector } from '@nestjs/core'
import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Role } from '@prisma/client'
import { PermissionsGuard } from '../../common/guards/permissions.guard'
import { PermissionsService } from '../../domains/identity-access/permissions/permissions.service'

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard
  let reflector: Reflector
  let permissionsService: { hasEffectivePermission: jest.Mock }

  function makeContext(user: any): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext
  }

  beforeEach(async () => {
    permissionsService = { hasEffectivePermission: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        Reflector,
        { provide: PermissionsService, useValue: permissionsService },
      ],
    }).compile()

    guard = module.get<PermissionsGuard>(PermissionsGuard)
    reflector = module.get<Reflector>(Reflector)
  })

  it('allows the request when no @RequirePermission metadata is set', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined)

    const result = await guard.canActivate(makeContext({ id: 'u1', role: Role.COMMERCE }))

    expect(result).toBe(true)
    expect(permissionsService.hasEffectivePermission).not.toHaveBeenCalled()
  })

  it('bypasses SUPERADMIN without calling the service', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('orders:view')

    const result = await guard.canActivate(makeContext({ id: 'u1', role: Role.SUPERADMIN }))

    expect(result).toBe(true)
    expect(permissionsService.hasEffectivePermission).not.toHaveBeenCalled()
  })

  it('calls hasEffectivePermission with (userId, role, permission) for non-SUPERADMIN', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('orders:view')
    permissionsService.hasEffectivePermission.mockResolvedValue(true)

    const result = await guard.canActivate(makeContext({ id: 'u1', role: Role.COMMERCE }))

    expect(result).toBe(true)
    expect(permissionsService.hasEffectivePermission).toHaveBeenCalledWith('u1', Role.COMMERCE, 'orders:view')
  })

  it('throws ForbiddenException when the effective permission is denied', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('orders:view')
    permissionsService.hasEffectivePermission.mockResolvedValue(false)

    await expect(guard.canActivate(makeContext({ id: 'u1', role: Role.COMMERCE }))).rejects.toThrow(
      ForbiddenException
    )
  })

  it('returns false when there is no user on the request', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('orders:view')

    const result = await guard.canActivate(makeContext(undefined))

    expect(result).toBe(false)
  })
})
