import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CatalogService } from './catalog.service';

// Plazos de la garantía de pedidos de catálogo: reembolsa lo que el comercio
// no atendió y libera lo que el comprador no confirmó (ver
// CatalogService.enforceEscrowDeadlines).
@Injectable()
export class CatalogEscrowDeadlinesScheduler {
  private readonly logger = new Logger(CatalogEscrowDeadlinesScheduler.name);

  constructor(private readonly catalog: CatalogService) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'catalog-escrow-deadlines' })
  async handle() {
    try {
      const { refunded, released } =
        await this.catalog.enforceEscrowDeadlines();
      if (refunded || released) {
        this.logger.log(
          `Garantías de catálogo: ${refunded} reembolsadas, ${released} liberadas`
        );
      }
    } catch (error) {
      this.logger.error('Falló el control de plazos de garantía', error);
    }
  }
}
