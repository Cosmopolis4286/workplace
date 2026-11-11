import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { NotificationsService } from '../../../engagement/notifications/notifications.service';
import { CreateMessageDto } from './dto/create-message.dto';
import {
  CONTACT_INFO_NOT_ALLOWED_MESSAGE,
  detectContactInfo,
  redactContacts,
} from '../../../../common/utils/contact-redaction.util';

@Injectable()
export class ServiceRequestMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  // Solo el proveedor o el cliente autenticado de la solicitud pueden ver/
  // participar del chat. Una solicitud anónima (requesterId null, solo
  // clientPhone) no tiene chat — no hay cuenta de plataforma del lado
  // cliente con la que intermediar mensajes.
  private async assertParticipant(serviceRequestId: string, userId: string) {
    const req = await this.prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      select: {
        id: true,
        providerId: true,
        requesterId: true,
        providerName: true,
        serviceName: true,
        clientName: true,
        status: true,
      },
    });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.providerId !== userId && req.requesterId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para ver esta conversación'
      );
    }
    return req;
  }

  async list(serviceRequestId: string, userId: string) {
    await this.assertParticipant(serviceRequestId, userId);
    const messages = await this.prisma.serviceRequestMessage.findMany({
      where: { serviceRequestId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });
    // Mensajes enviados antes del filtro: se muestran con el contacto oculto.
    return messages.map((m) => ({ ...m, body: redactContacts(m.body).text }));
  }

  async send(serviceRequestId: string, userId: string, dto: CreateMessageDto) {
    const req = await this.assertParticipant(serviceRequestId, userId);

    // Toda la conversación se hace dentro de WorkPlace: no se aceptan
    // teléfonos, correos, enlaces de mensajería ni usuarios de redes, en
    // ningún estado. El DTO ya lo valida; esto es la segunda barrera.
    const body = dto.body.trim();
    if (detectContactInfo(body).length) {
      throw new BadRequestException(CONTACT_INFO_NOT_ALLOWED_MESSAGE);
    }

    const message = await this.prisma.serviceRequestMessage.create({
      data: { serviceRequestId, senderId: userId, body },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    const recipientId =
      userId === req.providerId ? req.requesterId : req.providerId;
    const senderName =
      userId === req.providerId ? req.providerName : req.clientName;
    // recipientId solo puede ser null si el proveedor le escribe a un
    // requester anónimo — no debería pasar (assertParticipant ya exige
    // userId === requesterId), pero se guarda igual sin notificar.
    if (recipientId) {
      this.notifications
        .notifyNewServiceRequestMessage(
          recipientId,
          senderName,
          req.serviceName,
          serviceRequestId
        )
        .catch(() => {});
    }

    return message;
  }

  // Marca como leídos los mensajes que el otro participante envió — se llama
  // al abrir la conversación, no por mensaje individual.
  async markRead(serviceRequestId: string, userId: string) {
    await this.assertParticipant(serviceRequestId, userId);
    await this.prisma.serviceRequestMessage.updateMany({
      where: { serviceRequestId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.serviceRequestMessage.count({
      where: {
        readAt: null,
        senderId: { not: userId },
        serviceRequest: {
          OR: [{ providerId: userId }, { requesterId: userId }],
        },
      },
    });
    return { count };
  }

  // Mismo filtro que getUnreadCount pero agrupado por conversación — usado
  // para el badge por fila en el listado de solicitudes.
  async getUnreadCountByRequest(
    userId: string
  ): Promise<Record<string, number>> {
    const rows = await this.prisma.serviceRequestMessage.groupBy({
      by: ['serviceRequestId'],
      where: {
        readAt: null,
        senderId: { not: userId },
        serviceRequest: {
          OR: [{ providerId: userId }, { requesterId: userId }],
        },
      },
      _count: { _all: true },
    });
    const result: Record<string, number> = {};
    for (const row of rows) result[row.serviceRequestId] = row._count._all;
    return result;
  }
}
