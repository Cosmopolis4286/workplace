import { Module } from '@nestjs/common';
import { FreelancerApplicationsController } from './freelancer-applications.controller';
import { FreelancerApplicationsService } from './freelancer-applications.service';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [FreelancerApplicationsController],
  providers: [FreelancerApplicationsService],
  exports: [FreelancerApplicationsService],
})
export class FreelancerApplicationsModule {}
