import { Module } from '@nestjs/common';
import { PlatformFeesController } from './platform-fees.controller';
import { PlatformFeesService } from './platform-fees.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { WalletsModule } from '../wallets/wallets.module';
import { NotificationsModule } from '../../../notifications/notifications.module';

@Module({
  imports: [PrismaModule, WalletsModule, NotificationsModule],
  controllers: [PlatformFeesController],
  providers: [PlatformFeesService],
  exports: [PlatformFeesService],
})
export class PlatformFeesModule {}
