import { Module } from '@nestjs/common';
import { GroupBuyingService } from './group-buying.service';
import { GroupBuyingController } from './group-buying.controller';
import { PlatformFeesModule } from '../../money/platform-fees/platform-fees.module';
import { PlansModule } from '../../money/plans/plans.module';

@Module({
  imports: [PlatformFeesModule, PlansModule],
  controllers: [GroupBuyingController],
  providers: [GroupBuyingService],
  exports: [GroupBuyingService],
})
export class GroupBuyingModule {}
