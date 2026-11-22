import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { PlatformSettingsService } from '../../domains/platform/platform-settings/platform-settings.service';

function context(user: unknown, roles: Role[]) {
  const handler = () => undefined;
  Reflect.defineMetadata(ROLES_KEY, roles, handler);
  return {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any;
}

describe('RolesGuard — 2FA obligatorio para el equipo', () => {
  const ADMIN_ONLY = [Role.SUPERADMIN, Role.ADMIN];
  let settings: { isStaffTwoFactorRequired: jest.Mock };
  let guard: RolesGuard;

  beforeEach(() => {
    settings = { isStaffTwoFactorRequired: jest.fn().mockResolvedValue(true) };
    guard = new RolesGuard(new Reflector(), settings as any);
  });

  it('bloquea a un ADMIN sin 2FA cuando la plataforma lo exige', async () => {
    await expect(
      guard.canActivate(
        context({ role: Role.ADMIN, twoFactorEnabled: false }, ADMIN_ONLY)
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('el error lleva el código que el frontend usa para llevarlo a activarlo', async () => {
    const error = await guard
      .canActivate(
        context({ role: Role.SUPERADMIN, twoFactorEnabled: false }, ADMIN_ONLY)
      )
      .catch((e) => e);
    expect(error.getResponse()).toMatchObject({
      errorCode: 'STAFF_2FA_REQUIRED',
    });
  });

  it('deja pasar al ADMIN con 2FA', async () => {
    await expect(
      guard.canActivate(
        context({ role: Role.ADMIN, twoFactorEnabled: true }, ADMIN_ONLY)
      )
    ).resolves.toBe(true);
  });

  it('no exige nada si el ajuste está apagado', async () => {
    settings.isStaffTwoFactorRequired.mockResolvedValue(false);
    await expect(
      guard.canActivate(
        context({ role: Role.ADMIN, twoFactorEnabled: false }, ADMIN_ONLY)
      )
    ).resolves.toBe(true);
  });

  it('no afecta rutas compartidas con roles que no son del equipo', async () => {
    await expect(
      guard.canActivate(
        context({ role: Role.ADMIN, twoFactorEnabled: false }, [
          Role.ADMIN,
          Role.PROFESIONAL,
        ])
      )
    ).resolves.toBe(true);
    expect(settings.isStaffTwoFactorRequired).not.toHaveBeenCalled();
  });

  it('sigue negando a quien no tiene el rol', async () => {
    await expect(
      guard.canActivate(context({ role: Role.NORMAL }, ADMIN_ONLY))
    ).resolves.toBe(false);
  });
});

describe('PlatformSettingsService — security.staffTwoFactorRequired', () => {
  let prisma: any;
  let service: PlatformSettingsService;

  beforeEach(() => {
    prisma = {
      platformSetting: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
      user: { findUnique: jest.fn() },
    };
    service = new PlatformSettingsService(prisma, {
      log: jest.fn().mockResolvedValue(undefined),
    });
  });

  it('no deja activarlo a quien no tiene 2FA (se quedaría fuera)', async () => {
    prisma.user.findUnique.mockResolvedValue({ twoFactorEnabled: false });
    await expect(
      service.set('security.staffTwoFactorRequired', true, 'root-1')
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.platformSetting.upsert).not.toHaveBeenCalled();
  });

  it('lo activa quien ya tiene 2FA y el cambio se ve de inmediato', async () => {
    prisma.user.findUnique.mockResolvedValue({ twoFactorEnabled: true });
    prisma.platformSetting.findUnique.mockResolvedValue(null);
    expect(await service.isStaffTwoFactorRequired()).toBe(false);

    await service.set('security.staffTwoFactorRequired', true, 'root-1');
    prisma.platformSetting.findUnique.mockResolvedValue({ value: true });

    expect(await service.isStaffTwoFactorRequired()).toBe(true);
  });

  it('apagarlo no exige 2FA', async () => {
    await service.set('security.staffTwoFactorRequired', false, 'root-1');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.platformSetting.upsert).toHaveBeenCalled();
  });
});
