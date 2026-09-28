import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BcvSyncService } from './bcv-sync.service';

@Injectable()
export class BcvSyncCron implements OnModuleInit {
  private readonly logger = new Logger(BcvSyncCron.name);

  constructor(private readonly bcvSyncService: BcvSyncService) {}

  /**
   * Corre una vez al arrancar el backend — garantiza que VES (BCV) exista y
   * sea la moneda predeterminada de la app incluso en un ambiente nuevo
   * donde nunca se creó a mano (no está en seed.js). Sin esto, la app podía
   * quedar sin ninguna moneda default hasta que un admin entrara a
   * /exchange-rates y la configurara manualmente. best-effort: un fallo acá
   * no debe impedir que el resto del backend arranque.
   */
  async onModuleInit() {
    try {
      await this.bcvSyncService.ensureDefaultRate();
    } catch (error) {
      this.logger.error(`ensureDefaultRate on startup failed: ${error.message}`);
    }
  }

  /**
   * Main sync runs 4x/day, Monday–Friday (7 AM, 10 AM, 1 PM, 5 PM VET — the
   * last one after BCV publishes, ~4:30-5 PM). A single 5 PM/day run meant
   * one failed attempt (network blip, BCV site down, changed HTML) went
   * uncorrected for a full day — this gives three earlier chances to catch
   * and self-heal a failure well before it goes stale. The hourly health
   * check (below) and the on-read ensureFreshRate() safety net cover the
   * gaps between these fixed slots.
   */
  @Cron('0 7 * * 1-5', { name: 'bcv-sync-early', timeZone: 'America/Caracas' })
  async handleEarlySync() {
    await this.runSync('early (7 AM)');
  }

  @Cron('0 10 * * 1-5', { name: 'bcv-sync-morning', timeZone: 'America/Caracas' })
  async handleMorningSync() {
    await this.runSync('morning (10 AM)');
  }

  @Cron('0 13 * * 1-5', { name: 'bcv-sync-midday', timeZone: 'America/Caracas' })
  async handleMiddaySync() {
    await this.runSync('midday (1 PM)');
  }

  @Cron('0 17 * * 1-5', { name: 'bcv-sync-afternoon', timeZone: 'America/Caracas' })
  async handleAfternoonSync() {
    await this.runSync('afternoon (5 PM)');
  }

  /**
   * BCV doesn't publish on weekends, but if a currency has been failing to
   * sync all week, waiting until Monday 9 AM to notice would push staleness
   * well past this system's 6h threshold. This just re-attempts using
   * whatever the last known-good rate window was (scraping still works,
   * it just won't have moved since Friday).
   */
  @Cron('0 12 * * 0,6', { name: 'bcv-sync-weekend-check', timeZone: 'America/Caracas' })
  async handleWeekendCheck() {
    await this.runSync('weekend check');
  }

  private async runSync(label: string) {
    this.logger.log(`Starting scheduled BCV sync (${label})...`);

    try {
      const currencies = await this.bcvSyncService.getAllSyncStatuses();

      if (currencies.length === 0) {
        this.logger.log('No currencies have auto-sync enabled');
        return;
      }

      const results = await Promise.allSettled(
        currencies.map(c => this.bcvSyncService.syncCurrency(c.currencyCode)),
      );

      let successCount = 0;
      let failureCount = 0;

      results.forEach((result, index) => {
        const code = currencies[index].currencyCode;
        if (result.status === 'fulfilled') {
          successCount++;
          this.logger.log(
            `✅ ${code}: Synced from ${result.value.source} at rate ${result.value.rate} (confidence: ${result.value.confidence})`,
          );
        } else {
          failureCount++;
          this.logger.error(`❌ ${code}: Failed to sync - ${result.reason.message}`);
        }
      });

      this.logger.log(
        `BCV sync (${label}) completed: ${successCount} successful, ${failureCount} failed`,
      );
    } catch (error) {
      this.logger.error(`Scheduled BCV sync (${label}) failed: ${error.message}`);
    }
  }

  /**
   * Health check every hour to alert if rates are stale, and to self-heal by
   * re-syncing. Runs far more often than the 3 scheduled syncs so a failure
   * is caught and retried within an hour instead of waiting for the next
   * scheduled slot. Covers every currency with auto-sync enabled (not just
   * VES), so enabling auto-sync on a new currency (e.g. COP) is automatically
   * monitored too.
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'bcv-health-check',
  })
  async handleHealthCheck() {
    // Refuerzo recurrente de ensureDefaultRate() (además de onModuleInit):
    // cubre el caso de que alguien borre/desactive la fila VES o le quite el
    // default DESPUÉS del arranque, sin esperar al próximo restart/deploy.
    // Va ANTES del early-return de abajo a propósito — si VES no existe
    // todavía, statuses.length sería 0 y el chequeo de staleness ni se
    // ejecutaría sin esto.
    try {
      await this.bcvSyncService.ensureDefaultRate();
    } catch (error) {
      this.logger.error(`ensureDefaultRate in health check failed: ${error.message}`);
    }

    try {
      const statuses = await this.bcvSyncService.getAllSyncStatuses();

      if (statuses.length === 0) {
        this.logger.debug('No currencies with auto-sync enabled');
        return;
      }

      for (const status of statuses) {
        if (!status.isStale) {
          this.logger.debug(`${status.currencyCode} rate is fresh. Last sync: ${status.lastSyncAt?.toISOString()}`);
          continue;
        }

        this.logger.warn(
          `⚠️ ${status.currencyCode} rate is stale. Last sync: ${status.lastSyncAt?.toISOString() || 'never'}`,
        );

        this.logger.log(`Attempting automatic re-sync for ${status.currencyCode}...`);
        try {
          await this.bcvSyncService.syncCurrency(status.currencyCode);
          this.logger.log(`✅ Auto-repair sync successful for ${status.currencyCode}`);
        } catch (error) {
          this.logger.error(`Auto-repair sync failed for ${status.currencyCode}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
    }
  }

  /**
   * Manual trigger for sync (can be called programmatically)
   */
  async triggerManualSync(currencyCode?: string): Promise<{ success: boolean; message: string }> {
    try {
      const code = currencyCode || 'VES';
      const result = await this.bcvSyncService.syncCurrency(code);

      return {
        success: true,
        message: `Successfully synced ${code} from ${result.source} at rate ${result.rate}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to sync: ${error.message}`,
      };
    }
  }
}
