import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { MailService } from '../../engagement/mail/mail.service';

const NO_RESPONSE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// Avisa al cliente cuando una solicitud lleva más de 24h en PENDING sin que el
// proveedor reaccione, para que no quede esperando indefinidamente y pueda buscar
// otro proveedor si lo prefiere. reminderSentAt evita reenviar el mismo aviso.
@Injectable()
export class ServiceRequestReminderScheduler {
  private readonly logger = new Logger(ServiceRequestReminderScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleReminderCheck() {
    try {
      await this.sendPendingReminders();
    } catch (error) {
      this.logger.error('Service request reminder check failed:', error);
    }
  }

  async sendPendingReminders(now = new Date()) {
    const threshold = new Date(now.getTime() - NO_RESPONSE_THRESHOLD_MS);

    const stale = await this.prisma.serviceRequest.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lte: threshold },
        reminderSentAt: null,
        requesterId: { not: null },
      },
      include: { requester: { select: { id: true, email: true, firstName: true } } },
    });

    for (const req of stale) {
      if (!req.requester) continue;

      this.notifications
        .notifyServiceRequestNoResponse(req.requester.id, req.providerName, req.serviceName)
        .catch(() => {});

      this.mail
        .sendServiceRequestReminder(req.requester.email, req.requester.firstName, req.providerName, req.serviceName)
        .catch(() => {});

      this.notifications
        .notifyServiceRequestAtRisk(req.providerId, req.clientName, req.serviceName)
        .catch(() => {});

      await this.prisma.serviceRequest.update({
        where: { id: req.id },
        data: { reminderSentAt: now },
      });
    }

    return stale.length;
  }
}
