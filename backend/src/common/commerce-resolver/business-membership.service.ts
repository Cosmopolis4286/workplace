import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  BusinessMembershipRole,
  BusinessMembershipStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type BusinessAccessContext = {
  commerceId: string;
  ownerUserId: string;
  userId: string;
  role: 'OWNER' | BusinessMembershipRole;
  membershipId: string | null;
  isOwner: boolean;
};

@Injectable()
export class BusinessMembershipService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resuelve acceso a un comercio solicitado. El commerceId nunca concede
   * acceso por sí solo: se valida contra el propietario canónico o una
   * membresía ACTIVE del mismo comercio.
   */
  async resolve(
    userId: string,
    commerceId: string
  ): Promise<BusinessAccessContext> {
    const commerce = await this.prisma.commerce.findUnique({
      where: { id: commerceId },
      select: { id: true, userId: true },
    });

    if (!commerce) {
      throw new ForbiddenException('No tienes acceso a este comercio');
    }

    if (commerce.userId === userId) {
      return {
        commerceId,
        ownerUserId: commerce.userId,
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
      ownerUserId: commerce.userId,
      userId,
      role: membership.role,
      membershipId: membership.id,
      isOwner: false,
    };
  }
}
