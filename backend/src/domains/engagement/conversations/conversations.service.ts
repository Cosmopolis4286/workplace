import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationThreadType, NotificationType, Role } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';
import {
  CONTACT_INFO_NOT_ALLOWED_MESSAGE,
  detectContactInfo,
  redactContacts,
} from '../../../common/utils/contact-redaction.util';
import { NotificationsService } from '../notifications/notifications.service';

const ADMIN_ROLES: Role[] = [Role.SUPERADMIN, Role.ADMIN];

interface Thread {
  // Usuarios a notificar cuando escribe el otro lado (vacío = soporte).
  buyerSide: string[];
  sellerSide: string[];
  viewerSide: 'buyer' | 'seller' | 'support';
  // En pedidos se aplica el filtro anti-contacto; en reportes (con soporte)
  // no hay riesgo de cerrar un trato por fuera.
  blockContactInfo: boolean;
  title: string;
  link: { buyer: string; seller: string };
  // Hilos de más de dos lados (entregas): a quién avisar y con qué enlace.
  // Si está, reemplaza a buyerSide/sellerSide para las notificaciones.
  participants?: { userId: string; link: string }[];
  // Solo lectura: la operación terminó y ya no se puede escribir.
  closed?: boolean;
}

// La conversación de una entrega solo sirve mientras está en curso; después
// queda como historial (los problemas se reportan aparte).
const ACTIVE_DELIVERY_STATUSES = [
  'PENDING',
  'ASSIGNED',
  'PICKING_UP',
  'IN_TRANSIT',
];

/**
 * Chat de los hilos que no son solicitudes de servicio:
 * - CATALOG_ORDER: comprador ↔ comercio (dueño o empleados). La conversación
 *   se hace aquí: el comercio no recibe el teléfono ni el correo del
 *   comprador, y no se aceptan datos de contacto en los mensajes.
 * - REPORT: quien reportó ↔ soporte (admins).
 * - DELIVERY: cliente ↔ repartidor ↔ comercio. Reemplaza el teléfono: ni el
 *   repartidor ve el del cliente (si tiene cuenta) ni el cliente el del
 *   repartidor. Se escribe solo mientras la entrega está en curso.
 */
