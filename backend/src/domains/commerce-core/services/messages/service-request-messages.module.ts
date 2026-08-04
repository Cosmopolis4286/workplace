import { Module } from '@nestjs/common';
import { ServiceRequestMessagesController } from './service-request-messages.controller';
import { ServiceRequestMessagesService } from './service-request-messages.service';
import { NotificationsModule } from '../../../engagement/notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ServiceRequestMessagesController],
  providers: [ServiceRequestMessagesService],
})
export class ServiceRequestMessagesModule {}
