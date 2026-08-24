import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
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

    // Broadcast to all sockets subscribed to this commerce
    this.gateway.broadcast(commerceId, notification);

    // Commerce.userId is the commerce owner — push goes to their devices
    const commerce = await this.prisma.commerce.findUnique({
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
      link: '/service-requests',
      metadata: { clientName, serviceName },
    });
  }

  async notifyNewServiceRequestMessage(
    recipientId: string,
    senderName: string,
    serviceName: string,
    serviceRequestId: string,
  ) {
    return this.createForUser(recipientId, {
      type: NotificationType.ORDER,
      title: '💬 Nuevo mensaje',
      message: `${senderName} te escribió sobre "${serviceName}"`,
      link: `/service-requests?open=${serviceRequestId}`,
      metadata: { senderName, serviceName, serviceRequestId },
    });
  }

  async notifyServiceRequestStatusChanged(
    clientId: string,
    providerName: string,
    serviceName: string,
    status: 'SEEN' | 'CONTACTED' | 'CLOSED',
  ) {
    const STATUS_COPY: Record<typeof status, { icon: string; title: string; message: string }> = {
      SEEN: {
        icon: '👀',
        title: 'Tu solicitud fue vista',
        message: `${providerName} vio tu solicitud de "${serviceName}" y pronto se pondrá en contacto.`,
      },
      CONTACTED: {
        icon: '📞',
        title: '¡Te van a contactar!',
        message: `${providerName} marcó tu solicitud de "${serviceName}" como contactada.`,
      },
      CLOSED: {
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
      link: '/service-requests',
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
      link: '/service-requests',
      metadata: { clientName, serviceName },
    });
  }

  // Standalone en vez de una variante más de notifyServiceRequestStatusChanged: a diferencia
  // de SEEN/CONTACTED (que son avances del mismo trato), REJECTED es una salida negativa —
  // el cliente necesita buscar otro proveedor, no solo "enterarse de un avance".
  async notifyServiceRequestRejected(
    clientId: string,
    providerName: string,
    serviceName: string,
  ) {
    return this.createForUser(clientId, {
      type: NotificationType.ORDER,
      title: '❌ Solicitud rechazada',
      message: `${providerName} no podrá atender tu solicitud de "${serviceName}". Puedes buscar otro proveedor.`,
      link: '/service-requests',
      metadata: { providerName, serviceName },
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
      link: '/service-requests',
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
      link: '/service-requests',
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

  async notifyRideAccepted(
    passengerId: string,
    driverName: string,
  ) {
    return this.createForUser(passengerId, {
      type: NotificationType.ORDER,
      title: '🚗 Conductor asignado',
      message: `${driverName} aceptó tu corrida y va en camino.`,
      link: '/rides',
      metadata: { driverName },
    });
  }

  async notifyRideStatusChanged(
    passengerId: string,
    driverName: string,
    status: 'IN_PROGRESS' | 'COMPLETED',
  ) {
    const STATUS_COPY: Record<typeof status, { icon: string; title: string; message: string }> = {
      IN_PROGRESS: {
        icon: '🏍️',
        title: 'Tu corrida comenzó',
        message: `${driverName} inició el viaje.`,
      },
      COMPLETED: {
        icon: '✅',
        title: 'Corrida completada',
        message: `Tu corrida con ${driverName} finalizó.`,
      },
    };
    const copy = STATUS_COPY[status];
    return this.createForUser(passengerId, {
      type: NotificationType.ORDER,
      title: `${copy.icon} ${copy.title}`,
      message: copy.message,
      link: '/rides',
      metadata: { driverName, status },
    });
  }

  async notifyNewJobApplication(
    employerId: string,
    applicantName: string,
    jobTitle: string,
  ) {
    return this.createForUser(employerId, {
      type: NotificationType.ORDER,
      title: '📩 Nueva aplicación',
      message: `${applicantName} aplicó a "${jobTitle}"`,
      link: '/jobs',
      metadata: { applicantName, jobTitle },
    });
  }

  async notifyJobApplicationStatusChanged(
    applicantId: string,
    employerName: string,
    jobTitle: string,
    status: 'ACCEPTED' | 'REJECTED',
  ) {
    const isAccepted = status === 'ACCEPTED';
    return this.createForUser(applicantId, {
      type: NotificationType.ORDER,
      title: isAccepted ? '🎉 ¡Fuiste aceptado!' : '📋 Actualización de tu aplicación',
      message: isAccepted
        ? `${employerName} aceptó tu aplicación a "${jobTitle}"`
        : `${employerName} no continuará con tu aplicación a "${jobTitle}"`,
      link: '/jobs',
      metadata: { employerName, jobTitle, status },
    });
  }

  // ── Convenience factory methods ───────────────────────────────────────────
  async notifyNewOrder(commerceId: string, orderNumber: string, total: number) {
    return this.create(commerceId, {
      type: NotificationType.ORDER,
      title: `Nuevo pedido ${orderNumber}`,
      message: `Se recibió un nuevo pedido por $${total.toFixed(2)}`,
      link: '/customer-dashboard',
      metadata: { orderNumber, total },
    });
  }

  async notifyOrderStatusChange(
    commerceId: string,
    orderNumber: string,
    status: string
  ) {
    const labels: Record<string, string> = {
      CONFIRMED: 'fue confirmado',
      PREPARING: 'está en preparación',
      READY: 'está listo para entregar',
      OUT_FOR_DELIVERY: 'salió para entrega',
      DELIVERED: 'fue entregado',
      CANCELLED: 'fue cancelado',
    };
    const label = labels[status] ?? status.toLowerCase();
    return this.create(commerceId, {
      type: NotificationType.ORDER,
      title: `Pedido ${orderNumber}`,
      message: `El pedido ${orderNumber} ${label}`,
      color:
        status === 'CANCELLED'
          ? 'red'
          : status === 'DELIVERED'
            ? 'green'
            : 'blue',
      link: '/customer-dashboard',
      metadata: { orderNumber, status },
    });
  }

  async notifyDeliveryStatusChange(
    commerceId: string,
    orderNumber: string,
    status: string
  ) {
    const labels: Record<string, string> = {
      ASSIGNED: 'fue asignado a un repartidor',
      PICKING_UP: 'está siendo recogido',
      IN_TRANSIT: 'está en camino',
      DELIVERED: 'fue entregado',
      CANCELLED: 'fue cancelado',
      FAILED: 'falló en la entrega',
    };
    const label = labels[status] ?? status.toLowerCase();
    return this.create(commerceId, {
      type: NotificationType.DELIVERY,
      title: `Delivery ${orderNumber}`,
      message: `El delivery ${orderNumber} ${label}`,
      color: ['CANCELLED', 'FAILED'].includes(status)
        ? 'red'
        : status === 'DELIVERED'
          ? 'green'
          : 'blue',
      link: '/delivery',
      metadata: { orderNumber, status },
    });
  }

  async notifyDriverGraceExpiringSoon(commerceId: string, driverName: string, daysLeft: number) {
    return this.create(commerceId, {
      type: NotificationType.DELIVERY,
      title: '⚠️ Repartidor sin cuenta verificada',
      message: `${driverName} no tiene cuenta verificada. En ${daysLeft} día${daysLeft === 1 ? '' : 's'} dejará de poder recibir entregas — invítalo a registrarse.`,
      color: 'yellow',
      link: '/delivery',
      metadata: { driverName, daysLeft },
    });
  }

  async notifyDriverInvitationAccepted(commerceId: string, driverName: string) {
    return this.create(commerceId, {
      type: NotificationType.DELIVERY,
      title: '🛵 Repartidor vinculado',
      message: `${driverName} aceptó tu invitación y ya está disponible para recibir entregas`,
      color: 'green',
      link: '/delivery',
      metadata: { driverName },
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
      link: '/orders',
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
    type: 'ORDER' | 'SERVICE_REQUEST' | 'RIDE',
    feeAmount: number
  ) {
    const labels: Record<string, string> = {
      ORDER: 'pedido',
      SERVICE_REQUEST: 'servicio',
      RIDE: 'viaje',
    };
    return this.createForUser(userId, {
      type: NotificationType.SYSTEM,
      title: '💸 Comisión de plataforma cobrada',
      message: `Se descontó una comisión de $${feeAmount.toFixed(2)} de tu billetera por un ${labels[type] ?? 'transacción'} completado`,
      link: '/wallet',
      metadata: { feeType: type, feeAmount },
    });
  }

  async notifyEscrowFundsNeeded(
    clientId: string,
    providerName: string,
    serviceName: string,
    amount: number
  ) {
    return this.createForUser(clientId, {
      type: NotificationType.SYSTEM,
      title: '⚠️ Carga saldo para continuar',
      message: `${providerName} fijó el precio de "${serviceName}" en $${amount.toFixed(2)}. Carga saldo a tu billetera para retener la garantía y continuar.`,
      link: '/wallet',
      metadata: { providerName, serviceName, amount },
    });
  }

  async notifyEscrowHeld(
    clientId: string,
    providerName: string,
    serviceName: string,
    amount: number
  ) {
    return this.createForUser(clientId, {
      type: NotificationType.SYSTEM,
      title: '✅ Garantía retenida',
      message: `Se retuvo $${amount.toFixed(2)} de tu billetera como garantía para "${serviceName}" con ${providerName}. Se liberará al confirmar la finalización del servicio.`,
      link: '/wallet',
      metadata: { providerName, serviceName, amount },
    });
  }

  async notifyPriceChangeProposed(
    clientId: string,
    providerName: string,
    serviceName: string,
    deltaAmount: number
  ) {
    return this.createForUser(clientId, {
      type: NotificationType.SYSTEM,
      title: '📋 Nueva propuesta de aumento de precio',
      message: `${providerName} propuso agregar ítems a "${serviceName}" por un aumento de $${deltaAmount.toFixed(2)}. Revisa y aprueba o rechaza la propuesta.`,
      link: '/service-requests',
      metadata: { providerName, serviceName, deltaAmount },
    });
  }

  async notifyPriceChangeApproved(
    providerId: string,
    clientName: string,
    serviceName: string,
    deltaAmount: number
  ) {
    return this.createForUser(providerId, {
      type: NotificationType.SYSTEM,
      title: '✅ Aumento de precio aprobado',
      message: `${clientName} aprobó tu propuesta de aumento de $${deltaAmount.toFixed(2)} para "${serviceName}".`,
      link: '/service-requests',
      metadata: { clientName, serviceName, deltaAmount },
    });
  }

  async notifyPriceChangeRejected(
    providerId: string,
    clientName: string,
    serviceName: string,
    deltaAmount: number,
    reason?: string
  ) {
    return this.createForUser(providerId, {
      type: NotificationType.SYSTEM,
      title: '❌ Aumento de precio rechazado',
      message: `${clientName} rechazó tu propuesta de aumento de $${deltaAmount.toFixed(2)} para "${serviceName}".${reason ? ` Motivo: ${reason}` : ''}`,
      link: '/service-requests',
      metadata: { clientName, serviceName, deltaAmount, reason },
    });
  }

  async notifyPriceChangeApprovedPendingFunds(
    clientId: string,
    providerName: string,
    serviceName: string,
    deltaAmount: number
  ) {
    return this.createForUser(clientId, {
      type: NotificationType.SYSTEM,
      title: '⚠️ Carga saldo para completar el aumento aprobado',
      message: `Aprobaste un aumento de $${deltaAmount.toFixed(2)} para "${serviceName}" pero no hay saldo suficiente en tu billetera. Carga saldo para retener la garantía.`,
      link: '/wallet',
      metadata: { providerName, serviceName, deltaAmount },
    });
  }

  async notifyPriceChangeProposalInvalidated(
    providerId: string,
    serviceName: string
  ) {
    return this.createForUser(providerId, {
      type: NotificationType.SYSTEM,
      title: 'Propuesta de aumento invalidada',
      message: `Tu propuesta de aumento para "${serviceName}" quedó invalidada porque la solicitud cambió de estado.`,
      link: '/service-requests',
      metadata: { serviceName },
    });
  }

  async notifyFreelancerApplicationReviewed(
    userId: string,
    status: 'APPROVED' | 'REJECTED',
    rejectionReason?: string
  ) {
    if (status === 'APPROVED') {
      return this.createForUser(userId, {
        type: NotificationType.SYSTEM,
        title: '🎉 ¡Ya eres freelancer!',
        message: 'Tu solicitud fue aprobada. Ya puedes publicar servicios y recibir solicitudes de clientes.',
        link: '/my-services',
        metadata: { status },
      });
    }
    return this.createForUser(userId, {
      type: NotificationType.SYSTEM,
      title: '❌ Solicitud de freelancer rechazada',
      message: rejectionReason
        ? `Tu solicitud para convertirte en freelancer fue rechazada: ${rejectionReason}`
        : 'Tu solicitud para convertirte en freelancer fue rechazada.',
      link: '/profile',
      metadata: { status, rejectionReason },
    });
  }

  async notifyProfileActivationReviewed(
    userId: string,
    profileTypeLabel: string,
    status: 'ACTIVE' | 'REJECTED',
    rejectionReason?: string
  ) {
    if (status === 'ACTIVE') {
      return this.createForUser(userId, {
        type: NotificationType.SYSTEM,
        title: `🎉 ¡Nuevo perfil activado: ${profileTypeLabel}!`,
        message: `Tu solicitud para activar el perfil de ${profileTypeLabel} fue aprobada.`,
        link: '/profile',
        metadata: { status },
      });
    }
    return this.createForUser(userId, {
      type: NotificationType.SYSTEM,
      title: `❌ Solicitud de perfil ${profileTypeLabel} rechazada`,
      message: rejectionReason
        ? `Tu solicitud para activar el perfil de ${profileTypeLabel} fue rechazada: ${rejectionReason}`
        : `Tu solicitud para activar el perfil de ${profileTypeLabel} fue rechazada.`,
      link: '/profile',
      metadata: { status, rejectionReason },
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
      ORDER: 'un pedido de comida',
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
