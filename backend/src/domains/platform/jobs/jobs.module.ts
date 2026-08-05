import { Module } from '@nestjs/common'
import { JobsController } from './jobs.controller'
import { JobsService } from './jobs.service'
import { NotificationsModule } from '../../engagement/notifications/notifications.module'
import { PlansModule } from '../../money/plans/plans.module'

@Module({
  imports: [NotificationsModule, PlansModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
