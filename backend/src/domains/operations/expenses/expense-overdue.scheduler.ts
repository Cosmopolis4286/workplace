import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExpenseStatus } from '@prisma/client';

// Marca como OVERDUE los gastos PENDING cuya fecha ya pasó. Sin este cron,
// OVERDUE solo se aplicaba si alguien lo seteaba manualmente vía updateStatus.
@Injectable()
export class ExpenseOverdueScheduler {
  private readonly logger = new Logger(ExpenseOverdueScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyOverdueCheck() {
    this.logger.log('Starting daily expense overdue check...');
    try {
      const result = await this.markOverdue();
      this.logger.log(`Daily expense overdue check completed: ${result.count} expense(s) marked OVERDUE`);
    } catch (error) {
      this.logger.error('Daily expense overdue check failed:', error);
    }
  }

  async markOverdue(now = new Date()) {
    return this.prisma.expense.updateMany({
      where: { status: ExpenseStatus.PENDING, date: { lt: now } },
      data: { status: ExpenseStatus.OVERDUE },
    });
  }
}
