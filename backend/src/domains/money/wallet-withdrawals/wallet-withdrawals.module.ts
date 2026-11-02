import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { PaymentsModule } from '../payments/payments.module';
import { WalletsModule } from '../wallets/wallets.module';
import { WalletWithdrawalsController } from './wallet-withdrawals.controller';
import { WalletWithdrawalsService } from './wallet-withdrawals.service';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    ExchangeRatesModule,
    PaymentsModule,
    WalletsModule,
  ],
  controllers: [WalletWithdrawalsController],
  providers: [WalletWithdrawalsService],
})
export class WalletWithdrawalsModule {}
