import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PlansModule } from '../../money/plans/plans.module';

@Module({
  imports: [PrismaModule, PlansModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
