import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { WalletPinService } from './wallet-pin.service';
import { WalletLimitsService } from './wallet-limits.service';

// No importa ServicesModule aunque WalletsService llama de vuelta a
// ServicesService (retryPendingEscrowsForClient) — eso crearía un ciclo de
// imports entre los dos .module.ts que Nest no logra resolver ni con
// forwardRef(). En su lugar, WalletsService resuelve ServicesService en
// runtime vía ModuleRef.get(token, { strict: false }), que busca en el
// contenedor global de la app sin necesitar la relación de módulos.
@Module({
  imports: [PrismaModule],
  controllers: [WalletsController],
  providers: [WalletsService, WalletPinService, WalletLimitsService],
  exports: [WalletsService, WalletPinService, WalletLimitsService],
})
export class WalletsModule {}
