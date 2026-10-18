import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseStatus } from '@prisma/client';
import { ExpenseOverdueScheduler } from '../../domains/operations/expenses/expense-overdue.scheduler';
import { PrismaService } from '../../prisma/prisma.service';

describe('ExpenseOverdueScheduler', () => {
  let scheduler: ExpenseOverdueScheduler;
  let mockPrismaService: any;

  beforeEach(async () => {
    mockPrismaService = {
      expense: { updateMany: jest.fn().mockResolvedValue({ count: 3 }) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseOverdueScheduler,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    scheduler = module.get<ExpenseOverdueScheduler>(ExpenseOverdueScheduler);
  });

  describe('markOverdue', () => {
    it('marca OVERDUE solo los gastos PENDING con fecha anterior a la actual', async () => {
      const now = new Date('2026-09-06T00:00:00Z');

      await scheduler.markOverdue(now);

      expect(mockPrismaService.expense.updateMany).toHaveBeenCalledWith({
        where: { status: ExpenseStatus.PENDING, date: { lt: now } },
        data: { status: ExpenseStatus.OVERDUE },
      });
    });

    it('devuelve el conteo de gastos actualizados', async () => {
      const result = await scheduler.markOverdue(new Date());

      expect(result).toEqual({ count: 3 });
    });
  });
});
