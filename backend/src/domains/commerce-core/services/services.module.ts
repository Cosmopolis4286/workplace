import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { ServiceRequestReminderScheduler } from './service-request-reminder.scheduler';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';
import { PlatformFeesModule } from '../../money/platform-fees/platform-fees.module';
import { MailModule } from '../../engagement/mail/mail.module';

@Module({
  imports: [NotificationsModule, PlatformFeesModule, MailModule],
  providers: [ServicesService, ServiceRequestReminderScheduler],
  controllers: [ServicesController],
  exports: [ServicesService],
})
export class ServicesModule {}
