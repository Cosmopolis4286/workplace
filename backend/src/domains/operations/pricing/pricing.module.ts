import { Module } from '@nestjs/common';
import { PriceGuardService } from './price-guard.service';
import { PriceGuardController } from './price-guard.controller';
import { PurchasesModule } from '../purchases/purchases.module';

@Module({
  imports: [PurchasesModule],
  controllers: [PriceGuardController],
  providers: [PriceGuardService],
  exports: [PriceGuardService],
})
export class PricingModule {}
