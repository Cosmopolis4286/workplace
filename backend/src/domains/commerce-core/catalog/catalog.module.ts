import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { EscrowModule } from '../../money/escrow/escrow.module';
import { PlatformFeesModule } from '../../money/platform-fees/platform-fees.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    EscrowModule,
    PlatformFeesModule,
  ],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
