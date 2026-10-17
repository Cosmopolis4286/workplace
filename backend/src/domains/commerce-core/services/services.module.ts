import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { ServiceRequestReminderScheduler } from './service-request-reminder.scheduler';
import { EscrowRetryScheduler } from './escrow-retry.scheduler';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';
import { PlatformFeesModule } from '../../money/platform-fees/platform-fees.module';
import { MailModule } from '../../engagement/mail/mail.module';
import { PlansModule } from '../../money/plans/plans.module';
import { EscrowModule } from '../../money/escrow/escrow.module';
import { ReputationModule } from '../../reputation/reputation.module';

@Module({
  // ServicesService necesita EscrowFacade para retener/liberar/reembolsar
  // escrow (que a su vez envuelve WalletsService, ver escrow.module.ts) —
  // dependencia unidireccional normal. WalletsService, del lado opuesto,
  // llama de vuelta a ServicesService (reintento tras depósito) sin declarar
  // este módulo como import — ver comentario en wallets.module.ts.
  imports: [
    NotificationsModule,
    PlatformFeesModule,
    MailModule,
    PlansModule,
    EscrowModule,
    ReputationModule,
  ],
  providers: [
    ServicesService,
    ServiceRequestReminderScheduler,
    EscrowRetryScheduler,
  ],
  controllers: [ServicesController],
  exports: [ServicesService],
})
export class ServicesModule {}
