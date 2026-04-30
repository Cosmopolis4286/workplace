import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

export interface BCVRateResult {
  rate: number;
  date: string; // YYYY-MM-DD
  source: 'BCV_SCRAPING' | 'BCV_API' | 'API_FALLBACK';
  confidence: 'high' | 'medium' | 'low';
  rawData?: any;
}

export interface SyncStatus {
  currencyCode: string;
  lastSyncAt: Date | null;
  syncSource: string | null;
  syncError: string | null;
  syncAttempts: number;
  autoSync: boolean;
  currentRate: number | null;
  isStale: boolean;
}

@Injectable()
export class BcvSyncService {
  private readonly logger = new Logger(BcvSyncService.name);

  // BCV official website
  private readonly BCV_URL = 'https://www.bcv.org.ve';
  // Alternative APIs for fallback
  private readonly FALLBACK_APIS = [
    'https://api.exchangerate-api.com/v4/latest/USD',
    'https://open.er-api.com/v6/latest/USD',
  ];

  // Venezuela timezone
  private readonly VENEZUELA_TZ = 'America/Caracas';
  // Cache TTL: 24 hours in seconds
  private readonly CACHE_TTL = 24 * 60 * 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Main sync method - tries scraping first, then API fallback
   */
  async syncCurrency(currencyCode: string = 'VES'): Promise<BCVRateResult> {
    const cacheKey = `bcv_rate:${currencyCode}`;

    try {
      // 1. Try BCV scraping (primary source)
      const scrapingResult = await this.fetchFromBCVScraping();
      if (scrapingResult) {
        await this.updateCurrencyRate(currencyCode, scrapingResult);
        await this.cacheResult(cacheKey, scrapingResult);
        await this.resetSyncAttempts(currencyCode);
        this.logger.log(`BCV scraping successful: ${scrapingResult.rate} VES/USD`);
        return scrapingResult;
      }
    } catch (error) {
      this.logger.warn(`BCV scraping failed: ${error.message}`);
    }

    try {
      // 2. Try external API fallback
      const apiResult = await this.fetchFromExternalAPI();
      if (apiResult) {
        await this.updateCurrencyRate(currencyCode, apiResult);
        await this.cacheResult(cacheKey, apiResult);
        await this.resetSyncAttempts(currencyCode);
        this.logger.log(`API fallback successful: ${apiResult.rate} VES/USD`);
        return apiResult;
      }
    } catch (error) {
      this.logger.error(`API fallback failed: ${error.message}`);
    }

    // 3. All sources failed - increment attempts and throw
    await this.incrementSyncAttempts(currencyCode, 'All sync sources failed');
    throw new Error(`Failed to sync ${currencyCode} from all sources`);
  }

  /**
   * Get cached rate or fetch new one
   */
  async getCurrentRate(currencyCode: string = 'VES'): Promise<BCVRateResult | null> {
    const cacheKey = `bcv_rate:${currencyCode}`;

    // Try cache first
    const cached = await this.getCachedResult(cacheKey);
    if (cached) {
      this.logger.debug(`Returning cached rate for ${currencyCode}`);
      return cached;
    }

    // If no cache, try to sync
    try {
      return await this.syncCurrency(currencyCode);
    } catch (error) {
      this.logger.error(`Failed to get current rate: ${error.message}`);
      return null;
    }
  }

  /**
   * Get sync status for a currency
   */
  async getSyncStatus(currencyCode: string = 'VES'): Promise<SyncStatus | null> {
    const currency = await this.prisma.exchangeRate.findUnique({
      where: { code: currencyCode.toUpperCase() },
    });

    if (!currency) return null;

    const isStale = currency.lastSyncAt
      ? this.isRateStale(currency.lastSyncAt)
      : true;

    return {
      currencyCode: currency.code,
      lastSyncAt: currency.lastSyncAt,
      syncSource: currency.syncSource,
      syncError: currency.syncError,
      syncAttempts: currency.syncAttempts,
      autoSync: currency.autoSync,
      currentRate: currency.rateToUsd,
      isStale,
    };
  }

