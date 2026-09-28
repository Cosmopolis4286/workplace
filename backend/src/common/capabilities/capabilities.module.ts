import { Global, Module } from '@nestjs/common';
import { CapabilitiesService } from './capabilities.service';
import { CapabilityGuard } from '../guards/capability.guard';

@Global()
@Module({
  providers: [CapabilitiesService, CapabilityGuard],
  exports: [CapabilitiesService, CapabilityGuard],
})
export class CapabilitiesModule {}
