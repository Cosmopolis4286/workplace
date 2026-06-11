import { Module } from '@nestjs/common';
import { CategoryHelper } from './category.helper';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CategoryHelper],
  exports: [CategoryHelper],
})
export class CategoryModule {}
