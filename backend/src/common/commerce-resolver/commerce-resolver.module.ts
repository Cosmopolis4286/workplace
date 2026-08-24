import { Global, Module } from '@nestjs/common';
import { CommerceResolverService } from './commerce-resolver.service';

@Global()
@Module({
  providers: [CommerceResolverService],
  exports: [CommerceResolverService],
})
export class CommerceResolverModule {}
