import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PermissionsController } from '../../domains/identity-access/permissions/permissions.controller';
import { PermissionsService } from '../../domains/identity-access/permissions/permissions.service';

describe('PermissionsController role hierarchy', () => {
  const permissionsService = {
    togglePermission: jest.fn(),
    createPermission: jest.fn(),
    bulkUpdate: jest.fn(),
  };
  let controller: PermissionsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PermissionsController(
      permissionsService as unknown as PermissionsService
    );
  });

  it('prevents ADMIN from changing its own role permissions', async () => {
    await expect(
      controller.toggle(
        { role: Role.ADMIN, permissionId: 'permission-1', granted: true },
        { id: 'admin-1', role: Role.ADMIN }
      )
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(permissionsService.togglePermission).not.toHaveBeenCalled();
  });

  it('allows ADMIN to change a lower-privilege role', async () => {
    permissionsService.togglePermission.mockResolvedValue({ success: true });

    await expect(
      controller.toggle(
        { role: Role.PROFESIONAL, permissionId: 'permission-1', granted: true },
        { id: 'admin-1', role: Role.ADMIN }
      )
    ).resolves.toEqual({ success: true });

    expect(permissionsService.togglePermission).toHaveBeenCalledWith(
      Role.PROFESIONAL,
      'permission-1',
      true,
      'admin-1'
    );
  });

  it('prevents ADMIN from granting a new permission to ADMIN', () => {
    expect(() =>
      controller.create(
        {
          key: 'reports:export',
          module: 'reports',
          action: 'export',
          label: 'Exportar reportes',
          grantedRoles: [Role.ADMIN],
        } as any,
        { id: 'admin-1', role: Role.ADMIN }
      )
    ).toThrow(ForbiddenException);

    expect(permissionsService.createPermission).not.toHaveBeenCalled();
  });

  it('rejects an entire bulk update if ADMIN targets its own role', async () => {
    await expect(
      controller.bulkUpdate(
        {
          updates: [
            {
              role: Role.PROFESIONAL,
              permissionId: 'permission-1',
              granted: true,
            },
            {
              role: Role.ADMIN,
              permissionId: 'permission-2',
              granted: true,
            },
          ],
        },
        { id: 'admin-1', role: Role.ADMIN }
      )
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(permissionsService.bulkUpdate).not.toHaveBeenCalled();
  });
});
