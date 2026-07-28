import { Module } from '@nestjs/common';
import { ProposedCategoriesController } from './proposed-categories.controller';
import { ProposedCategoriesService } from './proposed-categories.service';
import { MailModule } from '../../engagement/mail/mail.module';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';

@Module({
  imports: [MailModule, NotificationsModule],
  controllers: [ProposedCategoriesController],
  providers: [ProposedCategoriesService],
  exports: [ProposedCategoriesService],
})
export class ProposedCategoriesModule {}
