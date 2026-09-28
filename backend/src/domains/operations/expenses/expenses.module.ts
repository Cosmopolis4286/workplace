import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { ExpenseOverdueScheduler } from './expense-overdue.scheduler';
import { PlansModule } from '../../money/plans/plans.module';

@Module({
  imports: [PlansModule],
  controllers: [ExpensesController],
  providers: [ExpensesService, ExpenseOverdueScheduler],
  exports: [ExpensesService],
})
export class ExpensesModule {}
