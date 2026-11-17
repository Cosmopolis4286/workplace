import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { KycStatus, Role } from '@prisma/client';
import { KYC_POLICY_OPERATION } from '../decorators/require-kyc-operation.decorator';
import { KycPolicyService } from '../../domains/platform/platform-settings/kyc-policy.service';
import { KycPolicyOperation } from '../../domains/platform/platform-settings/platform-settings.service';

@Injectable()
export class KycApprovedGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly kycPolicy: KycPolicyService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Staff interno no opera como contraparte real de pagos — se conserva
    // la excepción existente para los endpoints administrativos.
    if (user?.role === Role.SUPERADMIN || user?.role === Role.ADMIN) {
      return true;
    }

    const operation = this.reflector.getAllAndOverride<KycPolicyOperation>(
      KYC_POLICY_OPERATION,
      [context.getHandler(), context.getClass()]
    );

    if (operation) {
      const result = await this.kycPolicy.evaluate(operation, {
        authenticated: Boolean(user?.id),
        // No inferir verificación telefónica desde User.phone.
        // No aceptar señales de revisión reforzada enviadas por el cliente.
        phoneVerified: false,
        kycStatus: user?.kycStatus,
      });

      if (!result.allowed) {
        throw new ForbiddenException(
          result.reason ??
            'No cumples los requisitos de identidad para esta operación.'
        );
      }

      return true;
    }

    // Compatibilidad: rutas aún no clasificadas conservan la guarda anterior.
    if (user?.kycStatus !== KycStatus.APPROVED) {
      throw new ForbiddenException(
        'Debes verificar tu identidad antes de realizar esta acción. Completa la verificación en tu perfil.'
      );
    }

    return true;
  }
}
