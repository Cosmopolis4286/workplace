import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { MailService } from '../../engagement/mail/mail.service';

const REMINDER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // avisar cuando falten <= 7 días

// Avisa al comercio cuando un driver legado (sin cuenta propia) está por
// perder la capacidad de recibir asignaciones porque su graceUntil vence
// pronto. graceReminderSentAt evita reenviar el mismo aviso.
@Injectable()
export class DriverGraceReminderScheduler {
  private readonly logger = new Logger(DriverGraceReminderScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleReminderCheck() {
    try {
      await this.sendPendingReminders();
    } catch (error) {
      this.logger.error('Driver grace reminder check failed:', error);
    }
  }

  async sendPendingReminders(now = new Date()) {
    const reminderThreshold = new Date(now.getTime() + REMINDER_WINDOW_MS);

    const expiringSoon = await this.prisma.driver.findMany({
      where: {
        userId: null,
        isActive: true,
        graceUntil: { not: null, lte: reminderThreshold, gt: now },
        graceReminderSentAt: null,
      },
      include: {
        commerce: { select: { id: true, user: { select: { email: true } } } },
      },
    });

    for (const driver of expiringSoon) {
      if (!driver.graceUntil) continue;
      const daysLeft = Math.max(
        1,
        Math.ceil(
          (driver.graceUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        )
      );

      this.notifications
        .notifyDriverGraceExpiringSoon(driver.commerceId, driver.name, daysLeft)
        .catch(() => {});

      if (driver.commerce.user?.email) {
        this.mail
          .sendDriverGraceExpiringReminder(
            driver.commerce.user.email,
            driver.name,
            daysLeft
          )
          .catch(() => {});
      }

      await this.prisma.driver.update({
        where: { id: driver.id },
        data: { graceReminderSentAt: now },
      });
    }

    return expiringSoon.length;
  }
}
