import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PlatformSettingsController } from './platform-settings.controller';
import { PlatformSettingsService } from './platform-settings.service';
import { KycPolicyService } from './kyc-policy.service';
import { KycApprovedGuard } from '../../../common/guards/kyc-approved.guard';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [PlatformSettingsController],
  providers: [PlatformSettingsService, KycPolicyService, KycApprovedGuard],
  exports: [PlatformSettingsService, KycPolicyService, KycApprovedGuard],
})
export class PlatformSettingsModule {}
