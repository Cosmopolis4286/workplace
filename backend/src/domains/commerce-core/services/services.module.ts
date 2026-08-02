import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { ServiceRequestReminderScheduler } from './service-request-reminder.scheduler';
import { EscrowRetryScheduler } from './escrow-retry.scheduler';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';
import { PlatformFeesModule } from '../../money/platform-fees/platform-fees.module';
import { MailModule } from '../../engagement/mail/mail.module';
import { PlansModule } from '../../money/plans/plans.module';
import { WalletsModule } from '../../money/wallets/wallets.module';

@Module({
  // ServicesService necesita WalletsService para retener/liberar/reembolsar
  // escrow — dependencia unidireccional normal. WalletsService, a su vez,
  // llama de vuelta a ServicesService (reintento tras depósito) sin declarar
  // este módulo como import — ver comentario en wallets.module.ts.
  imports: [NotificationsModule, PlatformFeesModule, MailModule, PlansModule, WalletsModule],
  providers: [ServicesService, ServiceRequestReminderScheduler, EscrowRetryScheduler],
  controllers: [ServicesController],
  exports: [ServicesService],
})
export class ServicesModule {}
