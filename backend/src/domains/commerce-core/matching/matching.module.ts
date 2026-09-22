import { Module } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { MatchingController } from './matching.controller';
import { MATCHING_FACADE } from './matching.facade';
import { ReputationModule } from '../../reputation/reputation.module';

@Module({
  imports: [ReputationModule],
  controllers: [MatchingController],
  providers: [MatchingService, { provide: MATCHING_FACADE, useExisting: MatchingService }],
  // MatchingService se exporta directo para uso intra-módulo; consumidores
  // externos (SearchModule hoy, AI Orchestrator a futuro) deben inyectar
  // MATCHING_FACADE — mismo patrón que ReputationModule/PlatformFeesModule.
  exports: [MatchingService, MATCHING_FACADE],
})
export class MatchingModule {}
