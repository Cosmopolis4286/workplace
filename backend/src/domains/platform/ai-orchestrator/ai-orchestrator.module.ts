import { Module } from '@nestjs/common';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { AiOrchestratorController } from './ai-orchestrator.controller';
import { ServicesModule } from '../../commerce-core/services/services.module';

@Module({
  imports: [ServicesModule],
  providers: [AiOrchestratorService],
  controllers: [AiOrchestratorController],
})
export class AiOrchestratorModule {}
