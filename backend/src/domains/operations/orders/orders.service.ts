import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { TelegramService } from '../../engagement/telegram/telegram.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { OrderStatus, Prisma, ProductStatus } from '@prisma/client';
import {
  PlanLimitsFacade,
  PLAN_LIMITS_FACADE,
} from '../../money/plans/plan-limits.facade';
import {
  ReputationFacade,
  REPUTATION_FACADE,
} from '../../reputation/reputation.facade';
import { ReceiptsService } from '../receipts/receipts.service';
import { CashService } from '../cash/cash.service';
import {
  div,
  gt,
  mul,
  round,
  sub,
  sum,
  toNumber,
} from '../../../common/money/money';

// Reintentos ante choque de número de pedido (ver create()).
const ORDER_NUMBER_MAX_ATTEMPTS = 5;

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
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commerceResolver: CommerceResolverService,
    private readonly notifications: NotificationsService,
    @Inject(PLAN_LIMITS_FACADE) private readonly planLimits: PlanLimitsFacade,
    private readonly telegram: TelegramService,
    @Inject(REPUTATION_FACADE) private readonly reputation: ReputationFacade,
    private readonly receipts: ReceiptsService,
    private readonly cash: CashService
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Mueve el inventario por una venta del POS: direction -1 al vender, +1 al
   * cancelar o borrar el pedido. Un pack mueve sus componentes (igual que el
   * catálogo). A diferencia del catálogo, vender por mostrador nunca se
   * bloquea por falta de stock (el producto existe; lo desalineado es el
   * registro): el stock baja hasta 0 como mínimo. Solo cuenta productos de
   * este comercio. Devuelve los que quedaron en stock bajo o agotados.
   */
  private async moveStock(
    tx: Prisma.TransactionClient,
    commerceId: string,
    items: { productId: string | null; quantity: number }[],
    direction: 1 | -1
  ) {
    const ids = [
      ...new Set(
        items.map((i) => i.productId).filter((id): id is string => !!id)
      ),
    ];
    if (ids.length === 0) return [];
    const products = await tx.product.findMany({
      where: { id: { in: ids }, commerceId },
      select: {
        id: true,
        isBundle: true,
        bundleItems: { select: { componentProductId: true, quantity: true } },
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const deltas = new Map<string, number>();
    const add = (id: string, qty: number) =>
      deltas.set(id, (deltas.get(id) ?? 0) + qty);
    for (const item of items) {
      const product = item.productId ? byId.get(item.productId) : undefined;
      if (!product) continue;
      if (product.isBundle) {
        for (const c of product.bundleItems)
          add(c.componentProductId, c.quantity * item.quantity);
      } else {
        add(product.id, item.quantity);
      }
    }

    const low: { name: string; stock: number }[] = [];
    for (const [productId, qty] of deltas) {
      if (direction === 1) {
        await tx.product.updateMany({
          where: { id: productId, commerceId },
          data: { stock: { increment: qty } },
        });
      } else {
        const taken = await tx.product.updateMany({
          where: { id: productId, commerceId, stock: { gte: qty } },
          data: { stock: { decrement: qty } },
        });
        if (taken.count === 0) {
          await tx.product.updateMany({
            where: { id: productId, commerceId },
            data: { stock: 0 },
          });
        }
      }
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { name: true, stock: true, minStock: true, status: true },
      });
      // UNAVAILABLE lo decide el comercio; solo se recalculan estados de stock.
      if (!product || product.status === ProductStatus.UNAVAILABLE) continue;
      const status =
        product.stock === 0
          ? ProductStatus.OUT_OF_STOCK
          : product.stock <= product.minStock
            ? ProductStatus.LOW_STOCK
            : ProductStatus.AVAILABLE;
      if (status !== product.status) {
        await tx.product.update({ where: { id: productId }, data: { status } });
      }
      if (direction === -1 && status !== ProductStatus.AVAILABLE) {
        low.push({ name: product.name, stock: product.stock });
      }
    }
    return low;
  }
  async getCommerceId(userId: string): Promise<string> {
    return this.commerceResolver.resolve(userId);
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
      monthlyRevenue: toNumber(monthlyRevenue._sum.total ?? 0),
      avgTicket: toNumber(avgTicket._avg.total ?? 0),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Platform stats (SUPERADMIN/ADMIN) — igual que getStats() pero agregado
  // sobre TODOS los comercios, sin filtrar por commerceId. Un admin no tiene
  // un Commerce propio, así que getStats(commerceId) no le sirve: antes de
  // esto, el widget "Pedidos Activos" del dashboard de admin quedaba
  // dependiendo de un commerceId inexistente.
  // ──────────────────────────────────────────────────────────────────────────
  async getPlatformStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, byStatus, monthlyRevenue, avgTicket] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: { status: 'DELIVERED', completedAt: { gte: startOfMonth } },
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: { status: 'DELIVERED' },
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
      monthlyRevenue: toNumber(monthlyRevenue._sum.total ?? 0),
      avgTicket: toNumber(avgTicket._avg.total ?? 0),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Platform recent orders (SUPERADMIN/ADMIN) — feed de los pedidos activos
  // más recientes de TODA la plataforma, para el widget "Lista de Pedidos"
  // del dashboard de admin. Incluye el nombre del comercio (ausente en el
  // findAll() por-comercio porque ahí es implícito) para que el admin sepa
  // de quién es cada pedido.
  // ──────────────────────────────────────────────────────────────────────────
  async getPlatformRecent(limit = 20) {
    const activeStatuses: OrderStatus[] = [
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'READY',
      'OUT_FOR_DELIVERY',
    ];
    const take = Math.min(50, Math.max(1, limit));

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { status: { in: activeStatuses } },
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          commerce: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, segment: true } },
        },
      }),
      this.prisma.order.count({ where: { status: { in: activeStatuses } } }),
    ]);

    return {
      data: data.map((o) => ({ ...o, itemCount: o.items.length })),
      total,
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

    // Totales con Decimal: subtotal = suma de las líneas ya redondeadas al
    // centavo, así la suma de OrderItem.subtotal siempre cuadra con
    // Order.subtotal (antes se sumaban los Float sin redondear).
    const lineSubtotals = dto.items.map((item) =>
      round(mul(item.unitPrice, item.quantity))
    );
    const subtotal = sum(lineSubtotals);
    const settings = await this.prisma.commerceSettings.findUnique({
      where: { commerceId },
    });
    const taxRate = settings?.tax ?? 0;
    const tax = round(mul(subtotal, div(taxRate, 100)));
    // Redondeo al centavo en vez de rechazar: el POS puede mandar un
    // descuento porcentual calculado con más decimales.
    const deliveryFee = round(dto.deliveryFee ?? 0);
    const discount = round(dto.discount ?? 0);
    if (gt(discount, sum([subtotal, tax, deliveryFee]))) {
      throw new BadRequestException(
        'El descuento no puede ser mayor al total del pedido'
      );
    }

    // Sin comisión de plataforma: las ventas del POS son ventas propias del
    // comercio (decisión de producto). WorkPlace cobra comisión solo sobre lo
    // que origina el marketplace (catálogo, servicios, viajes).
    const total = sub(sum([subtotal, tax, deliveryFee]), discount);

    // Número correlativo por comercio (único por commerceId+orderNumber).
    // count()+1 puede chocar si dos pedidos se crean a la vez o si se borró
    // un pedido: ante P2002 se prueba el siguiente número.
    const count = await this.prisma.order.count({ where: { commerceId } });
    const year = new Date().getFullYear();
    const orderNumberFor = (n: number) =>
      `ORD-${year}-${String(n).padStart(4, '0')}`;

    const createWithNumber = (orderNumber: string) =>
      this.prisma.order.create({
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
          items: {
            create: dto.items.map((item, i) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: lineSubtotals[i],
              notes: item.notes,
            })),
          },
        },
        include: { items: true },
      });

    let order!: Awaited<ReturnType<typeof createWithNumber>>;
    let orderNumber = '';
    for (let attempt = 1; ; attempt++) {
      orderNumber = orderNumberFor(count + attempt);
      try {
        order = await createWithNumber(orderNumber);
        break;
      } catch (e) {
        const isNumberClash =
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002' &&
          attempt < ORDER_NUMBER_MAX_ATTEMPTS;
        if (!isNumberClash) throw e;
      }
    }

    // Inventario: antes las ventas del POS no descontaban stock y el
    // inventario se desalineaba en cuanto se vendía por mostrador. Un fallo
    // acá no deshace la venta (ya registrada): se deja en el log.
    try {
      const low = await this.prisma.$transaction((tx) =>
        this.moveStock(tx, commerceId, order.items, -1)
      );
      for (const p of low) {
        this.notifications
          .notifyLowStock(commerceId, p.name, p.stock)
          .catch(() => null);
      }
    } catch (err) {
      this.logger.warn(
        `No se pudo descontar el stock del pedido ${orderNumber}: ${(err as Error).message}`
      );
    }

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
      .notifyNewOrder(commerceId, orderNumber, toNumber(total))
      .catch(() => null);

    if (dto.customerId) {
      this.telegram
        .notifyCustomer(
          dto.customerId,
          `🛒 <b>Pedido recibido</b>\nNúmero: <b>${orderNumber}</b>\nTotal: <b>$${total.toFixed(2)}</b>\nEstaremos preparando tu pedido pronto.`
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

    // Sin esto, una venta en efectivo podía cerrarse con la caja cerrada: el
    // dinero nunca entraba a ninguna sesión real y "aparecía" retroactivamente
    // en el arqueo de la próxima apertura (ver getSummary en cash.service.ts).
    if (
      dto.status === 'DELIVERED' &&
      existing.status !== 'DELIVERED' &&
      existing.paymentMethod === 'CASH'
    ) {
      const hasOpenSession = await this.cash.hasOpenSession(commerceId);
      if (!hasOpenSession) {
        throw new BadRequestException(
          'No se puede completar una venta en efectivo sin una caja abierta'
        );
      }
    }

    const data: any = { ...dto };

    if (dto.status === 'DELIVERED') {
      data.completedAt = new Date();
    }
    if (dto.status === 'CANCELLED') {
      data.cancelledAt = new Date();
    }

    // Stats del cliente + el pedido mismo sí son seguros de atomizar: ambos
    // son escrituras directas de Prisma sobre esta misma base de datos. Sin
    // esto, un fallo entre el update de Customer y el de Order dejaba las
    // stats (totalOrders/totalSpent) desincronizadas del estado real del
    // pedido de forma permanente, sin ningún mecanismo de reconciliación.
    const updated = await this.prisma.$transaction(async (tx) => {
      // totalSpent ya se sumó al crear el pedido (create()); sumarlo otra vez
      // al entregar lo contaba doble. Al cancelar se resta lo sumado.
      // Cancelar devuelve al inventario lo que se descontó al vender.
      if (dto.status === 'CANCELLED' && existing.status !== 'CANCELLED') {
        await this.moveStock(tx, commerceId, existing.items, 1);
      }
      if (dto.status === 'CANCELLED' && existing.customerId) {
        await tx.customer.update({
          where: { id: existing.customerId },
          data: {
            totalOrders: { decrement: 1 },
            totalSpent: { decrement: existing.total },
          },
        });
      }

      return tx.order.update({
        where: { id },
        data,
        include: { items: true },
      });
    });

    if (dto.status && dto.status !== existing.status) {
      if (dto.status === 'DELIVERED' || dto.status === 'CANCELLED') {
        this.reputation.recalculate('COMMERCE', commerceId).catch(() => {});
      }

      if (dto.status === 'DELIVERED') {
        // Antes había que emitirlo a mano en un paso aparte después de
        // cerrar la venta — fácil de olvidar y dejaba ventas sin comprobante.
        // create() ya es idempotente (ConflictException si ya existe uno).
        this.receipts.create(commerceId, id).catch(() => {});
      }

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
            `📋 <b>Pedido #${existing.orderNumber}</b>\nEstado: <b>${label}</b>`
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
      byStatus.map((s) => [s.status, s._count])
    );
    const processingStatuses: OrderStatus[] = [
      'CONFIRMED',
      'PREPARING',
      'READY',
      'OUT_FOR_DELIVERY',
    ];
    const processingOrders = processingStatuses.reduce(
      (sum, s) => sum + (statusMap[s] ?? 0),
      0
    );

    return {
      totalOrders: total,
      pendingOrders: statusMap['PENDING'] ?? 0,
      processingOrders,
      completedOrders: statusMap['DELIVERED'] ?? 0,
      cancelledOrders: statusMap['CANCELLED'] ?? 0,
      totalSpent: toNumber(totalSpent._sum.total ?? 0),
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
          commerce: {
            select: {
              id: true,
              name: true,
              user: { select: { avatar: true } },
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: data.map((o) => ({
        ...o,
        itemCount: o.items.length,
        commerce: o.commerce
          ? {
              id: o.commerce.id,
              name: o.commerce.name,
              avatar: o.commerce.user.avatar,
            }
          : null,
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
    // Borrar el pedido devuelve al inventario lo que se descontó al crearlo.
    await this.prisma.$transaction(async (tx) => {
      await this.moveStock(tx, commerceId, order.items, 1);
      await tx.order.delete({ where: { id } });
    });
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
