import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { TelegramService } from '../../engagement/telegram/telegram.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { OrderStatus } from '@prisma/client';
import { PlanLimitsFacade, PLAN_LIMITS_FACADE } from '../../money/plans/plan-limits.facade';
import { PlatformFeesFacade, PLATFORM_FEES_FACADE } from '../../money/platform-fees/platform-fees.facade';

// Valid status transitions for business logic enforcement
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Inject(PLAN_LIMITS_FACADE) private readonly planLimits: PlanLimitsFacade,
    private readonly telegram: TelegramService,
    @Inject(PLATFORM_FEES_FACADE) private readonly platformFees: PlatformFeesFacade,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────
  async getCommerceId(userId: string): Promise<string> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
      select: { id: true },
    });
    return restaurant?.id ?? userId;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Stats
  // ──────────────────────────────────────────────────────────────────────────
  async getStats(commerceId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, byStatus, monthlyRevenue, avgTicket] = await Promise.all([
      this.prisma.order.count({ where: { commerceId } }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: { commerceId },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: {
          commerceId,
          status: 'DELIVERED',
          completedAt: { gte: startOfMonth },
        },
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: { commerceId, status: 'DELIVERED' },
        _avg: { total: true },
      }),
    ]);

    const statusMap = Object.fromEntries(
      byStatus.map((s) => [s.status, s._count])
    );
    const activeStatuses: OrderStatus[] = [
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'READY',
      'OUT_FOR_DELIVERY',
    ];
    const activeOrders = activeStatuses.reduce(
      (sum, s) => sum + (statusMap[s] ?? 0),
      0
    );

    return {
      totalOrders: total,
      activeOrders,
      pendingOrders: statusMap['PENDING'] ?? 0,
      completedOrders: statusMap['DELIVERED'] ?? 0,
      cancelledOrders: statusMap['CANCELLED'] ?? 0,
      monthlyRevenue: monthlyRevenue._sum.total ?? 0,
      avgTicket: Math.round((avgTicket._avg.total ?? 0) * 100) / 100,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // List
  // ──────────────────────────────────────────────────────────────────────────
  async findAll(commerceId: string, query: QueryOrdersDto) {
    const page = Math.max(1, parseInt(query.page ?? '1'));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? '20')));
    const skip = (page - 1) * limit;

    const where: any = { commerceId };

    if (query.status) {
      const statuses = query.status.split(',');
      where.status = statuses.length > 1 ? { in: statuses } : statuses[0];
    }
    if (query.orderType) where.orderType = query.orderType;
    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { customerName: { contains: query.search, mode: 'insensitive' } },
        { customerPhone: { contains: query.search, mode: 'insensitive' } },
        { customerEmail: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo)
        where.createdAt.lte = new Date(query.dateTo + 'T23:59:59Z');
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          customer: { select: { id: true, name: true, segment: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: data.map((o) => ({ ...o, itemCount: o.items.length })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Find one
  // ──────────────────────────────────────────────────────────────────────────
  async findOne(id: string, commerceId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, commerceId },
      include: {
        items: true,
        customer: {
          select: { id: true, name: true, segment: true, totalOrders: true },
        },
      },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Create
  // ──────────────────────────────────────────────────────────────────────────
  async create(commerceId: string, dto: CreateOrderDto, userId?: string) {
    if (!dto.items?.length)
      throw new BadRequestException('El pedido debe tener al menos un ítem');
    if (userId) await this.planLimits.assertOrderLimit(userId, commerceId);

    // Calculate totals
    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const settings = await this.prisma.restaurantSettings.findUnique({
      where: { commerceId },
    });
    const taxRate = settings?.tax ?? 0;
    const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const deliveryFee = dto.deliveryFee ?? 0;
    const discount = dto.discount ?? 0;

    const feeConfig = await this.platformFees.resolveFeeConfig('ORDER', userId);
    let platformFeeAmount = 0;
    if (feeConfig?.payer === 'CLIENT') {
      platformFeeAmount = this.platformFees.calculateFee(subtotal, feeConfig).feeAmount;
    }

    const total =
      Math.round((subtotal + tax + deliveryFee - discount + platformFeeAmount) * 100) / 100;

    // Generate order number
    const count = await this.prisma.order.count({ where: { commerceId } });
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        commerceId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail,
        deliveryAddress: dto.deliveryAddress,
        notes: dto.notes,
        orderType: dto.orderType,
        paymentMethod: dto.paymentMethod,
        customerId: dto.customerId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        subtotal,
        tax,
        deliveryFee,
        discount,
        total,
        platformFeeRate: feeConfig?.payer === 'CLIENT' ? feeConfig.rate : undefined,
        platformFeeAmount: feeConfig?.payer === 'CLIENT' ? platformFeeAmount : undefined,
        platformFeePayer: feeConfig?.payer === 'CLIENT' ? 'CLIENT' : undefined,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: Math.round(item.unitPrice * item.quantity * 100) / 100,
            notes: item.notes,
          })),
        },
      },
      include: { items: true },
    });

    // Update customer stats if linked
    if (dto.customerId) {
      await this.prisma.customer.update({
        where: { id: dto.customerId },
        data: {
          totalOrders: { increment: 1 },
          totalSpent: { increment: total },
        },
      });
    }

    // Fire-and-forget notification
    this.notifications
      .notifyNewOrder(commerceId, orderNumber, total)
      .catch(() => null);

    if (dto.customerId) {
      this.telegram
        .notifyCustomer(
          dto.customerId,
          `🛒 <b>Pedido recibido</b>\nNúmero: <b>${orderNumber}</b>\nTotal: <b>$${total.toFixed(2)}</b>\nEstaremos preparando tu pedido pronto.`,
        )
        .catch(() => null);
    }

    return order;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Update (status transition with business rules)
  // ──────────────────────────────────────────────────────────────────────────
  async update(id: string, commerceId: string, dto: UpdateOrderDto) {
    const existing = await this.findOne(id, commerceId);

    if (dto.status && dto.status !== existing.status) {
      const allowed = STATUS_TRANSITIONS[existing.status];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `No se puede cambiar de ${existing.status} a ${dto.status}`
        );
      }
    }

    const data: any = { ...dto };

    if (dto.status === 'DELIVERED') {
      data.completedAt = new Date();
      // Update customer stats for revenue
      if (existing.customerId && existing.status !== 'DELIVERED') {
        await this.prisma.customer.update({
          where: { id: existing.customerId },
          data: { totalSpent: { increment: existing.total } },
        });
      }

      // Comisión de plataforma a cargo del comercio, si aplica
      if (!existing.platformFeePayer) {
        const restaurant = await this.prisma.restaurant.findUnique({
          where: { id: commerceId },
          select: { userId: true },
        });
        const feeConfig = restaurant
          ? await this.platformFees.resolveFeeConfig('ORDER', restaurant.userId)
          : null;
        if (feeConfig?.payer === 'PROVIDER' && restaurant) {
          const { feeAmount } = this.platformFees.calculateFee(existing.total, feeConfig);
          await this.platformFees.chargeProviderFee(
            'ORDER',
            restaurant.userId,
            feeAmount,
            `FEE-ORDER-${id}`,
            { orderId: id },
          );
          data.platformFeeRate = feeConfig.rate;
          data.platformFeeAmount = feeAmount;
          data.platformFeePayer = 'PROVIDER';
        }
      }
    }
    if (dto.status === 'CANCELLED') {
      data.cancelledAt = new Date();
      // Reverse customer stats if was previously counted
      if (existing.customerId) {
        await this.prisma.customer.update({
          where: { id: existing.customerId },
          data: {
            totalOrders: { decrement: 1 },
            totalSpent: { decrement: existing.total },
          },
        });
      }
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data,
      include: { items: true },
    });

    if (dto.status && dto.status !== existing.status) {
      this.notifications
        .notifyOrderStatusChange(commerceId, existing.orderNumber, dto.status)
        .catch(() => null);

      if (existing.customerId) {
        const statusEmoji: Record<string, string> = {
          CONFIRMED: '✅ Confirmado',
          PREPARING: '👨‍🍳 En preparación',
          READY: '📦 Listo para entrega',
          OUT_FOR_DELIVERY: '🚚 En camino',
          DELIVERED: '🎉 Entregado',
          CANCELLED: '❌ Cancelado',
        };
        const label = statusEmoji[dto.status] ?? dto.status;
        this.telegram
          .notifyCustomer(
            existing.customerId,
            `📋 <b>Pedido #${existing.orderNumber}</b>\nEstado: <b>${label}</b>`,
          )
          .catch(() => null);
      }
    }

    return updated;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // My Orders stats (for customers)
  // ──────────────────────────────────────────────────────────────────────────
  async getMyOrdersStats(userEmail: string) {
    const where = { customerEmail: userEmail };

    const [total, byStatus, totalSpent] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: { ...where, status: 'DELIVERED' },
        _sum: { total: true },
      }),
    ]);

    const statusMap = Object.fromEntries(
      byStatus.map((s) => [s.status, s._count]),
    );
    const processingStatuses: OrderStatus[] = [
      'CONFIRMED',
      'PREPARING',
      'READY',
      'OUT_FOR_DELIVERY',
    ];
    const processingOrders = processingStatuses.reduce(
      (sum, s) => sum + (statusMap[s] ?? 0),
      0,
    );

    return {
      totalOrders: total,
      pendingOrders: statusMap['PENDING'] ?? 0,
      processingOrders,
      completedOrders: statusMap['DELIVERED'] ?? 0,
      cancelledOrders: statusMap['CANCELLED'] ?? 0,
      totalSpent: totalSpent._sum.total ?? 0,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // My Orders (for customers)
  // ──────────────────────────────────────────────────────────────────────────
  async getMyOrders(userEmail: string, page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = { customerEmail: userEmail };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          commerce: { select: { id: true, name: true, user: { select: { avatar: true } } } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: data.map((o) => ({
        ...o,
        itemCount: o.items.length,
        commerce: o.commerce ? { id: o.commerce.id, name: o.commerce.name, avatar: o.commerce.user.avatar } : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Delete
  // ──────────────────────────────────────────────────────────────────────────
  async remove(id: string, commerceId: string) {
    const order = await this.findOne(id, commerceId);
    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        'Solo se pueden eliminar pedidos en estado PENDING'
      );
    }
    await this.prisma.order.delete({ where: { id } });
    return { message: 'Pedido eliminado' };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Quick status patch
  // ──────────────────────────────────────────────────────────────────────────
  async updateStatus(
    id: string,
    commerceId: string,
    status: OrderStatus,
    cancelReason?: string
  ) {
    return this.update(id, commerceId, { status, cancelReason });
  }
}
