import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (!user?.emailVerified) {
      throw new ForbiddenException(
        'Debes verificar tu correo electrónico para realizar esta acción'
      );
    }

    return true;
  }
}
