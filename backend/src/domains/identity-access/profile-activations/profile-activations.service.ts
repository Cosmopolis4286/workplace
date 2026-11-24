import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BillingInterval,
  KycStatus,
  Prisma,
  ProfileDeactivationReason,
  ProfileStatus,
  ProfileType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { userFindByIdCacheKey } from '../../../common/utils/cache-keys.util';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { RoleResolverService } from '../../../common/account-type/role-resolver.service';
import { PLANS_FACADE, PlansFacade } from '../../money/plans/plans.facade';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';
import { CreateProfileActivationDto } from './dto/create-profile-activation.dto';
import { ReviewProfileActivationDto } from './dto/review-profile-activation.dto';
import { DeactivateProfileDto } from './dto/deactivate-profile.dto';

// Tipos que requieren revisión de un admin antes de quedar ACTIVE (mismo
// criterio que aplicaba FreelancerApplication: ejercen una actividad de
// negocio dentro del ecosistema). CUSTOMER y JOB_SEEKER se activan solo.
const REQUIRES_APPROVAL: ProfileType[] = [
  ProfileType.PROFESSIONAL,
  ProfileType.BUSINESS,
];

const TYPE_LABEL: Record<ProfileType, string> = {
  CUSTOMER: 'Cliente',
  PROFESSIONAL: 'Profesional',
  JOB_SEEKER: 'Candidato de empleo',
  BUSINESS: 'Negocio',
};

// Motivos para desactivar un perfil, en el orden en que se muestran. Única
// fuente de las etiquetas: el frontend las pide a GET deactivation-reasons.
export const DEACTIVATION_REASONS: {
  value: ProfileDeactivationReason;
  label: string;
}[] = [
  { value: 'NOT_USING', label: 'Ya no lo uso' },
  { value: 'TEMPORARY_PAUSE', label: 'Pausa temporal (vacaciones, salud...)' },
  { value: 'SWITCHING_PROFILE', label: 'Me cambio a otro tipo de perfil' },
  { value: 'LOW_DEMAND', label: 'No recibo suficientes clientes' },
  {
    value: 'TOO_EXPENSIVE',
    label: 'Las comisiones o el plan me resultan caros',
  },
  { value: 'PLATFORM_ISSUES', label: 'Problemas con la app' },
  { value: 'PRIVACY', label: 'Prefiero no mostrar mi actividad' },
  { value: 'OTHER', label: 'Otro motivo' },
];

// Trabajo con clientes que impide desactivar un perfil de negocio: dejarlos
// a medias perjudica al cliente (y la reputación del perfil).
const OPEN_SERVICE_REQUEST = ['PENDING', 'SEEN', 'CONTACTED'] as const;
const OPEN_CATALOG_ORDER = ['PENDING', 'SEEN', 'CONTACTED'] as const;

