import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProfileType, Role } from '@prisma/client';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { PROFILE_CONTEXT_KEY } from '../decorators/require-profile-context.decorator';
import { PermissionsService } from '../../domains/identity-access/permissions/permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @RequirePermission() → skip this guard
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const { user, profileContext } = request;
    const profileTypes = this.reflector.getAllAndOverride<ProfileType[]>(
      PROFILE_CONTEXT_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (!user) return false;
    if (profileTypes?.length && !profileContext?.id) {
      throw new ForbiddenException('No se resolvió un perfil compatible');
    }

    // SUPERADMIN siempre tiene acceso
    if (user.role === Role.SUPERADMIN) return true;

    // Combina permiso de ROL + override individual del usuario (UserPermission).
    // Antes solo miraba el rol, así que un permiso denegado a nivel individual
    // no bloqueaba el endpoint aunque el rol lo permitiera.
    const has = await this.permissionsService.hasEffectivePermission(
      user.id,
      user.role,
      required,
      profileContext?.id
    );
    if (!has) {
      throw new ForbiddenException(`No tienes permiso para: ${required}`);
    }
    return true;
  }
}
