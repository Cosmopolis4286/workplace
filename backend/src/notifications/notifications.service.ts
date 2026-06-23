import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway
  ) {}

  // ── Create & broadcast ────────────────────────────────────────────────────
  async create(commerceId: string, dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        commerceId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        icon: dto.icon ?? this.defaultIcon(dto.type),
        color: dto.color ?? this.defaultColor(dto.type),
        link: dto.link,
        metadata: dto.metadata ?? undefined,
      },
    });

    // Broadcast to all sockets subscribed to this restaurant
    this.gateway.broadcast(commerceId, notification);

    // Restaurant.userId is the commerce owner — push goes to their devices
    const commerce = await this.prisma.restaurant.findUnique({
      where: { id: commerceId },
      select: { userId: true },
    });
    if (commerce) {
      await this.sendPush(commerce.userId, notification);
    }

    return notification;
  }

  async createForUser(userId: string, dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        icon: dto.icon ?? this.defaultIcon(dto.type),
        color: dto.color ?? this.defaultColor(dto.type),
        link: dto.link,
        metadata: dto.metadata ?? undefined,
      },
    });
    this.gateway.broadcastToUser(userId, notification);
    await this.sendPush(userId, notification);
    return notification;
  }

  async notifyNewServiceRequest(
    providerId: string,
    clientName: string,
    serviceName: string
  ) {
    return this.createForUser(providerId, {
      type: NotificationType.ORDER,
      title: '📋 Nueva solicitud de servicio',
      message: `${clientName} solicitó "${serviceName}"`,
      link: '/solicitudes-servicio',
      metadata: { clientName, serviceName },
    });
  }

  async notifyServiceRequestStatusChanged(
    clientId: string,
    providerName: string,
    serviceName: string,
    status: 'VISTO' | 'CONTACTADO' | 'CERRADO',
  ) {
    const STATUS_COPY: Record<typeof status, { icon: string; title: string; message: string }> = {
      VISTO: {
        icon: '👀',
        title: 'Tu solicitud fue vista',
        message: `${providerName} vio tu solicitud de "${serviceName}" y pronto se pondrá en contacto.`,
      },
      CONTACTADO: {
        icon: '📞',
        title: '¡Te van a contactar!',
        message: `${providerName} marcó tu solicitud de "${serviceName}" como contactada.`,
      },
      CERRADO: {
        icon: '✅',
        title: 'Solicitud cerrada',
        message: `Tu solicitud de "${serviceName}" con ${providerName} fue marcada como cerrada.`,
      },
    };
    const copy = STATUS_COPY[status];
    return this.createForUser(clientId, {
      type: NotificationType.ORDER,
      title: `${copy.icon} ${copy.title}`,
      message: copy.message,
      link: '/solicitudes-servicio',
      metadata: { providerName, serviceName, status },
    });
  }

  async notifyServiceRequestCancelled(
    providerId: string,
    clientName: string,
    serviceName: string,
  ) {
    return this.createForUser(providerId, {
      type: NotificationType.ORDER,
      title: '🚫 Solicitud cancelada',
      message: `${clientName} canceló su solicitud de "${serviceName}"`,
      link: '/solicitudes-servicio',
      metadata: { clientName, serviceName },
    });
  }

  async notifyServiceRequestNoResponse(
    clientId: string,
    providerName: string,
    serviceName: string,
  ) {
    return this.createForUser(clientId, {
      type: NotificationType.ORDER,
      title: '⏳ Sin respuesta aún',
      message: `${providerName} no ha respondido tu solicitud de "${serviceName}". Puedes seguir esperando o buscar otro proveedor.`,
      link: '/solicitudes-servicio',
      metadata: { providerName, serviceName },
    });
  }

  async notifyServiceRequestAtRisk(
    providerId: string,
    clientName: string,
    serviceName: string,
  ) {
    return this.createForUser(providerId, {
      type: NotificationType.ORDER,
      title: '⚠️ Estás por perder este trato',
      message: `${clientName} lleva más de 24h esperando respuesta sobre "${serviceName}". Respóndele antes de que busque otro proveedor.`,
      link: '/solicitudes-servicio',
      metadata: { clientName, serviceName },
    });
  }

  async notifyReviewReminder(
    clientId: string,
    providerName: string,
    providerUsername?: string | null,
  ) {
    return this.createForUser(clientId, {
      type: NotificationType.REVIEW,
      title: '⭐ ¿Cómo te fue?',
      message: `Tu trato con ${providerName} fue cerrado. Cuéntale a otros cómo te fue dejando una reseña.`,
      link: providerUsername ? `/p/${providerUsername}?review=1` : undefined,
      metadata: { providerName },
    });
  }

  async notifyProposedCategoryReviewed(
    proposerId: string,
    categoryName: string,
    status: 'APPROVED' | 'REJECTED',
  ) {
    const isApproved = status === 'APPROVED';
    return this.createForUser(proposerId, {
      type: NotificationType.SYSTEM,
      title: isApproved ? '✅ Categoría aprobada' : '❌ Categoría rechazada',
      message: isApproved
        ? `Tu categoría "${categoryName}" fue aprobada y ya aparece en los filtros de búsqueda`
        : `Tu categoría "${categoryName}" fue rechazada`,
      link: '/search',
      metadata: { categoryName, status },
    });
  }

  // ── Convenience factory methods ───────────────────────────────────────────
  async notifyNewOrder(commerceId: string, orderNumber: string, total: number) {
    return this.create(commerceId, {
      type: NotificationType.ORDER,
      title: `Nuevo pedido ${orderNumber}`,
      message: `Se recibió un nuevo pedido por $${total.toFixed(2)}`,
      link: '/cliente-dashboard',
      metadata: { orderNumber, total },
    });
  }

  async notifyOrderStatusChange(
    commerceId: string,
    orderNumber: string,
    status: string
  ) {
    const labels: Record<string, string> = {
      CONFIRMADO: 'fue confirmado',
      PREPARANDO: 'está en preparación',
      LISTO: 'está listo para entregar',
      EN_ENTREGA: 'salió para entrega',
      ENTREGADO: 'fue entregado',
      CANCELADO: 'fue cancelado',
    };
    const label = labels[status] ?? status.toLowerCase();
    return this.create(commerceId, {
      type: NotificationType.ORDER,
      title: `Pedido ${orderNumber}`,
      message: `El pedido ${orderNumber} ${label}`,
      color:
        status === 'CANCELADO'
          ? 'red'
          : status === 'ENTREGADO'
            ? 'green'
            : 'blue',
      link: '/cliente-dashboard',
      metadata: { orderNumber, status },
    });
  }

  async notifyDeliveryStatusChange(
    commerceId: string,
    orderNumber: string,
    status: string
  ) {
    const labels: Record<string, string> = {
      ASIGNADO: 'fue asignado a un repartidor',
      RECOGIENDO: 'está siendo recogido',
      EN_CAMINO: 'está en camino',
      ENTREGADO: 'fue entregado',
      CANCELADO: 'fue cancelado',
      FALLIDO: 'falló en la entrega',
    };
    const label = labels[status] ?? status.toLowerCase();
    return this.create(commerceId, {
      type: NotificationType.DELIVERY,
      title: `Delivery ${orderNumber}`,
      message: `El delivery ${orderNumber} ${label}`,
      color: ['CANCELADO', 'FALLIDO'].includes(status)
        ? 'red'
        : status === 'ENTREGADO'
          ? 'green'
          : 'blue',
      link: '/delivery',
      metadata: { orderNumber, status },
    });
  }

  async notifyNewCatalogOrder(
    commerceId: string,
    buyerName: string,
    productName: string,
    quantity: number,
    totalEstimate?: number
  ) {
    const total = totalEstimate
      ? ` · $${new Intl.NumberFormat('es-CO').format(totalEstimate)}`
      : '';
    return this.create(commerceId, {
      type: NotificationType.ORDER,
      title: '🛒 Nuevo pedido del marketplace',
      message: `${buyerName} solicitó ${quantity}x ${productName}${total}`,
      link: '/pedidos',
      metadata: { buyerName, productName, quantity, totalEstimate },
    });
  }

  async notifyLowStock(commerceId: string, productName: string, stock: number) {
    return this.create(commerceId, {
      type: NotificationType.INVENTORY,
      title: 'Stock bajo',
      message: `El producto "${productName}" tiene stock bajo (${stock} unidades)`,
      color: 'yellow',
      link: '/menu',
      metadata: { productName, stock },
    });
  }

  async notifyPlatformFeeCharged(
    userId: string,
    type: 'ORDER' | 'SERVICE_REQUEST' | 'CORRIDA',
    feeAmount: number
  ) {
    const labels: Record<string, string> = {
      ORDER: 'pedido',
      SERVICE_REQUEST: 'servicio',
      CORRIDA: 'viaje',
    };
    return this.createForUser(userId, {
      type: NotificationType.SYSTEM,
      title: '💸 Comisión de plataforma cobrada',
      message: `Se descontó una comisión de $${feeAmount.toFixed(2)} de tu billetera por un ${labels[type] ?? 'transacción'} completado`,
      link: '/billetera',
      metadata: { feeType: type, feeAmount },
    });
  }

  async notifyNewReview(
    targetUserId: string,
    authorName: string,
    rating: number,
    targetUsername?: string
  ) {
    return this.createForUser(targetUserId, {
      type: NotificationType.REVIEW,
      title: '⭐ Nueva reseña recibida',
      message: `${authorName} te dejó una reseña de ${rating}★`,
      link: targetUsername ? `/p/${targetUsername}` : undefined,
      metadata: { authorName, rating },
    });
  }

  async notifyReviewResponse(
    authorUserId: string,
    targetName: string,
    targetUsername?: string
  ) {
    return this.createForUser(authorUserId, {
      type: NotificationType.REVIEW,
      title: '💬 Respondieron tu reseña',
      message: `${targetName} respondió a la reseña que dejaste`,
      link: targetUsername ? `/p/${targetUsername}` : undefined,
      metadata: { targetName },
    });
  }

  // Avisa a todo el equipo de moderación (SUPERADMIN/ADMIN) de un nuevo reporte
  async notifyReviewReported(reason: string) {
    await this.notifyModerators({
      type: NotificationType.REVIEW,
      title: '🚩 Reseña reportada',
      message: `Motivo: ${reason}`,
      link: '/landing-admin',
      metadata: { reason },
    });
  }

  async notifyReportFiled(entityType: string, reason: string) {
    const labels: Record<string, string> = {
      CATALOG_ORDER: 'un pedido',
      SERVICE_REQUEST: 'una solicitud de servicio',
      ORDER: 'un pedido de restaurante',
      GENERAL: 'la app',
    };
    const label = labels[entityType] ?? entityType.toLowerCase();
    await this.notifyModerators({
      type: NotificationType.SYSTEM,
      title: '🚩 Problema reportado',
      message: `Un usuario reportó un problema con ${label}: ${reason}`,
      link: '/landing-admin',
      metadata: { entityType, reason },
    });
  }

  private async notifyModerators(dto: CreateNotificationDto) {
    const moderators = await this.prisma.user.findMany({
      where: { role: { in: ['SUPERADMIN', 'ADMIN'] } },
      select: { id: true },
    });
    await Promise.all(
      moderators.map((m) => this.createForUser(m.id, dto).catch(() => {}))
    );
  }

  // ── REST handlers ─────────────────────────────────────────────────────────
  private scopeWhere(scope: { commerceId?: string; userId?: string }) {
    return scope.commerceId
      ? { commerceId: scope.commerceId }
      : { userId: scope.userId };
  }

  async findAll(
    scope: { commerceId?: string; userId?: string },
    query: { unread?: string; page?: string; limit?: string }
  ) {
    const page = Math.max(1, parseInt(query.page ?? '1'));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? '30')));
    const skip = (page - 1) * limit;

    const where: any = { ...this.scopeWhere(scope) };
    if (query.unread === 'true') where.read = false;

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { ...this.scopeWhere(scope), read: false },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  async markAsRead(
    id: string,
    scope: { commerceId?: string; userId?: string }
  ) {
    return this.prisma.notification.update({
      where: { id, ...this.scopeWhere(scope) } as any,
      data: { read: true, readAt: new Date() },
    });
  }

  async markAllAsRead(scope: { commerceId?: string; userId?: string }) {
    await this.prisma.notification.updateMany({
      where: { ...this.scopeWhere(scope), read: false },
      data: { read: true, readAt: new Date() },
    });
    return { message: 'Todas las notificaciones marcadas como leídas' };
  }

  async remove(id: string, scope: { commerceId?: string; userId?: string }) {
    await this.prisma.notification.delete({
      where: { id, ...this.scopeWhere(scope) } as any,
    });
    return { message: 'Notificación eliminada' };
  }

  async clearAll(scope: { commerceId?: string; userId?: string }) {
    await this.prisma.notification.deleteMany({
      where: this.scopeWhere(scope),
    });
    return { message: 'Todas las notificaciones eliminadas' };
  }

  async getUnreadCount(scope: { commerceId?: string; userId?: string }) {
    const count = await this.prisma.notification.count({
      where: { ...this.scopeWhere(scope), read: false },
    });
    return { count };
  }

  // ── Device tokens (push notifications) ───────────────────────────────────
  async registerDeviceToken(userId: string, dto: RegisterDeviceTokenDto) {
    return this.prisma.deviceToken.upsert({
      where: { token: dto.token },
      create: { token: dto.token, platform: dto.platform, userId },
      update: { userId, platform: dto.platform },
    });
  }

  async removeDeviceToken(userId: string, token: string) {
    await this.prisma.deviceToken.deleteMany({ where: { token, userId } });
    return { message: 'Token de dispositivo eliminado' };
  }

  /**
   * Envío real vía FCM pendiente de credenciales Firebase
   * (ver frontend/docs/PUSH_NOTIFICATIONS.md). No-op por ahora.
   */
  private async sendPush(_userId: string, _notification: { title: string; message: string }) {
    return;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private defaultIcon(type: NotificationType): string {
    const map: Record<NotificationType, string> = {
      ORDER: 'ShoppingBagIcon',
      DELIVERY: 'TruckIcon',
      INVENTORY: 'ExclamationTriangleIcon',
      APPOINTMENT: 'CalendarIcon',
      EXPENSE: 'BanknotesIcon',
      REVIEW: 'StarIcon',
      SYSTEM: 'BellIcon',
    };
    return map[type] ?? 'BellIcon';
  }

  private defaultColor(type: NotificationType): string {
    const map: Record<NotificationType, string> = {
      ORDER: 'blue',
      DELIVERY: 'green',
      INVENTORY: 'yellow',
      APPOINTMENT: 'purple',
      EXPENSE: 'red',
      REVIEW: 'amber',
      SYSTEM: 'gray',
    };
    return map[type] ?? 'gray';
  }
}
