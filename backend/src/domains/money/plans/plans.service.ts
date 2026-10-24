import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { userFindByIdCacheKey } from '../../../common/utils/cache-keys.util';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto';
import {
  Prisma,
  SubscriptionStatus,
  KycStatus,
  BillingInterval,
  ProfileType,
  ProfessionalSubtype,
  ProfileStatus,
} from '@prisma/client';
import { RoleResolverService } from '../../../common/account-type/role-resolver.service';
import { AccountTypeResolver } from '../../../common/account-type/account-type.resolver';
import { CategoryScopeService } from '../../../common/category-scope/category-scope.service';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';
import { isPositive, toNumber } from '../../../common/money/money';

@Injectable()
export class PlansService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private readonly roleResolver: RoleResolverService,
    private readonly accountTypeResolver: AccountTypeResolver,
    private readonly categoryScope: CategoryScopeService,
    private readonly commerceResolver: CommerceResolverService
  ) {}

  // ─── Plans CRUD ──────────────────────────────────────────────────────────────

  async findAllPlans(includeInactive = false) {
    return this.prisma.plan.findMany({
      where: includeInactive ? undefined : { status: 'ACTIVE' },
      include: {
        _count: { select: { subscriptions: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
    });
  }

  async findPlanById(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        _count: { select: { subscriptions: true } },
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return plan;
  }

  async createPlan(dto: CreatePlanDto) {
    if (
      isPositive(dto.price) &&
      dto.currency !== 'VES' &&
      dto.currency !== 'USD'
    ) {
      throw new BadRequestException(
        'Los planes pagos requieren una moneda configurada (VES o USD)',
      );
    }

    return this.prisma.plan.create({
      data: {
        ...dto,
        features: dto.features ?? [],
        enabledModules: dto.enabledModules ?? [],
      },
    });
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    const plan = await this.findPlanById(id);
    if (dto.price !== undefined || dto.currency !== undefined) {
      const effectivePrice = dto.price ?? plan.price;
      const effectiveCurrency = dto.currency ?? plan.currency;
      if (
        isPositive(effectivePrice) &&
        effectiveCurrency !== 'VES' &&
        effectiveCurrency !== 'USD'
      ) {
        throw new BadRequestException(
          'Los planes pagos requieren una moneda configurada (VES o USD)',
        );
      }
    }

    const data: any = { ...dto, features: dto.features as any };
    if (dto.enabledModules !== undefined)
      data.enabledModules = dto.enabledModules;
    return this.prisma.plan.update({ where: { id }, data });
  }

  async deletePlan(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        _count: { select: { subscriptions: { where: { status: 'ACTIVE' } } } },
      },
    });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    if (plan._count.subscriptions > 0) {
      throw new ConflictException(
        `No se puede eliminar: hay ${plan._count.subscriptions} suscripciones activas`
      );
    }
    await this.prisma.plan.delete({ where: { id } });
    return { message: 'Plan eliminado' };
  }

  // ─── Subscriptions ────────────────────────────────────────────────────────────

  async findAllSubscriptions(options?: {
    status?: SubscriptionStatus;
    planId?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, planId, page = 1, limit = 20 } = options ?? {};
    const where: any = {};
    if (status) where.status = status;
    if (planId) where.planId = planId;

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              avatar: true,
              category: { select: { id: true, name: true, icon: true } },
            },
          },
          plan: { select: { id: true, name: true, price: true, color: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      subscriptions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async assignSubscription(dto: AssignSubscriptionDto, adminId: string) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Verify plan exists
    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    if (
      isPositive(plan.price) &&
      plan.currency !== 'VES' &&
      plan.currency !== 'USD'
    ) {
      throw new BadRequestException(
        'El plan pago no tiene una moneda configurada (VES o USD)',
      );
    }

    // Cancel existing active subscriptions
    await this.prisma.subscription.updateMany({
      where: { userId: dto.userId, status: { in: ['ACTIVE', 'TRIAL'] } },
      data: { status: 'CANCELLED' },
    });

    const startAt = dto.startAt ? new Date(dto.startAt) : new Date();
    let endAt: Date | undefined;
    if (dto.endAt) {
      endAt = new Date(dto.endAt);
    } else if (dto.interval === 'ANNUAL') {
      endAt = new Date(startAt);
      endAt.setFullYear(endAt.getFullYear() + 1);
    } else {
      endAt = new Date(startAt);
      endAt.setMonth(endAt.getMonth() + 1);
    }

    return this.prisma.subscription.create({
      data: {
        userId: dto.userId,
        planId: dto.planId,
        status: dto.status ?? 'ACTIVE',
        interval: dto.interval ?? 'MONTHLY',
        startAt,
        endAt,
        trialEnds: dto.trialEnds ? new Date(dto.trialEnds) : undefined,
        pricePaid: dto.pricePaid ?? plan.price,
        currency: plan.currency,
        assignedBy: adminId,
        notes: dto.notes,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        plan: true,
      },
    });
  }

  // Cambio de plan iniciado por el propio usuario (no un admin asignando desde
  // el panel). Un plan gratuito se activa de inmediato — no hay nada que
  // verificar. Un plan pago SIEMPRE queda PENDING de aprobación admin, igual
  // que upgradePlan(): activar un plan pago sin pasar por revisión sería
  // otorgar límites/módulos superiores sin que exista pago real de por medio
  // (el mismo hueco que ya se corrigió en WalletsService.deposit()).
  async selfSubscribe(
    userId: string,
    dto: { planId: string; interval?: string }
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    const interval = (
      dto.interval === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY'
    ) as BillingInterval;

    if (isPositive(plan.price)) {
      if (plan.currency !== 'VES' && plan.currency !== 'USD') {
        throw new BadRequestException(
          'El plan no tiene una moneda de pago configurada (VES o USD)',
        );
      }

      const existingPending = await this.prisma.subscription.findFirst({
        where: { userId, status: 'PENDING' },
      });
      if (existingPending) {
        throw new ConflictException(
          'Ya tienes una solicitud de cambio de plan pendiente de aprobación'
        );
      }

      return this.prisma.subscription.create({
        data: {
          userId,
          planId: dto.planId,
          status: 'PENDING',
          interval,
          pricePaid: plan.price,
          currency: plan.currency,
          assignedBy: userId,
        },
        include: { plan: true },
      });
    }

    // Plan gratuito: activación inmediata, mismo cálculo de vigencia que assignSubscription.
    await this.prisma.subscription.updateMany({
      where: { userId, status: { in: ['ACTIVE', 'TRIAL'] } },
      data: { status: 'CANCELLED' },
    });

    const startAt = new Date();
    const endAt = new Date(startAt);
    if (interval === 'ANNUAL') endAt.setFullYear(endAt.getFullYear() + 1);
    else endAt.setMonth(endAt.getMonth() + 1);

    return this.prisma.subscription.create({
      data: {
        userId,
        planId: dto.planId,
        status: 'ACTIVE',
        interval,
        startAt,
        endAt,
        pricePaid: 0,
        currency: plan.currency,
        assignedBy: userId,
      },
      include: { plan: true },
    });
  }

  // Trial autoservicio de 7 días: una sola vez en la vida de la cuenta,
  // activable en cualquier momento mientras el usuario esté en un plan
  // gratuito (o sin suscripción activa todavía). A diferencia de
  // selfSubscribe() con un plan pago, esto NO queda pendiente de aprobación
  // — es autoservicio real, pero autolimitado por trialUsedAt para que no se
  // pueda repetir cancelando y reactivando.
  async activateTrial(userId: string, planId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.trialUsedAt) {
      throw new ConflictException(
        'Ya usaste tu prueba gratuita — cada cuenta solo puede activarla una vez'
      );
    }

    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    if (!isPositive(plan.price)) {
      throw new ConflictException(
        'No tiene sentido activar una prueba gratuita de un plan gratuito'
      );
    }

    const currentSubscription = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'TRIAL'] } },
      include: { plan: true },
    });
    if (currentSubscription && isPositive(currentSubscription.plan.price)) {
      throw new ConflictException(
        'Ya tienes un plan pago activo — la prueba gratuita es solo para cuentas en el plan gratuito'
      );
    }

    const startAt = new Date();
    const endAt = new Date(startAt);
    endAt.setDate(endAt.getDate() + 7);

    return this.prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({
        where: { userId, status: { in: ['ACTIVE', 'TRIAL'] } },
        data: { status: 'CANCELLED' },
      });

      const subscription = await tx.subscription.create({
        data: {
          userId,
          planId,
          status: 'TRIAL',
          interval: 'MONTHLY',
          startAt,
          endAt,
          trialEnds: endAt,
          pricePaid: 0,
          currency: plan.currency,
          assignedBy: userId,
          notes: 'Prueba gratuita autoservicio de 7 días',
        },
        include: { plan: true },
      });

      await tx.user.update({
        where: { id: userId },
        data: { trialUsedAt: startAt },
      });

      return subscription;
    });
  }

  async cancelSubscription(id: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Suscripción no encontrada');
    return this.prisma.subscription.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // Activa (crea) la Subscription de un plan al aprobar una solicitud de
  // perfil (ProfileActivationsService.review()) — mismo cálculo de vigencia
  // que approveSubscription()/selfSubscribe(), reutilizado para no bifurcar
  // "cómo se activa un plan" en un tercer lugar. Recibe `tx` porque debe
  // correr dentro de la misma transacción que activa el UserProfile: si
  // cualquiera de las dos escrituras falla, ninguna debe persistir.
  async activateSubscriptionForPlan(
    tx: Prisma.TransactionClient,
    userId: string,
    planId: string,
    interval: BillingInterval,
    adminId: string
  ) {
    const plan = await tx.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    if (
      isPositive(plan.price) &&
      plan.currency !== 'VES' &&
      plan.currency !== 'USD'
    ) {
      throw new BadRequestException(
        'El plan pago no tiene una moneda configurada (VES o USD)',
      );
    }

    await tx.subscription.updateMany({
      where: { userId, status: { in: ['ACTIVE', 'TRIAL'] } },
      data: { status: 'CANCELLED' },
    });

    const startAt = new Date();
    const endAt = new Date(startAt);
    if (interval === 'ANNUAL') endAt.setFullYear(endAt.getFullYear() + 1);
    else endAt.setMonth(endAt.getMonth() + 1);

    return tx.subscription.create({
      data: {
        userId,
        planId,
        status: 'ACTIVE',
        interval,
        startAt,
        endAt,
        pricePaid: plan.price,
        currency: plan.currency,
        assignedBy: adminId,
      },
      include: { plan: true },
    });
  }

  async getMySubscription(userId: string) {
    const [subscription, pendingSubscription, user] = await Promise.all([
      this.prisma.subscription.findFirst({
        where: { userId, status: { in: ['ACTIVE', 'TRIAL'] } },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subscription.findFirst({
        where: { userId, status: 'PENDING' },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { trialUsedAt: true },
      }),
    ]);
    return {
      subscription,
      pendingSubscription,
      trialAvailable:
        !user?.trialUsedAt &&
        (!subscription || !isPositive(subscription.plan.price)),
    };
  }

  async getPublicPlans(userId?: string, role?: string, categoryId?: string) {
    const where: any = { status: 'ACTIVE' };

    // Qué planes ve el usuario depende de su tipo de cuenta de negocio REAL
    // (UserProfile ACTIVE vía AccountTypeResolver), no del Role crudo del
    // JWT — Role.COMMERCE/FREELANCER es hoy un espejo derivado, no la
    // fuente de verdad (ver RoleResolverService). `role` solo se usa para
    // distinguir NORMAL (ve planes de upgrade) de ADMIN/SUPERADMIN/público
    // (ven todos los planes activos) cuando no hay cuenta de negocio activa.
    const accountType = userId
      ? await this.accountTypeResolver.resolve(userId)
      : null;

    if (accountType === 'FREELANCER') where.forFreelancer = true;
    else if (accountType === 'COMMERCE') where.forCommerce = true;
    else if (role === 'NORMAL') {
      // NORMAL sin cuenta de negocio activa: ve planes de upgrade
      // (freelancer, commerce o dirigidos a normal).
      where.OR = [
        { forFreelancer: true },
        { forCommerce: true },
        { forNormal: true },
      ];
    }
    // Sin role NORMAL (público/no autenticado/admin): mostrar todos los planes activos

    const plans = await this.prisma.plan.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
    });

    // Filter by business category when provided — ver CategoryScopeService
    // (única fuente de verdad de "vacío = visible para cualquier rubro").
    if (!categoryId) return plans;
    return this.categoryScope.filterByField(
      plans,
      (plan) => plan.categoryIds,
      categoryId
    );
  }

  // Deriva el rol destino a partir de las banderas del plan
  private getTargetRole(plan: {
    forFreelancer: boolean;
    forCommerce: boolean;
  }): 'FREELANCER' | 'COMMERCE' | null {
    if (plan.forFreelancer && !plan.forCommerce) return 'FREELANCER';
    if (plan.forCommerce && !plan.forFreelancer) return 'COMMERCE';
    if (plan.forCommerce) return 'COMMERCE';
    if (plan.forFreelancer) return 'FREELANCER';
    return null;
  }

  async approveSubscription(id: string, adminId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: { plan: true, user: true },
    });
    if (!subscription) throw new NotFoundException('Solicitud no encontrada');
    if (subscription.status !== 'PENDING') {
      throw new ConflictException('Esta solicitud ya fue procesada');
    }
    if (isPositive(subscription.plan.price)) {
      if (
        subscription.plan.currency !== 'VES' &&
        subscription.plan.currency !== 'USD'
      ) {
        throw new BadRequestException(
          'El plan pago no tiene una moneda configurada (VES o USD)',
        );
      }
      if (subscription.currency !== subscription.plan.currency) {
        throw new ConflictException(
          'La moneda de la solicitud no coincide con la del plan; debe generarse una nueva solicitud',
        );
      }
    }

    const targetRole = this.getTargetRole(subscription.plan);
    if (!targetRole)
      throw new ConflictException('El plan asociado no permite cambio de rol');

    // El rol COMMERCE/FREELANCER habilita operar como negocio (catálogo público,
    // recibir pedidos y dinero en wallet) — exigimos identidad verificada antes
    // de otorgarlo, no solo al momento de retirar fondos.
    if (subscription.user.kycStatus !== KycStatus.APPROVED) {
      throw new ForbiddenException(
        'El usuario debe completar y aprobar la verificación de identidad (KYC) antes de aprobar este upgrade'
      );
    }

    // Cancelar otras suscripciones activas del usuario
    await this.prisma.subscription.updateMany({
      where: {
        userId: subscription.userId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      data: { status: 'CANCELLED' },
    });

    const startAt = new Date();
    const endAt = new Date(startAt);
    if (subscription.interval === 'ANNUAL')
      endAt.setFullYear(endAt.getFullYear() + 1);
    else endAt.setMonth(endAt.getMonth() + 1);

    const profileType =
      targetRole === 'COMMERCE'
        ? ProfileType.BUSINESS
        : ProfileType.PROFESSIONAL;

    const updatedSubscription = await this.prisma.$transaction(async (tx) => {
      const result = await tx.subscription.update({
        where: { id },
        data: { status: 'ACTIVE', startAt, endAt, assignedBy: adminId },
        include: { plan: true, user: true },
      });

      // UserProfile es la fuente de verdad de negocio — aprobar un upgrade
      // de plan es otro camino hacia el mismo destino que
      // ProfileActivationsService/FreelancerApplicationsService, así que
      // también debe pasar por ahí (antes escribía User.role/accountType
      // directo, sin dejar rastro en UserProfile). Reutiliza el perfil
      // existente si ya lo tenía (evita duplicar filas si el usuario
      // upgradeó de plan más de una vez).
      const existingProfile = await tx.userProfile.findFirst({
        where: { userId: subscription.userId, type: profileType },
      });
      if (existingProfile) {
        await tx.userProfile.update({
          where: { id: existingProfile.id },
          data: {
            status: ProfileStatus.ACTIVE,
            subtype:
              profileType === ProfileType.PROFESSIONAL
                ? ProfessionalSubtype.FREELANCER
                : null,
            categoryId: subscription.user.categoryId,
            subcategoryId: subscription.user.subcategoryId,
            reviewedBy: adminId,
            reviewedAt: new Date(),
          },
        });
      } else {
        await tx.userProfile.create({
          data: {
            userId: subscription.userId,
            type: profileType,
            subtype:
              profileType === ProfileType.PROFESSIONAL
                ? ProfessionalSubtype.FREELANCER
                : null,
            categoryId: subscription.user.categoryId,
            subcategoryId: subscription.user.subcategoryId,
            status: ProfileStatus.ACTIVE,
            reviewedBy: adminId,
            reviewedAt: new Date(),
          },
        });
      }

      await this.roleResolver.syncRoleForUser(subscription.userId, tx);
      // Antes este camino activaba un perfil BUSINESS sin crear su Commerce
      // (ProfileActivationsService sí lo hacía) — misma regla única ahora.
      await this.commerceResolver.ensureForUser(tx, subscription.userId);

      return result;
    });
    await this.redis.del(userFindByIdCacheKey(subscription.userId));

    return { subscription: updatedSubscription, targetRole };
  }

  async rejectSubscription(id: string, adminId: string, reason?: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
    });
    if (!subscription) throw new NotFoundException('Solicitud no encontrada');
    if (subscription.status !== 'PENDING') {
      throw new ConflictException('Esta solicitud ya fue procesada');
    }

    return this.prisma.subscription.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        assignedBy: adminId,
        notes: reason ?? subscription.notes,
      },
      include: { plan: true, user: true },
    });
  }

  async getStats() {
    const [totalPlans, totalSubs, activeSubs, revenue] = await Promise.all([
      this.prisma.plan.count(),
      this.prisma.subscription.count(),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.subscription.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { pricePaid: true },
      }),
    ]);

    const planStats = await this.prisma.plan.findMany({
      select: {
        id: true,
        name: true,
        color: true,
        _count: { select: { subscriptions: { where: { status: 'ACTIVE' } } } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      totalPlans,
      totalSubs,
      activeSubs,
      monthlyRevenue: toNumber(revenue._sum.pricePaid ?? 0),
      planStats,
    };
  }
}
