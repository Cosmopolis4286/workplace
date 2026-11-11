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
}

/**
 * Chat de los hilos que no son solicitudes de servicio:
 * - CATALOG_ORDER: comprador ↔ comercio (dueño o empleados). La conversación
 *   se hace aquí: el comercio no recibe el teléfono ni el correo del
 *   comprador, y no se aceptan datos de contacto en los mensajes.
 * - REPORT: quien reportó ↔ soporte (admins).
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
    const recipients =
      thread.viewerSide === 'buyer' ? thread.sellerSide : thread.buyerSide;
    const link =
      thread.viewerSide === 'buyer' ? thread.link.seller : thread.link.buyer;
    for (const recipientId of recipients) {
      if (recipientId === user.id) continue;
      this.notifications
        .createForUser(recipientId, {
          type: NotificationType.ORDER,
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
