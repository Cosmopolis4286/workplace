import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BcvSyncService } from './bcv-sync.service';

@Injectable()
export class BcvSyncCron {
  private readonly logger = new Logger(BcvSyncCron.name);

  constructor(private readonly bcvSyncService: BcvSyncService) {}

  /**
   * Run BCV sync every day at 5:00 PM Venezuela time (after BCV publishes rates)
   * BCV typically publishes rates between 4:30 PM - 5:00 PM VET
   * 
   * Cron: 0 17 * * 1-5 = At 17:00 (5 PM) Monday through Friday
   * 
   * Note: Server should be configured with Venezuela timezone (America/Caracas)
   * or this will run at 5 PM server time
   */
  @Cron('0 17 * * 1-5', {
    name: 'bcv-daily-sync',
    timeZone: 'America/Caracas', // Venezuela timezone
  })
  async handleDailySync() {
    this.logger.log('Starting scheduled BCV sync...');

    try {
      // Get all currencies with auto-sync enabled that need syncing
      const currenciesToSync = await this.bcvSyncService.getCurrenciesNeedingSync();

      if (currenciesToSync.length === 0) {
        this.logger.log('No currencies need syncing at this time');
        return;
      }

      this.logger.log(`Found ${currenciesToSync.length} currencies to sync`);

      // Sync each currency
      const results = await Promise.allSettled(
        currenciesToSync.map(code => this.bcvSyncService.syncCurrency(code)),
      );

      // Log results
      let successCount = 0;
      let failureCount = 0;

      results.forEach((result, index) => {
        const code = currenciesToSync[index];
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
        `BCV sync completed: ${successCount} successful, ${failureCount} failed`,
      );
    } catch (error) {
      this.logger.error(`Scheduled BCV sync failed: ${error.message}`);
    }
  }

  /**
   * Health check every 2 hours to alert if rates are stale
   * This doesn't sync, just checks and logs warnings
   */
  @Cron(CronExpression.EVERY_2_HOURS, {
    name: 'bcv-health-check',
  })
  async handleHealthCheck() {
    try {
      const vesStatus = await this.bcvSyncService.getSyncStatus('VES');

      if (!vesStatus) {
        this.logger.warn('VES currency not found in database');
        return;
      }

      if (vesStatus.isStale) {
        this.logger.warn(
          `⚠️ VES rate is stale. Last sync: ${vesStatus.lastSyncAt?.toISOString() || 'never'}`,
        );

        // Try to auto-repair if auto-sync is enabled
        if (vesStatus.autoSync && vesStatus.syncAttempts < 3) {
          this.logger.log('Attempting automatic re-sync...');
          try {
            await this.bcvSyncService.syncCurrency('VES');
            this.logger.log('✅ Auto-repair sync successful');
          } catch (error) {
            this.logger.error(`Auto-repair sync failed: ${error.message}`);
          }
        }
      } else {
        this.logger.debug(`VES rate is fresh. Last sync: ${vesStatus.lastSyncAt?.toISOString()}`);
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
