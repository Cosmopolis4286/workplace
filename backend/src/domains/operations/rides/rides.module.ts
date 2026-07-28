import { Module } from '@nestjs/common';
import { RidesController } from './rides.controller';
import { RidesService } from './rides.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformFeesModule } from '../domains/money/platform-fees/platform-fees.module';

@Module({
  imports: [PrismaModule, PlatformFeesModule],
  controllers: [RidesController],
  providers: [RidesService],
})
export class RidesModule {}
