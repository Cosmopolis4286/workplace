import { Module } from '@nestjs/common';
import { ProfileActivationsController } from './profile-activations.controller';
import { ProfileActivationsService } from './profile-activations.service';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ProfileActivationsController],
  providers: [ProfileActivationsService],
  exports: [ProfileActivationsService],
})
export class ProfileActivationsModule {}
