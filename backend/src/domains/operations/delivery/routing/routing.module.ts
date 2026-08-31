import { Module } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { OsrmProvider } from './providers/osrm.provider';

@Module({
  providers: [RoutingService, OsrmProvider],
  exports: [RoutingService],
})
export class RoutingModule {}
