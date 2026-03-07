import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationType } from '@prisma/client'
import { CreateNotificationDto } from './dto/create-notification.dto'
import { NotificationsGateway } from './notifications.gateway'

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  // ── Create & broadcast ────────────────────────────────────────────────────
  async create(commerceId: string, dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        commerceId,
        type:     dto.type,
        title:    dto.title,
        message:  dto.message,
        icon:     dto.icon     ?? this.defaultIcon(dto.type),
        color:    dto.color    ?? this.defaultColor(dto.type),
        link:     dto.link,
        metadata: dto.metadata ?? undefined,
      },
    })

    // Broadcast to all sockets subscribed to this restaurant
    this.gateway.broadcast(commerceId, notification)

    return notification
  }

  async createForUser(userId: string, dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type:     dto.type,
        title:    dto.title,
        message:  dto.message,
        icon:     dto.icon     ?? this.defaultIcon(dto.type),
        color:    dto.color    ?? this.defaultColor(dto.type),
        link:     dto.link,
        metadata: dto.metadata ?? undefined,
      },
    })
    this.gateway.broadcastToUser(userId, notification)
    return notification
  }

  async notifyNewServiceRequest(providerId: string, clientName: string, serviceName: string) {
    return this.createForUser(providerId, {
      type:    NotificationType.ORDER,
      title:   '📋 Nueva solicitud de servicio',
      message: `${clientName} solicitó "${serviceName}"`,
      link:    '/solicitudes-servicio',
      metadata: { clientName, serviceName },
    })
  }

  // ── Convenience factory methods ───────────────────────────────────────────
  async notifyNewOrder(commerceId: string, orderNumber: string, total: number) {
    return this.create(commerceId, {
      type:    NotificationType.ORDER,
      title:   `Nuevo pedido ${orderNumber}`,
      message: `Se recibió un nuevo pedido por $${total.toFixed(2)}`,
      link:    '/cliente-dashboard',
      metadata: { orderNumber, total },
    })
  }

  async notifyOrderStatusChange(commerceId: string, orderNumber: string, status: string) {
    const labels: Record<string, string> = {
      CONFIRMADO: 'fue confirmado',
      PREPARANDO: 'está en preparación',
      LISTO:      'está listo para entregar',
      EN_ENTREGA: 'salió para entrega',
      ENTREGADO:  'fue entregado',
      CANCELADO:  'fue cancelado',
    }
    const label = labels[status] ?? status.toLowerCase()
    return this.create(commerceId, {
      type:    NotificationType.ORDER,
      title:   `Pedido ${orderNumber}`,
      message: `El pedido ${orderNumber} ${label}`,
      color:   status === 'CANCELADO' ? 'red' : status === 'ENTREGADO' ? 'green' : 'blue',
      link:    '/cliente-dashboard',
      metadata: { orderNumber, status },
    })
  }

  async notifyDeliveryStatusChange(commerceId: string, orderNumber: string, status: string) {
    const labels: Record<string, string> = {
      ASIGNADO:   'fue asignado a un repartidor',
      RECOGIENDO: 'está siendo recogido',
      EN_CAMINO:  'está en camino',
      ENTREGADO:  'fue entregado',
      CANCELADO:  'fue cancelado',
      FALLIDO:    'falló en la entrega',
    }
    const label = labels[status] ?? status.toLowerCase()
    return this.create(commerceId, {
      type:    NotificationType.DELIVERY,
      title:   `Delivery ${orderNumber}`,
      message: `El delivery ${orderNumber} ${label}`,
      color:   ['CANCELADO', 'FALLIDO'].includes(status) ? 'red' : status === 'ENTREGADO' ? 'green' : 'blue',
      link:    '/delivery',
      metadata: { orderNumber, status },
    })
  }

  async notifyNewCatalogOrder(commerceId: string, buyerName: string, productName: string, quantity: number, totalEstimate?: number) {
    const total = totalEstimate ? ` · $${new Intl.NumberFormat('es-CO').format(totalEstimate)}` : ''
    return this.create(commerceId, {
      type:    NotificationType.ORDER,
      title:   '🛒 Nuevo pedido del marketplace',
      message: `${buyerName} solicitó ${quantity}x ${productName}${total}`,
      link:    '/pedidos',
      metadata: { buyerName, productName, quantity, totalEstimate },
    })
  }

  async notifyLowStock(commerceId: string, productName: string, stock: number) {
    return this.create(commerceId, {
      type:    NotificationType.INVENTORY,
      title:   'Stock bajo',
      message: `El producto "${productName}" tiene stock bajo (${stock} unidades)`,
      color:   'yellow',
      link:    '/menu',
      metadata: { productName, stock },
    })
  }

  // ── REST handlers ─────────────────────────────────────────────────────────
  private scopeWhere(scope: { commerceId?: string; userId?: string }) {
    return scope.commerceId ? { commerceId: scope.commerceId } : { userId: scope.userId }
  }

  async findAll(scope: { commerceId?: string; userId?: string }, query: { unread?: string; page?: string; limit?: string }) {
    const page  = Math.max(1, parseInt(query.page  ?? '1'))
    const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? '30')))
    const skip  = (page - 1) * limit

    const where: any = { ...this.scopeWhere(scope) }
    if (query.unread === 'true') where.read = false

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...this.scopeWhere(scope), read: false } }),
    ])

    return { data, total, page, limit, totalPages: Math.ceil(total / limit), unreadCount }
  }

  async markAsRead(id: string, scope: { commerceId?: string; userId?: string }) {
    return this.prisma.notification.update({
      where: { id, ...this.scopeWhere(scope) } as any,
      data:  { read: true, readAt: new Date() },
    })
  }

  async markAllAsRead(scope: { commerceId?: string; userId?: string }) {
    await this.prisma.notification.updateMany({
      where: { ...this.scopeWhere(scope), read: false },
      data:  { read: true, readAt: new Date() },
    })
    return { message: 'Todas las notificaciones marcadas como leídas' }
  }

  async remove(id: string, scope: { commerceId?: string; userId?: string }) {
    await this.prisma.notification.delete({ where: { id, ...this.scopeWhere(scope) } as any })
    return { message: 'Notificación eliminada' }
  }

  async clearAll(scope: { commerceId?: string; userId?: string }) {
    await this.prisma.notification.deleteMany({ where: this.scopeWhere(scope) })
    return { message: 'Todas las notificaciones eliminadas' }
  }

  async getUnreadCount(scope: { commerceId?: string; userId?: string }) {
    const count = await this.prisma.notification.count({ where: { ...this.scopeWhere(scope), read: false } })
    return { count }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private defaultIcon(type: NotificationType): string {
    const map: Record<NotificationType, string> = {
      ORDER:       'ShoppingBagIcon',
      DELIVERY:    'TruckIcon',
      INVENTORY:   'ExclamationTriangleIcon',
      APPOINTMENT: 'CalendarIcon',
      EXPENSE:     'BanknotesIcon',
      SYSTEM:      'BellIcon',
    }
    return map[type] ?? 'BellIcon'
  }

  private defaultColor(type: NotificationType): string {
    const map: Record<NotificationType, string> = {
      ORDER:       'blue',
      DELIVERY:    'green',
      INVENTORY:   'yellow',
      APPOINTMENT: 'purple',
      EXPENSE:     'red',
      SYSTEM:      'gray',
    }
    return map[type] ?? 'gray'
  }
}
