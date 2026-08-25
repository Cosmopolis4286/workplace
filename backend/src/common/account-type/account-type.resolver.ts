import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RoleResolverService } from './role-resolver.service';

export type ResolvedAccountType = 'COMMERCE' | 'FREELANCER' | null;

/**
 * Única fuente de lectura para "¿qué tipo de cuenta de negocio es este
 * usuario?". Orden de resolución: (1) `UserProfile` ACTIVE de tipo BUSINESS
 * o PROFESSIONAL — la fuente de verdad real (ver WORKPLACE_VISION.md,
 * modelo de perfiles múltiples), (2) `User.role`, fallback para usuarios
 * legacy que nunca tuvieron un `UserProfile` creado (`role` ya queda
 * sincronizado con los perfiles activos por RoleResolverService.
 * syncRoleForUser en cada aprobación, así que este fallback nunca queda
 * obsoleto para cuentas que sí pasaron por el flujo de perfiles). No
 * reemplaza RBAC: `role` sigue siendo la fuente de verdad para
 * SUPERADMIN/ADMIN/NORMAL y permisos.
 *
 * `User.accountType` fue eliminado (2026-08-25): era un espejo redundante
 * de `role`/`UserProfile` (mismo par de valores COMMERCE/FREELANCER
 * modelado tres veces) que nadie leía directamente fuera de este resolver.
 *
 * Nota: esto devuelve un único tipo de cuenta "de negocio" por diseño del
 * contrato actual (llamadores existentes esperan COMMERCE|FREELANCER|null).
 * Un usuario puede tener varios `UserProfile` activos a la vez; si tiene
 * BUSINESS y PROFESSIONAL simultáneamente, BUSINESS gana acá — misma
 * prioridad que RoleResolverService.resolveFromProfiles(), reutilizada acá
 * en vez de reimplementada. Los llamadores que necesiten la lista completa
 * de perfiles deben consultar `UserProfile` directamente en vez de este
 * resolver.
 */
@Injectable()
export class AccountTypeResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleResolver: RoleResolverService,
  ) {}

  async resolve(userId: string): Promise<ResolvedAccountType> {
    const profiles = await this.prisma.userProfile.findMany({
      where: { userId, status: 'ACTIVE', type: { in: ['BUSINESS', 'PROFESSIONAL'] } },
      select: { type: true, subtype: true },
    });
    const fromProfiles = this.roleResolver.resolveFromProfiles(profiles);
    if (fromProfiles === 'COMMERCE' || fromProfiles === 'FREELANCER') return fromProfiles;

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) return null;
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