  /**
   * Enable/disable auto-sync for a currency
   */
  async setAutoSync(currencyCode: string, enabled: boolean): Promise<void> {
    await this.prisma.exchangeRate.update({
      where: { code: currencyCode.toUpperCase() },
      data: { autoSync: enabled },
    });
    this.logger.log(`Auto-sync ${enabled ? 'enabled' : 'disabled'} for ${currencyCode}`);
  }

  /**
   * Check if any currencies need sync (for cron job)
   */
  async getCurrenciesNeedingSync(): Promise<string[]> {
    const currencies = await this.prisma.exchangeRate.findMany({
      where: {
        autoSync: true,
        isActive: true,
        OR: [
          { lastSyncAt: null },
          {
            lastSyncAt: {
              lt: this.getYesterdayInVenezuela(),
            },
          },
        ],
      },
    });

    return currencies.map(c => c.code);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCRAPING LOGIC
  // ─────────────────────────────────────────────────────────────────────────────

  private async fetchFromBCVScraping(): Promise<BCVRateResult | null> {
    try {
      const response = await axios.get(this.BCV_URL, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-VE,es;q=0.9',
        },
      });

      const $ = cheerio.load(response.data);

      // BCV typically shows rates in a specific format
      // Look for USD rate in the page
      const rateText = this.extractRateFromHTML($);

      if (!rateText) {
        throw new Error('Could not extract rate from BCV page');
      }

      const rate = this.parseRate(rateText);
      const date = this.getEffectiveDateForVenezuela();

      // Validate the rate is reasonable (BCV rate typically 20-100 VES/USD)
      if (rate < 1 || rate > 1000) {
        throw new Error(`Rate ${rate} seems unreasonable`);
      }

      return {
        rate,
        date,
        source: 'BCV_SCRAPING',
        confidence: 'high',
        rawData: { url: this.BCV_URL, extractedText: rateText },
      };
    } catch (error) {
      this.logger.error(`BCV scraping error: ${error.message}`);
      return null;
    }
  }

  private extractRateFromHTML($: cheerio.CheerioAPI): string | null {
    // BCV website selectors based on actual HTML structure
    // Reference: <div id="dolar"><div class="centrado"><strong>487,11920000</strong></div></div>
    const selectors = [
      '#dolar .centrado strong',              // Current BCV format (screenshot confirmed)
      '#dolar strong',                        // Simplified selector
      '#dolar .col-sm-6.centrado strong',     // With bootstrap grid class
      '#euro .centrado strong',               // Euro rate (same structure)
      '#dolar .recuadro .centrado strong',    // Legacy BCV format
      '.tipo-cambio .valor',
      '[data-currency="USD"] .rate',
      'table.tipo-cambio td:contains("USD")',
      '.exchange-rate:contains("dólar")',
      '#rate-usd',
      '.rate-value',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const text = element.text().trim();
        if (text && /\d/.test(text)) {
          return text;
        }
      }
    }

    // Fallback: search for any element containing USD rate pattern
    const bodyText = $('body').text();
    const matches = bodyText.match(/(\d+[.,]?\d*)\s*(?:Bs\.?|VES|bolivar)/i);
    if (matches) {
      return matches[1];
    }

    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // API FALLBACK
  // ─────────────────────────────────────────────────────────────────────────────

  private async fetchFromExternalAPI(): Promise<BCVRateResult | null> {
    for (const apiUrl of this.FALLBACK_APIS) {
      try {
        const response = await axios.get(apiUrl, {
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
          },
        });

        const data = response.data;

        // Different APIs have different response formats
        let rate: number | null = null;

        if (data.rates && data.rates.VES) {
          rate = parseFloat(data.rates.VES);
        } else if (data.rates && data.rates.USD && data.base === 'VES') {
          rate = 1 / parseFloat(data.rates.USD);
        } else if (data.conversion_rates && data.conversion_rates.VES) {
          rate = parseFloat(data.conversion_rates.VES);
        }

        if (rate && rate > 0) {
          const date = this.getEffectiveDateForVenezuela();
          return {
            rate,
            date,
            source: 'API_FALLBACK',
            confidence: 'medium',
            rawData: { apiUrl, response: data },
          };
        }
      } catch (error) {
        this.logger.warn(`API ${apiUrl} failed: ${error.message}`);
        continue;
      }
    }

    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DATABASE OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  private async updateCurrencyRate(
    currencyCode: string,
    result: BCVRateResult,
  ): Promise<void> {
    await this.prisma.exchangeRate.update({
      where: { code: currencyCode.toUpperCase() },
      data: {
        rateToUsd: result.rate,
        source: 'BCV',
        syncSource: result.source,
        lastSyncAt: new Date(),
        syncError: null,
        syncAttempts: 0,
        notes: `Auto-synced from ${result.source} on ${result.date} (confidence: ${result.confidence})`,
      },
    });
  }

  private async incrementSyncAttempts(currencyCode: string, error: string): Promise<void> {
    await this.prisma.exchangeRate.update({
      where: { code: currencyCode.toUpperCase() },
      data: {
        syncAttempts: { increment: 1 },
        syncError: error,
      },
    });
  }

  private async resetSyncAttempts(currencyCode: string): Promise<void> {
    await this.prisma.exchangeRate.update({
      where: { code: currencyCode.toUpperCase() },
      data: {
        syncAttempts: 0,
        syncError: null,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CACHE OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  private async cacheResult(cacheKey: string, result: BCVRateResult): Promise<void> {
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));
  }

  private async getCachedResult(cacheKey: string): Promise<BCVRateResult | null> {
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as BCVRateResult;
      } catch {
        return null;
      }
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────────

  private parseRate(rateText: string): number {
    // Handle both comma and dot as decimal separators
    const normalized = rateText
      .replace(/\./g, '') // Remove thousand separators (dots)
      .replace(/,/, '.'); // Convert comma to dot for decimal

    const match = normalized.match(/(\d+\.?\d*)/);
    if (!match) {
      throw new Error(`Could not parse rate from: ${rateText}`);
    }

    return parseFloat(match[1]);
  }

  /**
   * Get the effective date for Venezuela.
   * BCV publishes rates for the NEXT business day.
   * If today is Friday after 4:30 PM, the rate is for Monday.
   */
  private getEffectiveDateForVenezuela(): string {
    const now = new Date();
    const venezuelaTime = this.toVenezuelaTime(now);

    // BCV typically updates after 4:30 PM Venezuela time
    const isAfterUpdateTime = venezuelaTime.getHours() >= 16 && venezuelaTime.getMinutes() >= 30;

    const effectiveDate = new Date(venezuelaTime);

    if (isAfterUpdateTime) {
      // Rate published today is for tomorrow
      effectiveDate.setDate(effectiveDate.getDate() + 1);
    }

    // Skip weekends
    while (effectiveDate.getDay() === 0 || effectiveDate.getDay() === 6) {
      effectiveDate.setDate(effectiveDate.getDate() + 1);
    }

    return effectiveDate.toISOString().split('T')[0];
  }

  /**
   * Get yesterday's date in Venezuela timezone
   */
  private getYesterdayInVenezuela(): Date {
    const now = new Date();
    const venezuelaTime = this.toVenezuelaTime(now);
    venezuelaTime.setDate(venezuelaTime.getDate() - 1);
    venezuelaTime.setHours(0, 0, 0, 0);
    return venezuelaTime;
  }

  /**
   * Convert UTC date to Venezuela timezone
   */
  private toVenezuelaTime(date: Date): Date {
    return new Date(date.toLocaleString('en-US', { timeZone: this.VENEZUELA_TZ }));
  }

  /**
   * Check if a rate is stale (older than 24 hours)
   */
  private isRateStale(lastSyncAt: Date): boolean {
    const hoursSinceSync = (Date.now() - lastSyncAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceSync > 24;
  }
}
