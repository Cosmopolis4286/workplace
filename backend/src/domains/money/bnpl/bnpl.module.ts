import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';
import { TelegramModule } from '../../engagement/telegram/telegram.module';
import { BnplController } from './bnpl.controller';
import { BnplWebhookController } from './bnpl-webhook.controller';
import { BnplService } from './bnpl.service';
import { BnplExpirationCron } from './bnpl-expiration.cron';
import { SimulatedAdapter } from './adapters/simulated.adapter';
import { CasheaAdapter } from './adapters/cashea.adapter';
import { KreceAdapter } from './adapters/krece.adapter';

@Module({
  imports: [PrismaModule, NotificationsModule, TelegramModule],
  controllers: [BnplController, BnplWebhookController],
  providers: [
    BnplService,
    SimulatedAdapter,
    CasheaAdapter,
    KreceAdapter,
    BnplExpirationCron,
  ],
  exports: [BnplService],
})
export class BnplModule {}
