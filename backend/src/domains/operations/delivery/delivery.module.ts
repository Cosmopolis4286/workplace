import { Module } from '@nestjs/common';
import { DeliveryController } from './delivery.controller';
import { DriverInvitationsController } from './driver-invitations.controller';
import { DeliveryService } from './delivery.service';
import { DriverGraceReminderScheduler } from './driver-grace-reminder.scheduler';
import { PrismaModule } from '../../../prisma/prisma.module';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';
import { TelegramModule } from '../../engagement/telegram/telegram.module';
import { MailModule } from '../../engagement/mail/mail.module';
import { ReputationModule } from '../../reputation/reputation.module';
import { TrackingModule } from './tracking/tracking.module';
import { PlansModule } from '../../money/plans/plans.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    TelegramModule,
    MailModule,
    ReputationModule,
    TrackingModule,
    PlansModule,
  ],
  controllers: [DeliveryController, DriverInvitationsController],
  providers: [DeliveryService, DriverGraceReminderScheduler],
})
export class DeliveryModule {}
