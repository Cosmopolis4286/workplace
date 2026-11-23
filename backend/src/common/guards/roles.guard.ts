import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PlatformSettingsService } from '../../domains/platform/platform-settings/platform-settings.service';

export const STAFF_2FA_REQUIRED_MESSAGE =
  'Activa la verificación en dos pasos (2FA) en Configuración para usar el panel de administración';

const STAFF_ROLES: Role[] = [Role.SUPERADMIN, Role.ADMIN];

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    // Opcional: los tests y módulos que no lo tienen siguen funcionando, solo
    // sin la exigencia de 2FA al equipo.
    @Optional() private readonly settings?: PlatformSettingsService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!requiredRoles.includes(user?.role)) return false;

    // Rutas solo de administración: si la plataforma exige 2FA al equipo,
    // un ADMIN/SUPERADMIN sin 2FA no entra hasta activarlo. Las rutas para
    // activarlo (/auth/2fa/*) no pasan por aquí.
    const staffOnly = requiredRoles.every((role) => STAFF_ROLES.includes(role));
    if (
      staffOnly &&
      !user?.twoFactorEnabled &&
      this.settings &&
      (await this.settings.isStaffTwoFactorRequired())
    ) {
      throw new ForbiddenException({
        message: STAFF_2FA_REQUIRED_MESSAGE,
        errorCode: 'STAFF_2FA_REQUIRED',
      });
    }

    return true;
  }
}
