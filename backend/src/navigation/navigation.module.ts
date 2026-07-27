import { Module } from '@nestjs/common';
import { PlansModule } from '../plans/plans.module';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';

@Module({
  imports: [PlansModule], // exporta PlanLimitsService; PermissionsService ya es @Global()
  controllers: [NavigationController],
  providers: [NavigationService],
})
export class NavigationModule {}
