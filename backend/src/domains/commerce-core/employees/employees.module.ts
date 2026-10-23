import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EMPLOYEES_FACADE } from './employees.facade';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PlansModule } from '../../money/plans/plans.module';

@Module({
  imports: [PrismaModule, PlansModule],
  controllers: [EmployeesController],
  providers: [
    EmployeesService,
    { provide: EMPLOYEES_FACADE, useExisting: EmployeesService },
  ],
  exports: [EmployeesService, EMPLOYEES_FACADE],
})
export class EmployeesModule {}
