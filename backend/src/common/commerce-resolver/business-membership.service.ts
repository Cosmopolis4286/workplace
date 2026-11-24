import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  BusinessMembershipRole,
  BusinessMembershipStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type BusinessAccessContext = {
  commerceId: string;
  userId: string;
  role: 'OWNER' | BusinessMembershipRole;
  membershipId: string | null;
  isOwner: boolean;
};

@Injectable()
export class BusinessMembershipService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifica si el usuario es propietario canónico o miembro ACTIVE del
   * comercio solicitado. El ID del comercio nunca concede acceso por sí solo.
   *
   * Este resolver es una primitiva de autorización; todavía no se conecta a
   * CommerceResolverService ni habilita rutas operativas. Esa integración
   * requiere contexto seleccionado, permisos por membresía y filtros IDOR.
   */
  async resolve(
    userId: string,
    commerceId: string
  ): Promise<BusinessAccessContext> {
    const ownedCommerce = await this.prisma.commerce.findFirst({
      where: { id: commerceId, userId },
      select: { id: true },
    });

    if (ownedCommerce) {
      return {
        commerceId,
        userId,
        role: 'OWNER',
        membershipId: null,
        isOwner: true,
      };
    }

    const membership = await this.prisma.businessMembership.findUnique({
      where: { commerceId_userId: { commerceId, userId } },
      select: { id: true, role: true, status: true },
    });

    if (!membership || membership.status !== BusinessMembershipStatus.ACTIVE) {
      throw new ForbiddenException('No tienes acceso a este comercio');
    }

    return {
      commerceId,
      userId,
      role: membership.role,
      membershipId: membership.id,
      isOwner: false,
    };
  }
}
