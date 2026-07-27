import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MailModule } from '../mail/mail.module';
import { CommerceProfileCompletionStrategy } from './strategies/commerce-profile-completion.strategy';
import { FreelancerProfileCompletionStrategy } from './strategies/freelancer-profile-completion.strategy';

@Module({
  imports: [MailModule],
  controllers: [UsersController],
  providers: [UsersService, CommerceProfileCompletionStrategy, FreelancerProfileCompletionStrategy],
  exports: [UsersService],
})
export class UsersModule {}
