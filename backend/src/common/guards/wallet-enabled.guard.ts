import { CanActivate, ForbiddenException, Injectable } from '@nestjs/common';
import { features } from '../config/features';

export const WALLET_DISABLED_MESSAGE =
  'La billetera no está disponible: los pagos se hacen directo entre usuarios';

/**
 * La billetera solo existe para el Pago Protegido (retener, liberar y
 * reembolsar garantías, y retirar lo liberado). Con el interruptor apagado
 * la plataforma no custodia fondos, así que todas sus rutas —de usuario y
 * de admin— quedan cerradas: nadie puede tener ni mover saldo.
 */
@Injectable()
export class WalletEnabledGuard implements CanActivate {
  canActivate(): boolean {
    if (!features.protectedPayments()) {
      throw new ForbiddenException({
        message: WALLET_DISABLED_MESSAGE,
        errorCode: 'WALLET_DISABLED',
      });
    }
    return true;
  }
}
