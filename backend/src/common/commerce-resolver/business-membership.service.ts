import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  BusinessMembershipRole,
  BusinessMembershipScope,
  BusinessMembershipStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type BusinessAccessContext = {
  commerceId: string;
  userId: string;
  role: 'OWNER' | BusinessMembershipRole;
  membershipId: string | null;
  // null = acceso a todas las sucursales; [] nunca se emite como acceso válido.
  branchIds: string[] | null;
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
        branchIds: null,
        isOwner: true,
      };
    }

    const membership = await this.prisma.businessMembership.findUnique({
      where: { commerceId_userId: { commerceId, userId } },
      include: { branchAssignments: { select: { branchId: true } } },
    });

    if (!membership || membership.status !== BusinessMembershipStatus.ACTIVE) {
      throw new ForbiddenException('No tienes acceso a este comercio');
    }

    const assignedBranchIds = membership.branchAssignments.map(
      (assignment) => assignment.branchId
    );

    if (
      membership.scope === BusinessMembershipScope.SELECTED_BRANCHES &&
      assignedBranchIds.length === 0
    ) {
      // Fail closed: una membresía limitada sin sucursales no obtiene acceso.
      throw new ForbiddenException('La membresía no tiene sucursales asignadas');
    }

    if (
      membership.scope === BusinessMembershipScope.COMMERCE &&
      assignedBranchIds.length > 0
    ) {
      // Inconsistencia de datos: no ampliar permisos por una asignación inesperada.
      throw new ForbiddenException('El alcance de la membresía es inconsistente');
    }

    return {
      commerceId,
      userId,
      role: membership.role,
      membershipId: membership.id,
      branchIds:
        membership.scope === BusinessMembershipScope.COMMERCE
          ? null
          : assignedBranchIds,
      isOwner: false,
    };
  }

  assertBranchAccess(
    context: BusinessAccessContext,
    branchId: string
  ): void {
    if (context.branchIds && !context.branchIds.includes(branchId)) {
      throw new ForbiddenException('No tienes acceso a esta sucursal');
    }
  }
}
