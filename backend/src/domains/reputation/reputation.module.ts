import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReputationController } from './reputation.controller';
import { ReputationService } from './reputation.service';
import { REPUTATION_FACADE } from './reputation.facade';

@Module({
  imports: [PrismaModule],
  controllers: [ReputationController],
  providers: [ReputationService, { provide: REPUTATION_FACADE, useExisting: ReputationService }],
  // ReputationService se exporta directo para uso intra-módulo; consumidores
  // de otros dominios (services, orders, delivery, reports) deben inyectar
  // REPUTATION_FACADE — mismo patrón que money/platform-fees.
  exports: [ReputationService, REPUTATION_FACADE],
})
export class ReputationModule {}
