import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ProfileType, Role } from '@prisma/client';
import {
  PERMISSION_KEY,
} from '../../common/decorators/require-permission.decorator';
import {
  PROFILE_CONTEXT_KEY,
} from '../../common/decorators/require-profile-context.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  PermissionsService,
} from '../../domains/identity-access/permissions/permissions.service';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;
  let permissionsService: { hasEffectivePermission: jest.Mock };

  function makeContext(user: any): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  beforeEach(async () => {
    permissionsService = { hasEffectivePermission: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        Reflector,
        { provide: PermissionsService, useValue: permissionsService },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it(
    'allows the request when no @RequirePermission metadata is set',
    async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation(() => undefined);

    const result = await guard.canActivate(
      makeContext({ id: 'u1', role: Role.PROFESIONAL })
    );

    expect(result).toBe(true);
    expect(permissionsService.hasEffectivePermission).not.toHaveBeenCalled();
  });

  it('bypasses SUPERADMIN without calling the service', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) =>
        key === PERMISSION_KEY ? 'orders:view' : undefined
      );

    const result = await guard.canActivate(
      makeContext({ id: 'u1', role: Role.SUPERADMIN })
    );

    expect(result).toBe(true);
    expect(permissionsService.hasEffectivePermission).not.toHaveBeenCalled();
  });

  it(
    'calls hasEffectivePermission with (userId, role, permission) for non-SUPERADMIN',
    async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) =>
        key === PERMISSION_KEY ? 'orders:view' : undefined
      );
    permissionsService.hasEffectivePermission.mockResolvedValue(true);

    const result = await guard.canActivate(
      makeContext({ id: 'u1', role: Role.PROFESIONAL })
    );

    expect(result).toBe(true);
    expect(permissionsService.hasEffectivePermission).toHaveBeenCalledWith(
      'u1',
      Role.PROFESIONAL,
      'orders:view',
      undefined
    );
  });

  it(
    'throws ForbiddenException when the effective permission is denied',
    async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) =>
        key === PERMISSION_KEY ? 'orders:view' : undefined
      );
    permissionsService.hasEffectivePermission.mockResolvedValue(false);

    await expect(
      guard.canActivate(makeContext({ id: 'u1', role: Role.PROFESIONAL }))
    ).rejects.toThrow(ForbiddenException);
  });

  it(
    'limits inherited profile permissions to the declared context',
    async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === PERMISSION_KEY) return 'settings:edit';
        if (key === PROFILE_CONTEXT_KEY) return [ProfileType.PROFESSIONAL];
        return undefined;
      });
    permissionsService.hasEffectivePermission.mockResolvedValue(true);

    await guard.canActivate(
      makeContext({ id: 'u1', role: Role.PROFESIONAL })
    );

    expect(permissionsService.hasEffectivePermission).toHaveBeenCalledWith(
      'u1',
      Role.PROFESIONAL,
      'settings:edit',
      [ProfileType.PROFESSIONAL]
    );
  });

  it('returns false when there is no user on the request', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) =>
        key === PERMISSION_KEY ? 'orders:view' : undefined
      );

    const result = await guard.canActivate(makeContext(undefined));

    expect(result).toBe(false);
  });
});
