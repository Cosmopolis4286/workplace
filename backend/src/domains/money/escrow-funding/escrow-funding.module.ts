import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ServicesModule } from '../../commerce-core/services/services.module';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { WalletsModule } from '../wallets/wallets.module';
import { EscrowFundingController } from './escrow-funding.controller';
import { EscrowFundingService } from './escrow-funding.service';

// Importa ServicesModule (no al revés): reintentar la retención de la
// solicitud pagada es una llamada unidireccional vía ServicesFacade.
@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    ExchangeRatesModule,
    WalletsModule,
    ServicesModule,
  ],
  controllers: [EscrowFundingController],
  providers: [EscrowFundingService],
})
export class EscrowFundingModule {}
