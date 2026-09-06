import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { ExpenseOverdueScheduler } from './expense-overdue.scheduler';

@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService, ExpenseOverdueScheduler],
  exports: [ExpensesService],
})
export class ExpensesModule {}
