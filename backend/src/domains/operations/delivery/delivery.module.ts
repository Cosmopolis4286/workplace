import { Module } from '@nestjs/common';
import { DeliveryController } from './delivery.controller';
import { DriverInvitationsController } from './driver-invitations.controller';
import { DeliveryService } from './delivery.service';
import { DriverGraceReminderScheduler } from './driver-grace-reminder.scheduler';
import { PrismaModule } from '../../../prisma/prisma.module';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';
import { TelegramModule } from '../../engagement/telegram/telegram.module';
import { MailModule } from '../../engagement/mail/mail.module';

@Module({
  imports: [PrismaModule, NotificationsModule, TelegramModule, MailModule],
  controllers: [DeliveryController, DriverInvitationsController],
  providers: [DeliveryService, DriverGraceReminderScheduler],
})
export class DeliveryModule {}
