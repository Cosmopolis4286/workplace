import { Module } from '@nestjs/common';
import { PlatformFeesController } from './platform-fees.controller';
import { PlatformFeesService } from './platform-fees.service';
import { PLATFORM_FEES_FACADE } from './platform-fees.facade';
import { PrismaModule } from '../../../prisma/prisma.module';
import { WalletsModule } from '../wallets/wallets.module';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';

@Module({
  imports: [PrismaModule, WalletsModule, NotificationsModule],
  controllers: [PlatformFeesController],
  providers: [
    PlatformFeesService,
    { provide: PLATFORM_FEES_FACADE, useExisting: PlatformFeesService },
  ],
  // PlatformFeesService se sigue exportando para PlatformFeesController (intra-módulo,
  // administración SUPERADMIN). Consumidores de otros dominios deben inyectar
  // PLATFORM_FEES_FACADE — ver Fase 4 del refactor arquitectónico.
  exports: [PlatformFeesService, PLATFORM_FEES_FACADE],
})
export class PlatformFeesModule {}
