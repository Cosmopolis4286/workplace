import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.plan.create({
      data: {
        ...dto,
        features: dto.features ?? [],
        enabledModules: dto.enabledModules ?? [],
      },
    });
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    await this.findPlanById(id);
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

  async cancelSubscription(id: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Suscripción no encontrada');
    return this.prisma.subscription.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async getMySubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'TRIAL'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    return { subscription };
  }

  async getPublicPlans(role?: string, categoryId?: string) {
    const where: any = { status: 'ACTIVE' };

    if (role === 'FREELANCER') where.forFreelancer = true;
    else if (role === 'COMMERCE') where.forCommerce = true;
    else if (role === 'NORMAL') {
      // NORMAL users see upgrade plans (freelancer, commerce or normal-targeted)
      where.OR = [{ forFreelancer: true }, { forCommerce: true }, { forNormal: true }];
    }
    // No role (public/unauthenticated): show all active plans

    const plans = await this.prisma.plan.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
    });

    // Filter by business category when provided: a plan with no categoryIds
    // is available to every category; otherwise the category must be listed.
    if (!categoryId) return plans;
    return plans.filter(
      (plan) => plan.categoryIds.length === 0 || plan.categoryIds.includes(categoryId)
    );
  }

  async upgradePlan(userId: string, dto: { planId: string; categoryId: string; interval?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    // Determine target role from plan flags
    let targetRole: 'FREELANCER' | 'COMMERCE' | null = null;
    if (plan.forFreelancer && !plan.forCommerce) targetRole = 'FREELANCER';
    else if (plan.forCommerce && !plan.forFreelancer) targetRole = 'COMMERCE';
    else if (plan.forCommerce) targetRole = 'COMMERCE';
    else if (plan.forFreelancer) targetRole = 'FREELANCER';

    if (!targetRole) throw new ConflictException('El plan seleccionado no permite cambio de rol');

    // Verify category exists
    const category = await this.prisma.userCategory.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('Categoría no encontrada');

    // Update user role and category atomically
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: targetRole as any, categoryId: dto.categoryId },
    });

    // Cancel existing active subscriptions and create new one
    await this.prisma.subscription.updateMany({
      where: { userId, status: { in: ['ACTIVE', 'TRIAL'] } },
      data: { status: 'CANCELLED' },
    });

    const startAt = new Date();
    const endAt = new Date(startAt);
    if (dto.interval === 'ANNUAL') endAt.setFullYear(endAt.getFullYear() + 1);
    else endAt.setMonth(endAt.getMonth() + 1);

    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        planId: dto.planId,
        status: 'ACTIVE',
        interval: (dto.interval === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY') as any,
        startAt,
        endAt,
        pricePaid: plan.price,
        assignedBy: userId,
      },
      include: { plan: true },
    });

    // Return updated user profile + subscription
    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { commerce: true },
    });
    const { password: _, ...userResult } = updatedUser as any;

    return { user: userResult, subscription, targetRole };
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
      monthlyRevenue: revenue._sum.pricePaid ?? 0,
      planStats,
    };
  }
}
