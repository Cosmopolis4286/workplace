import { Module } from '@nestjs/common';
import { AlertEngineService } from './alert-engine.service';
import { AlertEngineController } from './alert-engine.controller';

@Module({
  controllers: [AlertEngineController],
  providers: [AlertEngineService],
  exports: [AlertEngineService],
})
export class AlertEngineModule {}
