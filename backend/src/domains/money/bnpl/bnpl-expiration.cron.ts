import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BnplService } from './bnpl.service';

@Injectable()
export class BnplExpirationCron {
  private readonly logger = new Logger(BnplExpirationCron.name);

  constructor(private readonly bnplService: BnplService) {}

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'bnpl-expire-pending' })
  async handleExpiration() {
    try {
      await this.bnplService.expirePending();
    } catch (error) {
      this.logger.error(
        'Fallo al expirar transacciones BNPL pendientes:',
        error
      );
    }
  }
}