@Injectable()
export class ProfileActivationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
    private readonly roleResolver: RoleResolverService,
    @Inject(PLANS_FACADE) private readonly plansService: PlansFacade,
    private readonly commerceResolver: CommerceResolverService
  ) {}

  /**
   * El perfil Cliente siempre está activo: todo usuario puede comprar. Se
   * crea si falta (idempotente). La migración ya lo creó para los usuarios
   * existentes y UsersService.create lo crea al registrarse; esto cubre
   * cualquier otro camino de alta.
   */
  async ensureCustomerProfile(
    userId: string,
    db: Prisma.TransactionClient | PrismaService = this.prisma
  ) {
    const existing = await db.userProfile.findFirst({
      where: {
        userId,
        type: ProfileType.CUSTOMER,
        status: ProfileStatus.ACTIVE,
      },
    });
    if (existing) return existing;
    try {
      return await db.userProfile.create({
        data: {
          userId,
          type: ProfileType.CUSTOMER,
          status: ProfileStatus.ACTIVE,
        },
      });
    } catch (error) {
      // A concurrent request may have inserted the CUSTOMER profile after
      // our read. The partial unique index is authoritative; make this
      // ensure operation idempotent for the losing request.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const created = await db.userProfile.findFirst({
          where: {
            userId,
            type: ProfileType.CUSTOMER,
            status: ProfileStatus.ACTIVE,
          },
        });
        if (created) return created;
      }
      throw error;
    }
  }

  getDeactivationReasons() {
    return DEACTIVATION_REASONS;
  }

  /**
   * Qué impide desactivar este perfil ahora. Vacío = se puede. El frontend
   * lo muestra antes de pedir confirmación; deactivate() lo vuelve a exigir.
   */
  async deactivationBlockers(userId: string, profileId: string) {
    const profile = await this.findOwnActive(userId, profileId);
    return this.blockersFor(userId, profile.type);
  }

  private async blockersFor(userId: string, type: ProfileType) {
    const blockers: string[] = [];
    if (type === ProfileType.CUSTOMER) {
      blockers.push(
        'El perfil Cliente siempre está activo: todos pueden comprar en WorkPlace.'
      );
      return blockers;
    }
    if (type !== ProfileType.PROFESSIONAL && type !== ProfileType.BUSINESS) {
      return blockers;
    }

    const commerce = await this.prisma.commerce.findUnique({
      where: { userId },
      select: { id: true },
    });
    const [openRequests, openOrders] = await Promise.all([
      this.prisma.serviceRequest.count({
        where: {
          providerId: userId,
          status: { in: [...OPEN_SERVICE_REQUEST] },
        },
      }),
      commerce
        ? this.prisma.catalogOrder.count({
            where: {
              commerceId: commerce.id,
              status: { in: [...OPEN_CATALOG_ORDER] },
            },
          })
        : Promise.resolve(0),
    ]);
    if (openRequests > 0) {
      blockers.push(
        `Tienes ${openRequests} solicitud(es) de servicio en curso. Termínalas o recházalas antes de desactivar.`
      );
    }
    if (openOrders > 0) {
      blockers.push(
        `Tienes ${openOrders} pedido(s) del catálogo sin cerrar. Atiéndelos o cancélalos antes de desactivar.`
      );
    }
    return blockers;
  }

  private async findOwnActive(userId: string, profileId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { id: profileId },
    });
    if (!profile || profile.userId !== userId) {
      throw new NotFoundException('Perfil no encontrado');
    }
    if (profile.status !== ProfileStatus.ACTIVE) {
      throw new BadRequestException(
        'Solo se puede desactivar un perfil que está ACTIVE'
      );
    }
    return profile;
  }

  async getMine(userId: string) {
    await this.ensureCustomerProfile(userId);
    return this.prisma.userProfile.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true, icon: true } },
        subcategory: { select: { id: true, name: true } },
        pendingPlan: {
          select: { id: true, name: true, price: true, color: true },
        },
      },
    });
  }

  async create(userId: string, dto: CreateProfileActivationDto) {
    // Cliente no se solicita: siempre está activo.
    if (dto.type === ProfileType.CUSTOMER) {
      return this.ensureCustomerProfile(userId);
    }

    const existing = await this.prisma.userProfile.findFirst({
      where: {
        userId,
        type: dto.type,
        status: { in: [ProfileStatus.PENDING, ProfileStatus.ACTIVE] },
      },
    });
    if (existing) {
      throw new ConflictException(
        existing.status === ProfileStatus.PENDING
          ? 'Ya tienes una solicitud de este perfil en revisión'
          : 'Ya tienes este perfil activo'
      );
    }

    // PROFESSIONAL y BUSINESS son mutuamente excluyentes — un usuario opera
    // como freelancer/proveedor de servicios O como negocio, no ambos a la
    // vez (decisión de producto explícita, no técnica: evita mezclar planes,
    // KYC de negocio y la semántica de "mi rol" en el resto de la app).
    // CUSTOMER y JOB_SEEKER no entran en esta exclusión.
    if (REQUIRES_APPROVAL.includes(dto.type)) {
      const otherType =
        dto.type === ProfileType.BUSINESS
          ? ProfileType.PROFESSIONAL
          : ProfileType.BUSINESS;
      const conflicting = await this.prisma.userProfile.findFirst({
        where: {
          userId,
          type: otherType,
          status: { in: [ProfileStatus.PENDING, ProfileStatus.ACTIVE] },
        },
      });
      if (conflicting) {
        throw new ConflictException(
          `Ya tienes un perfil de ${TYPE_LABEL[otherType]} ${conflicting.status === ProfileStatus.PENDING ? 'en revisión' : 'activo'}. Desactívalo antes de solicitar ${TYPE_LABEL[dto.type]}.`
        );
      }
    }

    if (dto.categoryId) {
      const category = await this.prisma.userCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) throw new BadRequestException('Categoría inválida');

      if (dto.subcategoryId) {
        const subcategory = await this.prisma.userSubcategory.findUnique({
          where: { id: dto.subcategoryId },
        });
        if (!subcategory || subcategory.categoryId !== dto.categoryId) {
          throw new BadRequestException('Subcategoría inválida');
        }
      }
    }

    // planId solo tiene sentido para tipos con aprobación (PROFESSIONAL/
    // BUSINESS) — CUSTOMER/JOB_SEEKER no tienen plan de negocio asociado.
    if (dto.planId) {
      if (!REQUIRES_APPROVAL.includes(dto.type)) {
        throw new BadRequestException(
          'planId solo aplica a perfiles Profesional o Negocio'
        );
      }
      const plan = await this.prisma.plan.findUnique({
        where: { id: dto.planId },
      });
      if (!plan) throw new BadRequestException('Plan inválido');
      const compatible =
        dto.type === ProfileType.BUSINESS
          ? plan.forCommerce
          : plan.forFreelancer;
      if (!compatible)
        throw new BadRequestException(
          'El plan seleccionado no corresponde a este tipo de perfil'
        );
    }

    const needsApproval = REQUIRES_APPROVAL.includes(dto.type);

    try {
      return await this.prisma.userProfile.create({
        data: {
          userId,
          type: dto.type,
          subtype: dto.subtype,
          categoryId: dto.categoryId,
          subcategoryId: dto.subcategoryId,
          pendingCommerceName:
            dto.type === ProfileType.BUSINESS ? dto.commerceName : undefined,
          pendingPlanId: dto.planId,
          pendingPlanInterval: dto.planId
            ? (dto.planInterval ?? BillingInterval.MONTHLY)
            : undefined,
          status: needsApproval ? ProfileStatus.PENDING : ProfileStatus.ACTIVE,
        },
      });
    } catch (error) {
      // The pre-checks above improve the error message in the normal path,
      // but only PostgreSQL can close the race between two concurrent
      // requests (including BUSINESS vs PROFESSIONAL). Translate that
      // database conflict into the API's established 409 contract.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe un perfil o una solicitud incompatible. Actualiza tus perfiles e inténtalo de nuevo.'
        );
      }
      throw error;
    }
  }

  // Fija User.activeProfileId — contexto de UX ("estoy usando WorkPlace
  // como..."), puramente presentacional. NO toca permisos ni capacidades:
  // esas siguen siendo la unión de TODOS los UserProfile ACTIVE del
  // usuario, no solo el activo (ver IDENTITY_ARCHITECTURE_PLAN.md, sección
  // "activeProfile"). El perfil debe pertenecer al usuario y estar ACTIVE
  // — no tiene sentido "activar" un perfil PENDING/REJECTED/SUSPENDED.
  async setActive(userId: string, profileId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { id: profileId },
    });
    if (!profile || profile.userId !== userId) {
      throw new NotFoundException('Perfil no encontrado');
    }
    if (profile.status !== ProfileStatus.ACTIVE) {
      throw new BadRequestException(
        'Solo se puede activar un perfil que ya está ACTIVE'
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { activeProfileId: profileId },
    });
    await this.redis.del(userFindByIdCacheKey(userId));

    return profile;
  }

  // Desactivación por el propio usuario — mismo efecto que
  // UsersService.applyBusinessProfileType(null) (el camino admin), pero
  // disparado por el dueño del perfil desde /profile. Se conserva la fila
  // (histórico de categoría/reviewedBy) como SUSPENDED, nunca se borra.
  // Solo PENDING/REJECTED no tiene sentido "desactivar" — ya no está ACTIVE.
  async deactivate(
    userId: string,
    profileId: string,
    dto: DeactivateProfileDto
  ) {
    const profile = await this.findOwnActive(userId, profileId);

    const note = dto.note?.trim() || null;
    if (dto.reason === ProfileDeactivationReason.OTHER && !note) {
      throw new BadRequestException(
        'Cuéntanos el motivo para desactivar el perfil'
      );
    }

    const blockers = await this.blockersFor(userId, profile.type);
    if (blockers.length > 0) {
      throw new ConflictException({
        message: blockers[0],
        errorCode: 'PROFILE_DEACTIVATION_BLOCKED',
        blockers,
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.userProfile.update({
        where: { id: profileId },
        data: {
          status: ProfileStatus.SUSPENDED,
          suspendedBySelf: true,
          deactivationReason: dto.reason,
          deactivationNote: note,
          deactivatedAt: new Date(),
        },
      });

      // Si era el perfil "activo" de contexto de UX, limpiarlo — no tiene
      // sentido dejar activeProfileId apuntando a un perfil SUSPENDED.
      await tx.user.updateMany({
        where: { id: userId, activeProfileId: profileId },
        data: { activeProfileId: null },
      });

      if (
        profile.type === ProfileType.BUSINESS ||
        profile.type === ProfileType.PROFESSIONAL
      ) {
        await this.roleResolver.syncRoleForUser(userId, tx);
      }

      return result;
    });

    await this.redis.del(userFindByIdCacheKey(userId));
    return updated;
  }

  // Reactivación directa (sin volver a pasar por aprobación) — solo cuando
  // el propio usuario fue quien lo desactivó (suspendedBySelf). Si un admin
  // lo suspendió, este método rechaza: debe solicitarse desde cero (mismo
  // criterio que REJECTED), para no poder evadir una suspensión disciplinaria
  // con un clic. Respeta la exclusión mutua PROFESSIONAL/BUSINESS igual que
  // create() — reactivar uno mientras el otro está ACTIVE/PENDING no aplica.
  async reactivate(userId: string, profileId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { id: profileId },
    });
    if (!profile || profile.userId !== userId) {
      throw new NotFoundException('Perfil no encontrado');
    }
    if (profile.status !== ProfileStatus.SUSPENDED) {
      throw new BadRequestException(
        'Solo se puede reactivar un perfil que está SUSPENDED'
      );
    }
    if (!profile.suspendedBySelf) {
      throw new BadRequestException(
        'Este perfil fue suspendido por un administrador — contacta a soporte para reactivarlo'
      );
    }

    if (REQUIRES_APPROVAL.includes(profile.type)) {
      const otherType =
        profile.type === ProfileType.BUSINESS
          ? ProfileType.PROFESSIONAL
          : ProfileType.BUSINESS;
      const conflicting = await this.prisma.userProfile.findFirst({
        where: {
          userId,
          type: otherType,
          status: { in: [ProfileStatus.PENDING, ProfileStatus.ACTIVE] },
        },
      });
      if (conflicting) {
        throw new ConflictException(
          `Ya tienes un perfil de ${TYPE_LABEL[otherType]} ${conflicting.status === ProfileStatus.PENDING ? 'en revisión' : 'activo'}. Desactívalo antes de reactivar ${TYPE_LABEL[profile.type]}.`
        );
      }
    }

    const updated = await this.prisma
      .$transaction(async (tx) => {
        const result = await tx.userProfile.update({
          where: { id: profileId },
          data: {
            status: ProfileStatus.ACTIVE,
            suspendedBySelf: false,
            deactivationReason: null,
            deactivationNote: null,
            deactivatedAt: null,
          },
        });

        if (
          profile.type === ProfileType.BUSINESS ||
          profile.type === ProfileType.PROFESSIONAL
        ) {
          await this.roleResolver.syncRoleForUser(userId, tx);
          // Un perfil aprobado antes de que existiera la provisión de Commerce
          // para PROFESSIONAL (o cuya categoría cambió mientras estaba
          // suspendido) lo recibe al reactivarse.
          await this.commerceResolver.ensureForUser(tx, userId);
        }

        return result;
      })
      .catch((error: unknown) => {
        // Reactivation competes with new applications too; the same partial
        // unique indexes protect this transition at the database boundary.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(
            'No se puede reactivar este perfil porque ya existe otro perfil o solicitud incompatible.'
          );
        }
        throw error;
      });

    await this.redis.del(userFindByIdCacheKey(userId));
    return updated;
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  async findAllPending(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.userProfile.findMany({
        where: { status: ProfileStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              kycStatus: true,
            },
          },
          category: { select: { id: true, name: true, icon: true } },
          subcategory: { select: { id: true, name: true } },
          pendingPlan: {
            select: { id: true, name: true, price: true, color: true },
          },
        },
      }),
      this.prisma.userProfile.count({
        where: { status: ProfileStatus.PENDING },
      }),
    ]);
    return { data, total, page, limit };
  }

  async review(
    id: string,
    reviewerId: string,
    dto: ReviewProfileActivationDto
  ) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { id },
      include: { user: { select: { kycStatus: true } } },
    });
    if (!profile)
      throw new NotFoundException('Solicitud de perfil no encontrada');
    if (profile.status !== ProfileStatus.PENDING) {
      throw new BadRequestException('Esta solicitud ya fue revisada');
    }
    if (profile.userId === reviewerId) {
      throw new ForbiddenException(
        'No puedes revisar tu propia solicitud de perfil'
      );
    }
    if (
      dto.status === ProfileStatus.ACTIVE &&
      profile.user.kycStatus !== KycStatus.APPROVED
    ) {
      throw new BadRequestException(
        'El solicitante debe tener su identidad verificada (KYC aprobado) antes de activar este perfil'
      );
    }

    const conflictingProfileWhere = {
      userId: profile.userId,
      id: { not: id },
      type: { in: [ProfileType.BUSINESS, ProfileType.PROFESSIONAL] },
      status: { in: [ProfileStatus.PENDING, ProfileStatus.ACTIVE] },
    };

    if (
      dto.status === ProfileStatus.ACTIVE &&
      REQUIRES_APPROVAL.includes(profile.type)
    ) {
      const conflicting = await this.prisma.userProfile.findFirst({
        where: conflictingProfileWhere,
      });
      if (conflicting) {
        throw new ConflictException(
          `Ya existe un perfil de ${TYPE_LABEL[conflicting.type]} ${conflicting.status === ProfileStatus.PENDING ? 'en revisión' : 'activo'}. Resuelve esa solicitud antes de activar este perfil.`
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Solo si sigue PENDING: si otro admin la revisó en paralelo, no se
      // aprueba dos veces (ni se activan plan/comercio dos veces).
      const claimed = await tx.userProfile.updateMany({
        where: { id, status: ProfileStatus.PENDING },
        data: {
          status: dto.status,
          rejectionReason:
            dto.status === ProfileStatus.REJECTED ? dto.rejectionReason : null,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
        },
      });
      if (claimed.count !== 1) {
        throw new ConflictException(
          'La solicitud fue revisada por otro administrador. Actualiza la bandeja.'
        );
      }
      const result = await tx.userProfile.findUniqueOrThrow({ where: { id } });

      // Mantiene User.categoryId/subcategoryId sincronizados, igual que
      // FreelancerApplication.review() — varios módulos existentes todavía
      // leen la categoría desde User, no desde UserProfile.
      if (dto.status === ProfileStatus.ACTIVE && profile.categoryId) {
        await tx.user.update({
          where: { id: profile.userId },
          data: {
            categoryId: profile.categoryId,
            subcategoryId: profile.subcategoryId,
          },
        });
      }

      // RoleResolverService recalcula User.role a partir de TODOS los
      // UserProfile ACTIVE (no solo este) — reemplaza el chequeo ad-hoc que
      // solo cubría PROFESSIONAL/FREELANCER; ahora también cubre BUSINESS y
      // PROFESSIONAL/SERVICE_PROVIDER. Sin esto, aprobar un perfil de
      // negocio deja al usuario con UserProfile ACTIVE pero sin el rol
      // real, y el resto de la app (guards, middleware del frontend) sigue
      // leyendo User.role — sería un callejón sin salida silencioso.
      if (
        profile.type === ProfileType.BUSINESS ||
        profile.type === ProfileType.PROFESSIONAL
      ) {
        await this.roleResolver.syncRoleForUser(profile.userId, tx);
      }

      // Activa el plan elegido al solicitar el perfil (si lo hubo) — mismo
      // helper que usa PlansService.approveSubscription() para un upgrade de
      // plan de un PROFESIONAL ya existente. Este es el único punto donde
      // un plan pago queda ACTIVE tras un alta de identidad: antes vivía en
      // PlansService.upgradePlan() (eliminado), como una segunda solicitud
      // paralela que un admin revisaba por separado.
      if (dto.status === ProfileStatus.ACTIVE && profile.pendingPlanId) {
        await this.plansService.activateSubscriptionForPlan(
          tx,
          profile.userId,
          profile.pendingPlanId,
          profile.pendingPlanInterval ?? BillingInterval.MONTHLY,
          reviewerId
        );
      }

      // Crea el Commerce al aprobar si el perfil lo exige (BUSINESS siempre;
      // PROFESSIONAL si su categoría vende producto — shouldProvisionCommerce).
      // Ya no existe otro camino: ni /menu ni Configuración lo auto-crean.
      if (dto.status === ProfileStatus.ACTIVE) {
        await this.commerceResolver.ensureForUser(tx, profile.userId);
      }

      return result;
    }).catch(async (error: unknown) => {
      // La prevalidación mejora el mensaje habitual; el índice parcial de
      // PostgreSQL resuelve la carrera entre dos aprobaciones concurrentes.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        REQUIRES_APPROVAL.includes(profile.type)
      ) {
        const conflicting = await this.prisma.userProfile.findFirst({
          where: conflictingProfileWhere,
        });
        if (conflicting) {
          throw new ConflictException(
            `Ya existe un perfil de ${TYPE_LABEL[conflicting.type]} ${conflicting.status === ProfileStatus.PENDING ? 'en revisión' : 'activo'}. Resuelve esa solicitud antes de activar este perfil.`
          );
        }
      }
      throw error;
    });

    if (dto.status === ProfileStatus.ACTIVE) {
      await this.redis.del(userFindByIdCacheKey(profile.userId));
    }

    this.notifications
      .notifyProfileActivationReviewed(
        profile.userId,
        TYPE_LABEL[profile.type],
        dto.status,
        dto.rejectionReason
      )
      .catch(() => {});

    return updated;
  }
}
