import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AccountDeletionService } from './account-deletion.service';
import { MailModule } from '../../engagement/mail/mail.module';
import { CommerceProfileCompletionStrategy } from './strategies/commerce-profile-completion.strategy';
import { FreelancerProfileCompletionStrategy } from './strategies/freelancer-profile-completion.strategy';

@Module({
  imports: [MailModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    AccountDeletionService,
    CommerceProfileCompletionStrategy,
    FreelancerProfileCompletionStrategy,
  ],
  exports: [UsersService, AccountDeletionService],
})
export class UsersModule {}
