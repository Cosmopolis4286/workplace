import { Module } from '@nestjs/common';
import { AccountReceivablesService } from './account-receivables.service';
import { AccountReceivablesController } from './account-receivables.controller';
import { AccountPayablesService } from './account-payables.service';
import { AccountPayablesController } from './account-payables.controller';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';

@Module({
  imports: [ExchangeRatesModule],
  controllers: [AccountReceivablesController, AccountPayablesController],
  providers: [AccountReceivablesService, AccountPayablesService],
  exports: [AccountReceivablesService, AccountPayablesService],
})
export class AccountsModule {}
