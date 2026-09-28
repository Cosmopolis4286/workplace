import { Injectable } from '@nestjs/common';
import { ProfileStatus, ProfileType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Prerrequisitos operativos: hechos sobre los DATOS del usuario, no política
 * de negocio. La política ("¿este papel puede hacer X?") vive en la matriz de
 * permisos (RolePermission base + ProfilePermission por perfil) y el techo
 * de rubro/plan en ModuleAccessGuard. Esto responde otra pregunta: ¿existe lo
 * que la operación necesita para ejecutarse?
 *
 * - HAS_COMMERCE: el usuario tiene un Commerce (Order/Customer/Delivery/
 *   Product/... tienen FK obligatoria a Commerce). Con la "opción 2"
 *   (2026-09-28) no implica perfil BUSINESS: un PROFESSIONAL que vende
 *   producto también tiene Commerce.
 * - HAS_PROFESSIONAL_PROFILE / HAS_BUSINESS_PROFILE: tiene ese UserProfile
 *   ACTIVE. A diferencia de AccountTypeResolver (que colapsa a UN tipo y hace
 *   ganar a BUSINESS), acá cada perfil se evalúa por separado — un usuario
 *   con BUSINESS + PROFESSIONAL tiene ambas capacidades.
 *
 * Derivado en caliente, sin tabla propia (ver IDENTITY_ARCHITECTURE_PLAN.md
 * §3): solo se promueve a persistencia si una capacidad necesita estado
 * propio (ej. suspensión temporal).
 */
export const CAPABILITIES = ['HAS_COMMERCE', 'HAS_PROFESSIONAL_PROFILE', 'HAS_BUSINESS_PROFILE'] as const;
export type Capability = (typeof CAPABILITIES)[number];
export type CapabilityMap = Record<Capability, boolean>;

@Injectable()
export class CapabilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(userId: string): Promise<CapabilityMap> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        commerce: { select: { id: true } },
        profiles: { where: { status: ProfileStatus.ACTIVE }, select: { type: true } },
      },
    });
    const types = new Set(user?.profiles.map((p) => p.type) ?? []);
    return {
      HAS_COMMERCE: !!user?.commerce,
      HAS_PROFESSIONAL_PROFILE: types.has(ProfileType.PROFESSIONAL),
      HAS_BUSINESS_PROFILE: types.has(ProfileType.BUSINESS),
    };
  }

  async has(userId: string, capability: Capability): Promise<boolean> {
    return (await this.resolve(userId))[capability];
  }
}
