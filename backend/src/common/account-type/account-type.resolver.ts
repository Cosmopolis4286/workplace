import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfileType, ProfileStatus, UserProfile } from '@prisma/client';

export type ResolvedAccountType = 'COMMERCE' | 'FREELANCER' | null;

export interface ResolvedAccountDetails {
  accountType: ResolvedAccountType;
  /** Todos los UserProfile ACTIVE del usuario, de cualquier tipo (incluye CUSTOMER/JOB_SEEKER, no solo BUSINESS/PROFESSIONAL). */
  activeProfiles: UserProfile[];
}

/**
 * Única fuente de lectura para "¿qué tipo de cuenta de negocio es este
 * usuario?" — distingue COMMERCE (tiene un Commerce físico, UserProfile.
 * type=BUSINESS) de FREELANCER (profesional independiente, UserProfile.
 * type=PROFESSIONAL). Lee `UserProfile` directamente, no `User.role`:
 * desde que Role.COMMERCE/FREELANCER se fusionaron en Role.PROFESIONAL
 * (2026-08-25), `role` ya NO distingue esos dos casos — solo dice "opera
 * algún perfil de negocio". `UserProfile` es la única fuente que conserva
 * la distinción fina. `role` sigue siendo la fuente de verdad para
 * SUPERADMIN/ADMIN/NORMAL y RBAC de acceso, no para esto.
 *
 * `User.accountType` fue eliminado (2026-08-25): era un espejo redundante.
 *
 * Nota: esto devuelve un único tipo de cuenta "de negocio" por diseño del
 * contrato actual (llamadores existentes esperan COMMERCE|FREELANCER|null).
 * Un usuario puede tener varios `UserProfile` activos a la vez; si tiene
 * BUSINESS y PROFESSIONAL simultáneamente, BUSINESS gana acá (misma
 * prioridad histórica). Los llamadores que necesiten la lista completa de
 * perfiles deben consultar `UserProfile` directamente en vez de este
 * resolver.
 */
@Injectable()
export class AccountTypeResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(userId: string): Promise<ResolvedAccountType> {
    const profiles = await this.prisma.userProfile.findMany({
      where: { userId, status: ProfileStatus.ACTIVE, type: { in: [ProfileType.BUSINESS, ProfileType.PROFESSIONAL] } },
      select: { type: true },
    });
    return this.accountTypeFromProfileTypes(profiles.map((p) => p.type));
  }

  /**
   * Igual que `resolve()`, pero en una sola consulta trae además TODOS los
   * UserProfile ACTIVE del usuario (incluye CUSTOMER/JOB_SEEKER) — para que
   * llamadores que necesiten ambos (ej. `/auth/me`) no dupliquen la query.
   */
  async resolveDetailed(userId: string): Promise<ResolvedAccountDetails> {
    const activeProfiles = await this.prisma.userProfile.findMany({
      where: { userId, status: ProfileStatus.ACTIVE },
    });
    const businessTypes = activeProfiles
      .filter((p) => p.type === ProfileType.BUSINESS || p.type === ProfileType.PROFESSIONAL)
      .map((p) => p.type);
    return { accountType: this.accountTypeFromProfileTypes(businessTypes), activeProfiles };
  }

  private accountTypeFromProfileTypes(types: ProfileType[]): ResolvedAccountType {
    if (types.includes(ProfileType.BUSINESS)) return 'COMMERCE';
    if (types.includes(ProfileType.PROFESSIONAL)) return 'FREELANCER';
    return null;
  }

  isFreelancer(accountType: ResolvedAccountType): boolean {
    return accountType === 'FREELANCER';
  }

  isCommerce(accountType: ResolvedAccountType): boolean {
    return accountType === 'COMMERCE';
  }
}
