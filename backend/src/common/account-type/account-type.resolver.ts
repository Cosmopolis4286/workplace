import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type ResolvedAccountType = 'COMMERCE' | 'FREELANCER' | null;

/**
 * Única fuente de lectura para "¿qué tipo de cuenta de negocio es este
 * usuario?". Orden de resolución: (1) `UserProfile` ACTIVE de tipo BUSINESS
 * o PROFESSIONAL (ver WORKPLACE_VISION.md — modelo de perfiles múltiples),
 * (2) `User.accountType`, (3) `User.role`, para usuarios que aún no tienen
 * fila en `UserProfile` (no todos los backfills corren en todos los
 * ambientes). No reemplaza RBAC: `role` sigue siendo la fuente de verdad
 * para SUPERADMIN/ADMIN/NORMAL y permisos.
 *
 * Nota: esto devuelve un único tipo de cuenta "de negocio" por diseño del
 * contrato actual (llamadores existentes esperan COMMERCE|FREELANCER|null).
 * Un usuario puede tener varios `UserProfile` activos a la vez; si tiene
 * BUSINESS y PROFESSIONAL simultáneamente, BUSINESS gana acá. Los llamadores
 * que necesiten la lista completa de perfiles deben consultar `UserProfile`
 * directamente en vez de este resolver.
 */
@Injectable()
export class AccountTypeResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(userId: string): Promise<ResolvedAccountType> {
    const profiles = await this.prisma.userProfile.findMany({
      where: { userId, status: 'ACTIVE', type: { in: ['BUSINESS', 'PROFESSIONAL'] } },
      select: { type: true },
    });
    if (profiles.some((p) => p.type === 'BUSINESS')) return 'COMMERCE';
    if (profiles.some((p) => p.type === 'PROFESSIONAL')) return 'FREELANCER';

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { accountType: true, role: true },
    });
    if (!user) return null;
    if (user.accountType) return user.accountType;
    if (user.role === 'COMMERCE' || user.role === 'FREELANCER') return user.role;
    return null;
  }

  isFreelancer(accountType: ResolvedAccountType): boolean {
    return accountType === 'FREELANCER';
  }

  isCommerce(accountType: ResolvedAccountType): boolean {
    return accountType === 'COMMERCE';
  }
}
