import { Prisma } from '@prisma/client';
import { ExpensesService } from '../../domains/operations/expenses/expenses.service';

describe('ExpensesService.getStats', () => {
  const prisma = {
    expense: { aggregate: jest.fn(), groupBy: jest.fn() },
    expenseCategory: { aggregate: jest.fn() },
  };
  const service = new ExpensesService(prisma as any, {} as any, {} as any);

  beforeEach(() => jest.clearAllMocks());

  it('totales, variación y presupuesto exactos con montos Decimal', async () => {
    prisma.expense.aggregate
      .mockResolvedValueOnce({
        _sum: { amount: new Prisma.Decimal('0.30') },
        _count: 2,
      })
      .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal('0.20') } });
    prisma.expense.groupBy
      .mockResolvedValueOnce([
        {
          status: 'PENDING',
          _sum: { amount: new Prisma.Decimal('0.10') },
          _count: 1,
        },
        {
          status: 'PAID',
          _sum: { amount: new Prisma.Decimal('0.20') },
          _count: 1,
        },
      ])
      .mockResolvedValueOnce([]);
    prisma.expenseCategory.aggregate.mockResolvedValue({
      _sum: { budget: new Prisma.Decimal('1.20') },
    });

    const stats = await service.getStats('c1');

    expect(stats.totalMonthly).toBe(0.3);
    expect(stats.totalPrevMonth).toBe(0.2);
    expect(stats.changeVsPrev).toBe(50);
    expect(stats.pendingAmount).toBe(0.1);
    expect(stats.paidAmount).toBe(0.2);
    expect(stats.budgetTotal).toBe(1.2);
    expect(stats.budgetUsed).toBe(25);
    expect(typeof stats.dailyAverage).toBe('number');
  });

  it('sin gastos el mes anterior la variación es 0 (no Infinity)', async () => {
    prisma.expense.aggregate
      .mockResolvedValueOnce({
        _sum: { amount: new Prisma.Decimal('5') },
        _count: 1,
      })
      .mockResolvedValueOnce({ _sum: { amount: null } });
    prisma.expense.groupBy.mockResolvedValue([]);
    prisma.expenseCategory.aggregate.mockResolvedValue({
      _sum: { budget: null },
    });

    const stats = await service.getStats('c1');

    expect(stats.changeVsPrev).toBe(0);
    expect(stats.budgetUsed).toBe(0);
  });
});
