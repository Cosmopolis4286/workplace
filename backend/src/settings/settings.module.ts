import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CategoryModule } from '../common/helpers/category.module';

@Module({
  imports: [PrismaModule, CategoryModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
