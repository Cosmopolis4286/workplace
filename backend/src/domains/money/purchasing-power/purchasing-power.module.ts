import { Module } from '@nestjs/common';
import { PurchasingPowerService } from './purchasing-power.service';
import { PurchasingPowerController } from './purchasing-power.controller';

@Module({
  controllers: [PurchasingPowerController],
  providers: [PurchasingPowerService],
  exports: [PurchasingPowerService],
})
export class PurchasingPowerModule {}
