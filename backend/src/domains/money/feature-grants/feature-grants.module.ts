import { Module } from '@nestjs/common';
import { FeatureGrantsService } from './feature-grants.service';
import { FeatureGrantsController } from './feature-grants.controller';
import { FeatureGrantsScheduler } from './feature-grants.scheduler';

@Module({
  controllers: [FeatureGrantsController],
  providers: [FeatureGrantsService, FeatureGrantsScheduler],
  exports: [FeatureGrantsService],
})
export class FeatureGrantsModule {}
