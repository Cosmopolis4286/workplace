import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UsageCreditsService } from './usage-credits.service';

@Injectable()
export class UsageCreditsCron {
  private readonly logger = new Logger(UsageCreditsCron.name);

  constructor(private readonly credits: UsageCreditsService) {}

  // Diario 00:30 (Caracas): vencen los créditos promocionales caducados.
  @Cron('30 0 * * *', {
    name: 'usage-credits-expire',
    timeZone: 'America/Caracas',
  })
  async expire() {
    if (!this.credits.isEnabled()) return;
    const { expired } = await this.credits.expirePromotional();
    if (expired) this.logger.log(`Lotes promocionales vencidos: ${expired}`);
  }
}
