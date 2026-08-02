import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ServicesService } from './services.service';

// Respaldo del hook de depósito (WalletsService.deposit → retryPendingEscrowsForClient):
// por si el hook falla o el saldo llegó por otra vía (ej. ajuste manual de admin).
@Injectable()
export class EscrowRetryScheduler {
  private readonly logger = new Logger(EscrowRetryScheduler.name);

  constructor(private readonly services: ServicesService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleRetryCheck() {
    try {
      const { checked, resolved } = await this.services.retryAllPendingEscrows();
      if (checked > 0) {
        this.logger.log(`Escrow retry: ${resolved}/${checked} resueltas`);
      }
    } catch (error) {
      this.logger.error('Escrow retry check failed:', error);
    }
  }
}
