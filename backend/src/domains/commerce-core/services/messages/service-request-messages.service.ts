import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { NotificationsService } from '../../../engagement/notifications/notifications.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class ServiceRequestMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // Solo el proveedor o el cliente autenticado de la solicitud pueden ver/
  // participar del chat. Una solicitud anónima (requesterId null, solo
  // clientPhone) no tiene chat — no hay cuenta de plataforma del lado
  // cliente con la que intermediar mensajes.
  private async assertParticipant(serviceRequestId: string, userId: string) {
    const req = await this.prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      select: { id: true, providerId: true, requesterId: true, providerName: true, serviceName: true, clientName: true },
    });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.providerId !== userId && req.requesterId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver esta conversación');
    }
    return req;
  }

  async list(serviceRequestId: string, userId: string) {
    await this.assertParticipant(serviceRequestId, userId);
    return this.prisma.serviceRequestMessage.findMany({
      where: { serviceRequestId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });
  }

  async send(serviceRequestId: string, userId: string, dto: CreateMessageDto) {
    const req = await this.assertParticipant(serviceRequestId, userId);

    const message = await this.prisma.serviceRequestMessage.create({
      data: { serviceRequestId, senderId: userId, body: dto.body.trim() },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });

    const recipientId = userId === req.providerId ? req.requesterId : req.providerId;
    const senderName = userId === req.providerId ? req.providerName : req.clientName;
    // recipientId solo puede ser null si el proveedor le escribe a un
    // requester anónimo — no debería pasar (assertParticipant ya exige
    // userId === requesterId), pero se guarda igual sin notificar.
    if (recipientId) {
      this.notifications
        .notifyNewServiceRequestMessage(recipientId, senderName, req.serviceName, serviceRequestId)
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
        serviceRequest: { OR: [{ providerId: userId }, { requesterId: userId }] },
      },
    });
    return { count };
  }
}
