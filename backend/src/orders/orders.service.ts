import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderDto } from './dto/update-order.dto'
import { QueryOrdersDto } from './dto/query-orders.dto'
import { OrderStatus } from '@prisma/client'

// Valid status transitions for business logic enforcement
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDIENTE:   ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO:  ['PREPARANDO', 'CANCELADO'],
  PREPARANDO:  ['LISTO', 'CANCELADO'],
  LISTO:       ['EN_ENTREGA', 'ENTREGADO'],
  EN_ENTREGA:  ['ENTREGADO'],
  ENTREGADO:   [],
  CANCELADO:   [],
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // Stats
  // ──────────────────────────────────────────────────────────────────────────
  async getStats(restaurantId: string) {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [total, byStatus, monthlyRevenue, avgTicket] = await Promise.all([
      this.prisma.order.count({ where: { restaurantId } }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: { restaurantId },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: {
          restaurantId,
          status: 'ENTREGADO',
          completedAt: { gte: startOfMonth },
        },
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: { restaurantId, status: 'ENTREGADO' },
        _avg: { total: true },
      }),
    ])

    const statusMap = Object.fromEntries(byStatus.map(s => [s.status, s._count]))
    const activeStatuses: OrderStatus[] = ['PENDIENTE', 'CONFIRMADO', 'PREPARANDO', 'LISTO', 'EN_ENTREGA']
    const activeOrders = activeStatuses.reduce((sum, s) => sum + (statusMap[s] ?? 0), 0)

    return {
      totalOrders: total,
      activeOrders,
      pendingOrders: statusMap['PENDIENTE'] ?? 0,
      completedOrders: statusMap['ENTREGADO'] ?? 0,
      cancelledOrders: statusMap['CANCELADO'] ?? 0,
      monthlyRevenue: monthlyRevenue._sum.total ?? 0,
      avgTicket: Math.round((avgTicket._avg.total ?? 0) * 100) / 100,
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // List
  // ──────────────────────────────────────────────────────────────────────────
  async findAll(restaurantId: string, query: QueryOrdersDto) {
    const page  = Math.max(1, parseInt(query.page  ?? '1'))
    const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? '20')))
    const skip  = (page - 1) * limit

    const where: any = { restaurantId }

    if (query.status)    where.status    = query.status
    if (query.orderType) where.orderType = query.orderType
    if (query.search) {
      where.OR = [
        { orderNumber:   { contains: query.search, mode: 'insensitive' } },
        { customerName:  { contains: query.search, mode: 'insensitive' } },
        { customerPhone: { contains: query.search, mode: 'insensitive' } },
        { customerEmail: { contains: query.search, mode: 'insensitive' } },
      ]
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {}
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom)
      if (query.dateTo)   where.createdAt.lte = new Date(query.dateTo + 'T23:59:59Z')
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
    ])

    return {
      data: data.map(o => ({ ...o, itemCount: o.items.length })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Find one
  // ──────────────────────────────────────────────────────────────────────────
  async findOne(id: string, restaurantId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, restaurantId },
      include: {
        items: true,
        customer: { select: { id: true, name: true, segment: true, totalOrders: true } },
      },
    })
    if (!order) throw new NotFoundException('Pedido no encontrado')
    return order
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Create
  // ──────────────────────────────────────────────────────────────────────────
  async create(restaurantId: string, dto: CreateOrderDto) {
    if (!dto.items?.length) throw new BadRequestException('El pedido debe tener al menos un ítem')

    // Calculate totals
    const subtotal = dto.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const settings = await this.prisma.restaurantSettings.findUnique({ where: { restaurantId } })
    const taxRate   = settings?.tax ?? 0
    const tax       = Math.round(subtotal * (taxRate / 100) * 100) / 100
    const deliveryFee = dto.deliveryFee ?? 0
    const discount    = dto.discount    ?? 0
    const total       = Math.round((subtotal + tax + deliveryFee - discount) * 100) / 100

    // Generate order number
    const count = await this.prisma.order.count({ where: { restaurantId } })
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        restaurantId,
        customerName:    dto.customerName,
        customerPhone:   dto.customerPhone,
        customerEmail:   dto.customerEmail,
        deliveryAddress: dto.deliveryAddress,
        notes:           dto.notes,
        orderType:       dto.orderType,
        paymentMethod:   dto.paymentMethod,
        customerId:      dto.customerId,
        scheduledAt:     dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        subtotal,
        tax,
        deliveryFee,
        discount,
        total,
        items: {
          create: dto.items.map(item => ({
            productId:   item.productId,
            productName: item.productName,
            quantity:    item.quantity,
            unitPrice:   item.unitPrice,
            subtotal:    Math.round(item.unitPrice * item.quantity * 100) / 100,
            notes:       item.notes,
          })),
        },
      },
      include: { items: true },
    })

    // Update customer stats if linked
    if (dto.customerId) {
      await this.prisma.customer.update({
        where: { id: dto.customerId },
        data: {
          totalOrders: { increment: 1 },
          totalSpent:  { increment: total },
        },
      })
    }

    // Fire-and-forget notification
    this.notifications.notifyNewOrder(restaurantId, orderNumber, total).catch(() => null)

    return order
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Update (status transition with business rules)
  // ──────────────────────────────────────────────────────────────────────────
  async update(id: string, restaurantId: string, dto: UpdateOrderDto) {
    const existing = await this.findOne(id, restaurantId)

    if (dto.status && dto.status !== existing.status) {
      const allowed = STATUS_TRANSITIONS[existing.status]
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `No se puede cambiar de ${existing.status} a ${dto.status}`
        )
      }
    }

    const data: any = { ...dto }

    if (dto.status === 'ENTREGADO') {
      data.completedAt = new Date()
      // Update customer stats for revenue
      if (existing.customerId && existing.status !== 'ENTREGADO') {
        await this.prisma.customer.update({
          where: { id: existing.customerId },
          data: { totalSpent: { increment: existing.total } },
        })
      }
    }
    if (dto.status === 'CANCELADO') {
      data.cancelledAt = new Date()
      // Reverse customer stats if was previously counted
      if (existing.customerId) {
        await this.prisma.customer.update({
          where: { id: existing.customerId },
          data: {
            totalOrders: { decrement: 1 },
            totalSpent:  { decrement: existing.total },
          },
        })
      }
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data,
      include: { items: true },
    })

    if (dto.status && dto.status !== existing.status) {
      this.notifications
        .notifyOrderStatusChange(restaurantId, existing.orderNumber, dto.status)
        .catch(() => null)
    }

    return updated
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Delete
  // ──────────────────────────────────────────────────────────────────────────
  async remove(id: string, restaurantId: string) {
    await this.findOne(id, restaurantId)
    await this.prisma.order.delete({ where: { id } })
    return { message: 'Pedido eliminado' }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Quick status patch
  // ──────────────────────────────────────────────────────────────────────────
  async updateStatus(id: string, restaurantId: string, status: OrderStatus, cancelReason?: string) {
    return this.update(id, restaurantId, { status, cancelReason })
  }
}
