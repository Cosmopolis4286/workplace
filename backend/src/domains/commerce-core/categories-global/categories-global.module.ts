import { Module } from '@nestjs/common';
import { CategoriesGlobalController } from './categories-global.controller';
import { CategoriesGlobalService } from './categories-global.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriesGlobalController],
  providers: [CategoriesGlobalService],
  exports: [CategoriesGlobalService],
})
export class CategoriesGlobalModule {}
