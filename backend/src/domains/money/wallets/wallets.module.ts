import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { WalletPinService } from './wallet-pin.service';
import { WalletLimitsService } from './wallet-limits.service';
import { ServicesModule } from '../../commerce-core/services/services.module';

@Module({
  // forwardRef: ver comentario equivalente en ServicesModule.
  imports: [PrismaModule, forwardRef(() => ServicesModule)],
  controllers: [WalletsController],
  providers: [WalletsService, WalletPinService, WalletLimitsService],
  exports: [WalletsService, WalletPinService, WalletLimitsService],
})
export class WalletsModule {}
