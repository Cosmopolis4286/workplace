import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { EXPENSES_FACADE } from './expenses.facade';
import { ExpensesController } from './expenses.controller';
import { ExpenseOverdueScheduler } from './expense-overdue.scheduler';
import { PlansModule } from '../../money/plans/plans.module';

@Module({
  imports: [PlansModule],
  controllers: [ExpensesController],
  providers: [
    ExpensesService,
    { provide: EXPENSES_FACADE, useExisting: ExpensesService },
    ExpenseOverdueScheduler,
  ],
  exports: [ExpensesService, EXPENSES_FACADE],
})
export class ExpensesModule {}