@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commerceResolver: CommerceResolverService,
    private readonly notifications: NotificationsService
  ) {}

  private async resolveThread(
    type: ConversationThreadType,
    id: string,
    user: { id: string; role: Role }
  ): Promise<Thread> {
    if (type === ConversationThreadType.CATALOG_ORDER) {
      const o = await this.prisma.catalogOrder.findUnique({
        where: { id },
        select: { requesterId: true, commerceId: true, commerceName: true },
      });
      if (!o) throw new NotFoundException('Pedido no encontrado');
      const owner = await this.prisma.commerce.findUnique({
        where: { id: o.commerceId },
        select: { userId: true },
      });
      const isBuyer = !!o.requesterId && o.requesterId === user.id;
      const myCommerce = isBuyer
        ? null
        : await this.commerceResolver.find(user.id).catch(() => null);
      const isSeller = myCommerce === o.commerceId;
      if (!isBuyer && !isSeller) {
        throw new ForbiddenException('No tienes acceso a esta conversación');
      }
      return {
        buyerSide: o.requesterId ? [o.requesterId] : [],
        sellerSide: owner ? [owner.userId] : [],
        viewerSide: isBuyer ? 'buyer' : 'seller',
        blockContactInfo: true,
        title: `tu pedido en ${o.commerceName}`,
        link: { buyer: '/my-orders', seller: '/orders' },
      };
    }

    if (type === ConversationThreadType.DELIVERY) {
      const d = await this.prisma.delivery.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          orderNumber: true,
          customerUserId: true,
          driver: { select: { userId: true } },
          commerce: { select: { userId: true, name: true } },
        },
      });
      if (!d) throw new NotFoundException('Entrega no encontrada');
      const isCustomer = !!d.customerUserId && d.customerUserId === user.id;
      const isDriver = !!d.driver?.userId && d.driver.userId === user.id;
      const isCommerce = d.commerce.userId === user.id;
      if (!isCustomer && !isDriver && !isCommerce) {
        throw new ForbiddenException('No tienes acceso a esta conversación');
      }
      const participants = [
        d.customerUserId && {
          userId: d.customerUserId,
          link: `/delivery-tracking/${d.id}`,
        },
        d.driver?.userId && { userId: d.driver.userId, link: '/my-deliveries' },
        { userId: d.commerce.userId, link: '/delivery' },
      ].filter((p): p is { userId: string; link: string } => !!p);
      return {
        buyerSide: d.customerUserId ? [d.customerUserId] : [],
        sellerSide: [d.commerce.userId],
        viewerSide: isCustomer ? 'buyer' : 'seller',
        blockContactInfo: true,
        title: `la entrega #${d.orderNumber} de ${d.commerce.name}`,
        link: { buyer: `/delivery-tracking/${d.id}`, seller: '/delivery' },
        participants,
        closed: !ACTIVE_DELIVERY_STATUSES.includes(d.status),
      };
    }

    const report = await this.prisma.report.findUnique({
      where: { id },
      select: { reporterId: true },
    });
    if (!report) throw new NotFoundException('Reporte no encontrado');
    const isSupport = ADMIN_ROLES.includes(user.role);
    if (report.reporterId !== user.id && !isSupport) {
      throw new ForbiddenException('No tienes acceso a esta conversación');
    }
    return {
      buyerSide: [report.reporterId],
      sellerSide: [],
      viewerSide: report.reporterId === user.id ? 'buyer' : 'support',
      blockContactInfo: false,
      title: 'tu reporte',
      link: { buyer: '/report-issue', seller: '/reports-admin' },
    };
  }

  async list(
    type: ConversationThreadType,
    id: string,
    user: { id: string; role: Role }
  ) {
    const thread = await this.resolveThread(type, id, user);
    const messages = await this.prisma.conversationMessage.findMany({
      where: { threadType: type, threadId: id },
      orderBy: { createdAt: 'asc' },
      take: 500,
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });
    return messages.map((m) => ({
      ...m,
      body: thread.blockContactInfo ? redactContacts(m.body).text : m.body,
    }));
  }

  async send(
    type: ConversationThreadType,
    id: string,
    user: { id: string; role: Role },
    rawBody: string
  ) {
    const thread = await this.resolveThread(type, id, user);
    if (thread.closed) {
      throw new BadRequestException(
        'Esta conversación se cerró. Si hubo un problema, repórtalo.'
      );
    }
    const body = rawBody.trim();
    if (!body) throw new BadRequestException('Escribe un mensaje');
    if (thread.blockContactInfo && detectContactInfo(body).length) {
      throw new BadRequestException(CONTACT_INFO_NOT_ALLOWED_MESSAGE);
    }

    const message = await this.prisma.conversationMessage.create({
      data: {
        threadType: type,
        threadId: id,
        senderId: user.id,
        fromSupport: thread.viewerSide === 'support',
        body,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    // Avisa al otro lado (los hilos de reporte sin respuesta los ve soporte
    // en su bandeja; no se notifica a todos los admins).
    const recipients = thread.participants
      ? thread.participants
      : (thread.viewerSide === 'buyer'
          ? thread.sellerSide
          : thread.buyerSide
        ).map((userId) => ({
          userId,
          link:
            thread.viewerSide === 'buyer'
              ? thread.link.seller
              : thread.link.buyer,
        }));
    const notifiedIds = new Set<string>();
    for (const { userId: recipientId, link } of recipients) {
      if (recipientId === user.id || notifiedIds.has(recipientId)) continue;
      notifiedIds.add(recipientId);
      this.notifications
        .createForUser(recipientId, {
          type:
            type === ConversationThreadType.DELIVERY
              ? NotificationType.DELIVERY
              : NotificationType.ORDER,
          title: '💬 Nuevo mensaje',
          message: `Tienes un mensaje nuevo sobre ${thread.title}`,
          link,
          metadata: { threadType: type, threadId: id },
        })
        .catch(() => {});
    }
    return message;
  }

  async markRead(
    type: ConversationThreadType,
    id: string,
    user: { id: string; role: Role }
  ) {
    await this.resolveThread(type, id, user);
    await this.prisma.conversationMessage.updateMany({
      where: {
        threadType: type,
        threadId: id,
        senderId: { not: user.id },
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
