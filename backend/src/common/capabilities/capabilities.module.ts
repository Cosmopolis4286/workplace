import { Global, Module } from '@nestjs/common';
import { CapabilitiesService } from './capabilities.service';
import { CapabilityGuard } from '../guards/capability.guard';
import { ProfileContextGuard } from '../guards/profile-context.guard';

@Global()
@Module({
  providers: [CapabilitiesService, CapabilityGuard, ProfileContextGuard],
  exports: [CapabilitiesService, CapabilityGuard, ProfileContextGuard],
})
export class CapabilitiesModule {}
