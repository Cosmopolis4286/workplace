import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';

// Toma una foto diaria del conteo de productos en LOW_STOCK por comercio.
// Es la única forma de graficar una tendencia real: el stock es mutable y
// no versionado, así que sin este snapshot no hay historial que consultar.
@Injectable()
export class StockSnapshotScheduler {
  private readonly logger = new Logger(StockSnapshotScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailySnapshot() {
    this.logger.log('Starting daily stock snapshot...');
    try {
      await this.takeSnapshot();
      this.logger.log('Daily stock snapshot completed successfully');
    } catch (error) {
      this.logger.error('Daily stock snapshot failed:', error);
    }
  }

  async takeSnapshot(date = new Date()) {
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const counts = await this.prisma.product.groupBy({
      by: ['commerceId'],
      where: { status: 'LOW_STOCK' },
      _count: { id: true },
    });

    await Promise.all(
      counts.map((c) =>
        this.prisma.productStockSnapshot.upsert({
          where: { commerceId_date: { commerceId: c.commerceId, date: day } },
          update: { lowStockCount: c._count.id },
          create: {
            commerceId: c.commerceId,
            date: day,
            lowStockCount: c._count.id,
          },
        })
      )
    );
  }
}
