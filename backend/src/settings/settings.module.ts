import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PlansModule } from '../plans/plans.module';
import { CommerceSettingsStrategy } from './strategies/commerce-settings.strategy';
import { FreelancerSettingsStrategy } from './strategies/freelancer-settings.strategy';

@Module({
  imports: [PrismaModule, PlansModule],
  controllers: [SettingsController],
  providers: [SettingsService, CommerceSettingsStrategy, FreelancerSettingsStrategy],
})
export class SettingsModule {}
