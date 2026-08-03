import { Module } from '@nestjs/common';
import { WalletDepositRequestsController } from './wallet-deposit-requests.controller';
import { WalletDepositRequestsService } from './wallet-deposit-requests.service';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [WalletsModule],
  controllers: [WalletDepositRequestsController],
  providers: [WalletDepositRequestsService],
  exports: [WalletDepositRequestsService],
})
export class WalletDepositRequestsModule {}
