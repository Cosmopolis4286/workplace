import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, ProfileType, ProfessionalSubtype, ProfileStatus, Prisma } from '@prisma/client';

type PrismaClientOrTx = PrismaService | Prisma.TransactionClient;

/**
 * Única fuente de verdad para "qué User.role le corresponde a un usuario
 * según sus UserProfile ACTIVE" — reemplaza la lógica ad-hoc que existía
 * duplicada en ProfileActivationsService.review() (solo cubría
 * PROFESSIONAL/FREELANCER) y FreelancerApplicationsService.review().
 *
 * SUPERADMIN/ADMIN quedan FUERA de este resolver a propósito: no son
 * perfiles de negocio, son niveles de acceso administrativo asignados
 * manualmente (alta de usuario, no UserProfile). Este resolver nunca debe
 * devolver esos dos valores ni sobrescribir el role de un admin — ver
 * syncRoleForUser(), que se salta usuarios ADMIN/SUPERADMIN.
 *
 * Prioridad cuando hay varios perfiles ACTIVE simultáneos (un usuario con
 * BUSINESS + PROFESSIONAL activos a la vez): BUSINESS > PROFESSIONAL >
 * JOB_SEEKER/CUSTOMER. Esto decide únicamente el valor ESCALAR de
 * User.role (que guards como RolesGuard todavía necesitan) — los PERMISOS
 * reales ya no dependen de esta prioridad: PermissionsService.
 * hasEffectivePermission une los permisos de TODOS los perfiles activos,
 * no solo el que gana acá (ver [[profile-permissions]]).
 */
@Injectable()
export class RoleResolverService {
  constructor(private readonly prisma: PrismaService) {}

  /** Calcula el Role que le correspondería a un usuario dado un conjunto de perfiles ACTIVE. */
  resolveFromProfiles(profiles: Array<{ type: ProfileType; subtype: ProfessionalSubtype | null }>): Role | null {
    if (profiles.some((p) => p.type === ProfileType.BUSINESS)) return Role.COMMERCE;
    if (profiles.some((p) => p.type === ProfileType.PROFESSIONAL)) return Role.FREELANCER;
    return null;
  }

  /**
   * Recalcula y persiste User.role para un usuario a partir de sus
   * UserProfile ACTIVE actuales. No toca SUPERADMIN/ADMIN. Si ningún
   * perfil de negocio está activo, el usuario cae a NORMAL — salvo que ya
   * fuera COMMERCE/FREELANCER por un camino legado que nunca creó un
   * UserProfile (alta directa de admin, datos previos a este modelo), en
   * cuyo caso no degradamos (evita romper cuentas que nunca pasaron por
   * UserProfile).
   *
   * Debe llamarse dentro de la misma transacción que actualiza el
   * UserProfile.status (ver ProfileActivationsService.review() /
   * FreelancerApplicationsService.review()), pasando un cliente Prisma
   * transaccional si aplica.
   */
  async syncRoleForUser(userId: string, tx: PrismaClientOrTx = this.prisma): Promise<Role | null> {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) return null;
    if (user.role === Role.SUPERADMIN || user.role === Role.ADMIN) return user.role;

    const activeProfiles = await tx.userProfile.findMany({
      where: { userId, status: ProfileStatus.ACTIVE, type: { in: [ProfileType.BUSINESS, ProfileType.PROFESSIONAL] } },
      select: { type: true, subtype: true },
    });

    const resolved = this.resolveFromProfiles(activeProfiles);
    // Sin ningún UserProfile de negocio activo: si el usuario ya tenía
    // COMMERCE/FREELANCER por el camino legado (nunca migró a UserProfile),
    // no lo degradamos a NORMAL — este resolver solo actúa quien SÍ pasó
    // por el flujo de perfiles.
    const hasAnyBusinessProfile = await tx.userProfile.count({
      where: { userId, type: { in: [ProfileType.BUSINESS, ProfileType.PROFESSIONAL] } },
    });
    const newRole = resolved ?? (hasAnyBusinessProfile > 0 ? Role.NORMAL : user.role);

    if (newRole === user.role) return newRole;

    await tx.user.update({ where: { id: userId }, data: { role: newRole } });
    return newRole;
  }
}
