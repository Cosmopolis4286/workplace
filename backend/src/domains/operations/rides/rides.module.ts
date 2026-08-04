import { Module } from '@nestjs/common';
import { RidesController } from './rides.controller';
import { RidesService } from './rides.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PlatformFeesModule } from '../../money/platform-fees/platform-fees.module';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';

@Module({
  imports: [PrismaModule, PlatformFeesModule, NotificationsModule],
  controllers: [RidesController],
  providers: [RidesService],
})
export class RidesModule {}
