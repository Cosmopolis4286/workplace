import { Module, forwardRef } from '@nestjs/common';
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
  // forwardRef: WalletsModule necesita llamar de vuelta a ServicesService tras
  // un depósito (reintento de escrow pendiente por saldo), y ServicesModule
  // necesita WalletsService para retener/liberar/reembolsar — dependencia mutua
  // genuina entre los dos dominios, no un descuido de capas.
  imports: [NotificationsModule, PlatformFeesModule, MailModule, PlansModule, forwardRef(() => WalletsModule)],
  providers: [ServicesService, ServiceRequestReminderScheduler, EscrowRetryScheduler],
  controllers: [ServicesController],
  exports: [ServicesService],
})
export class ServicesModule {}
