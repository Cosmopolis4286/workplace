import { Module } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PlansModule } from '../../money/plans/plans.module';

@Module({
  imports: [PrismaModule, PlansModule],
  controllers: [BranchesController],
  providers: [BranchesService],
})
export class BranchesModule {}
