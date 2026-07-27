import { Global, Module } from '@nestjs/common';
import { AccountTypeResolver } from './account-type.resolver';

@Global()
@Module({
  providers: [AccountTypeResolver],
  exports: [AccountTypeResolver],
})
export class AccountTypeModule {}
