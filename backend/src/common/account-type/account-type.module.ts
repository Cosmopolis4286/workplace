import { Global, Module } from '@nestjs/common';
import { AccountTypeResolver } from './account-type.resolver';
import { RoleResolverService } from './role-resolver.service';

@Global()
@Module({
  providers: [AccountTypeResolver, RoleResolverService],
  exports: [AccountTypeResolver, RoleResolverService],
})
export class AccountTypeModule {}
