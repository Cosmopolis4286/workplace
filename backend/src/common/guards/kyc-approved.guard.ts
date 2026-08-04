import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { KycStatus, Role } from '@prisma/client';

@Injectable()
export class KycApprovedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    // Staff interno no opera como contraparte real de pagos — exento.
    if (user?.role === Role.SUPERADMIN || user?.role === Role.ADMIN) return true;

    if (user?.kycStatus !== KycStatus.APPROVED) {
      throw new ForbiddenException(
        'Debes verificar tu identidad antes de realizar esta acción. Completa la verificación en tu perfil.'
      );
    }

    return true;
  }
}
