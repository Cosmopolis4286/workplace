import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProfileStatus, ProfileType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PROFILE_CONTEXT_KEY } from '../decorators/require-profile-context.decorator';

@Injectable()
export class ProfileContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredTypes = this.reflector.getAllAndOverride<ProfileType[]>(
      PROFILE_CONTEXT_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (!requiredTypes?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.id) return false;

    // activeProfileId se lee de PostgreSQL, nunca del body/header/query.
    const account = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { activeProfileId: true },
    });
    if (!account) throw new ForbiddenException('Cuenta no disponible');

    const profiles = await this.prisma.userProfile.findMany({
      where: {
        userId: user.id,
        status: ProfileStatus.ACTIVE,
        type: { in: requiredTypes },
      },
      select: { id: true, type: true, subtype: true },
    });

    if (profiles.length === 0) {
      throw new ForbiddenException(
        'No tienes un perfil activo compatible con esta operación'
      );
    }

    const selected = account.activeProfileId
      ? profiles.find((profile) => profile.id === account.activeProfileId)
      : profiles.length === 1
        ? profiles[0]
        : undefined;

    if (!selected) {
      throw new ConflictException(
        'Selecciona un perfil compatible antes de realizar esta operación'
      );
    }

    request.profileContext = selected;
    return true;
  }
}
