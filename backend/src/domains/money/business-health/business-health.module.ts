import { Module } from '@nestjs/common';
import { BusinessHealthService } from './business-health.service';
import { BusinessHealthController } from './business-health.controller';

@Module({
  controllers: [BusinessHealthController],
  providers: [BusinessHealthService],
  exports: [BusinessHealthService],
})
export class BusinessHealthModule {}
