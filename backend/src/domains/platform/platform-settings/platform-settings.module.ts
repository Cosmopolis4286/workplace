import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PlatformSettingsController } from './platform-settings.controller';
import { PlatformSettingsService } from './platform-settings.service';
import { KycPolicyService } from './kyc-policy.service';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformSettingsController],
  providers: [PlatformSettingsService, KycPolicyService],
  exports: [PlatformSettingsService, KycPolicyService],
})
export class PlatformSettingsModule {}
