import { Module } from '@nestjs/common';
import { EscrowService } from './escrow.service';
import { ESCROW_FACADE } from './escrow.facade';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [WalletsModule],
  providers: [EscrowService, { provide: ESCROW_FACADE, useExisting: EscrowService }],
  // EscrowService se exporta directo para uso intra-módulo; consumidores
  // externos (services, catalog) deben inyectar ESCROW_FACADE — mismo
  // patrón que ReputationModule/PlatformFeesModule.
  exports: [EscrowService, ESCROW_FACADE],
})
export class EscrowModule {}
