import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SellerBillingService } from './seller-billing.service';

@Injectable()
export class SellerBillingCron {
  private readonly logger = new Logger(SellerBillingCron.name);

  constructor(private readonly billing: SellerBillingService) {}

  // Lunes 00:10 (Caracas): estado de cuenta de la semana que terminó.
  @Cron('10 0 * * 1', {
    name: 'seller-statements-issue',
    timeZone: 'America/Caracas',
  })
  async issueWeekly() {
    const { issued } = await this.billing.issueStatements();
    this.logger.log(`Estados de cuenta emitidos: ${issued}`);
  }

  // Cada hora: vencimientos (bloquea publicar) y suspensiones (pausa lo publicado).
  @Cron('20 * * * *', {
    name: 'seller-statements-deadlines',
    timeZone: 'America/Caracas',
  })
  async enforceDeadlines() {
    const result = await this.billing.enforceDeadlines();
    if (result.overdue || result.suspended) {
      this.logger.log(
        `Estados de cuenta vencidos: ${result.overdue}, suspendidos: ${result.suspended}`
      );
    }
  }
}
