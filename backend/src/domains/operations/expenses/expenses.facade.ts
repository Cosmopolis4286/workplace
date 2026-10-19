import type { ExpensesService } from './expenses.service';

/** Lectura de estadísticas de gastos para platform/reports. */
export type ExpensesFacade = Pick<
  ExpensesService,
  'getStats' | 'getPlatformStats'
>;

export const EXPENSES_FACADE = Symbol('EXPENSES_FACADE');
