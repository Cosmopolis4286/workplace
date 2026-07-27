import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ACCOUNT_TYPE_KEY } from '../decorators/require-account-type.decorator';
import { AccountTypeResolver } from '../account-type/account-type.resolver';

const MESSAGE_BY_ACCOUNT_TYPE: Record<'COMMERCE' | 'FREELANCER', string> = {
  COMMERCE: 'Este módulo no está disponible para proveedores de servicios',
  FREELANCER: 'Este módulo no está disponible para comercios',
};

@Injectable()
export class AccountTypeGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private accountTypeResolver: AccountTypeResolver
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<'COMMERCE' | 'FREELANCER'>(
      ACCOUNT_TYPE_KEY,
      [context.getHandler(), context.getClass()]
    );

    // No @RequireAccountType() → skip this guard
    if (!required) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    // SUPERADMIN/ADMIN gestionan ambos tipos de cuenta por igual.
    if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') return true;

    const accountType = await this.accountTypeResolver.resolve(user.id);
    if (accountType !== required) {
      throw new ForbiddenException(MESSAGE_BY_ACCOUNT_TYPE[required]);
    }
    return true;
  }
}
