import { Global, Module } from '@nestjs/common';
import { CommerceResolverService } from './commerce-resolver.service';
import { BusinessMembershipService } from './business-membership.service';

@Global()
@Module({
  providers: [CommerceResolverService, BusinessMembershipService],
  exports: [CommerceResolverService, BusinessMembershipService],
})
export class CommerceResolverModule {}
