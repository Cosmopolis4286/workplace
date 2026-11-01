import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { WalletPinService } from './wallet-pin.service';
import { WalletLimitsService } from './wallet-limits.service';
import { WalletWithdrawalsService } from './wallet-withdrawals.service';
import { WalletWithdrawalsController } from './wallet-withdrawals.controller';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';

// No importa ServicesModule aunque WalletsService llama de vuelta a
// ServicesService (retryPendingEscrowsForClient) — eso crearía un ciclo de
// imports entre los dos .module.ts que Nest no logra resolver ni con
// forwardRef(). En su lugar, WalletsService resuelve ServicesService en
// runtime vía ModuleRef.get(token, { strict: false }), que busca en el
// contenedor global de la app sin necesitar la relación de módulos.
@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [WalletsController, WalletWithdrawalsController],
  providers: [
    WalletsService,
    WalletPinService,
    WalletLimitsService,
    WalletWithdrawalsService,
  ],
  exports: [WalletsService, WalletPinService, WalletLimitsService],
})
export class WalletsModule {}
