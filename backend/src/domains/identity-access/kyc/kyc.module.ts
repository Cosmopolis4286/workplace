import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { KycPolicyService } from './kyc-policy.service';
import { MailModule } from '../../engagement/mail/mail.module';
import { PlatformSettingsModule } from '../../platform/platform-settings/platform-settings.module';

@Module({
  imports: [MailModule, PlatformSettingsModule],
  controllers: [KycController],
  providers: [KycService, KycPolicyService],
  exports: [KycService, KycPolicyService],
})
export class KycModule {}
