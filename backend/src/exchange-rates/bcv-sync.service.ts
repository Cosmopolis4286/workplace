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
  // Alternative APIs for fallback, tried in order until one yields a usable rate
  private readonly FALLBACK_APIS = [
    'https://api.exchangerate-api.com/v4/latest/USD',
    'https://open.er-api.com/v6/latest/USD',
    'https://pydolarve.org/api/v1/dollar?page=bcv',
  ];

  // Venezuela timezone
  private readonly VENEZUELA_TZ = 'America/Caracas';
  // Cache TTL: 6 hours in seconds. Kept short so a stale cache entry can't
  // paper over a sync pipeline that has actually stopped working — with 3+
  // sync attempts a day, the cache should always be fresher than this anyway.
  private readonly CACHE_TTL = 6 * 60 * 60;
  // A rate is considered stale after this many hours without a successful sync.
  // Set well under a day so the hourly health check catches problems within
  // a single business day instead of waiting for the next 24h window.
  private readonly STALE_THRESHOLD_HOURS = 6;
  // Retries per source attempt within a single syncCurrency() call, with
  // exponential backoff, so a transient network blip doesn't fail the whole sync.
  private readonly MAX_RETRIES_PER_SOURCE = 2;
  private readonly RETRY_BASE_DELAY_MS = 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Main sync method. Tries BCV scraping first (with retries + backoff),
   * then falls back to external APIs (each also retried) before giving up.
   * Retrying inside a single call — rather than only via the cron's next
   * scheduled run — means a transient blip doesn't cost a whole sync window.
   */
  async syncCurrency(currencyCode: string = 'VES'): Promise<BCVRateResult> {
    const cacheKey = `bcv_rate:${currencyCode}`;
    const attemptErrors: string[] = [];

    const scrapingResult = await this.withRetries(
      () => this.fetchFromBCVScraping(),
      'BCV scraping',
      attemptErrors,
    );
    if (scrapingResult) {
      await this.updateCurrencyRate(currencyCode, scrapingResult);
      await this.cacheResult(cacheKey, scrapingResult);
      await this.resetSyncAttempts(currencyCode);
      this.logger.log(`BCV scraping successful: ${scrapingResult.rate} VES/USD`);
      return scrapingResult;
    }

    const apiResult = await this.withRetries(
      () => this.fetchFromExternalAPI(),
      'API fallback',
      attemptErrors,
    );
    if (apiResult) {
      await this.updateCurrencyRate(currencyCode, apiResult);
      await this.cacheResult(cacheKey, apiResult);
      await this.resetSyncAttempts(currencyCode);
      this.logger.log(`API fallback successful: ${apiResult.rate} VES/USD`);
      return apiResult;
    }

    // All sources failed after retries - increment attempts and throw
    const summary = attemptErrors.join(' | ') || 'All sync sources failed';
    await this.incrementSyncAttempts(currencyCode, summary);
    throw new Error(`Failed to sync ${currencyCode} from all sources: ${summary}`);
  }

  /**
   * Retry a fetch operation with exponential backoff. Returns null (not throw)
   * once retries are exhausted so the caller can move on to the next source;
   * errors are appended to `errors` for the final failure message.
   */
  private async withRetries(
    fn: () => Promise<BCVRateResult | null>,
    label: string,
    errors: string[],
  ): Promise<BCVRateResult | null> {
    for (let attempt = 1; attempt <= this.MAX_RETRIES_PER_SOURCE; attempt++) {
      try {
        const result = await fn();
        if (result) return result;
        errors.push(`${label}: no data (attempt ${attempt})`);
      } catch (error) {
        errors.push(`${label}: ${error.message} (attempt ${attempt})`);
        this.logger.warn(`${label} attempt ${attempt} failed: ${error.message}`);
      }

      if (attempt < this.MAX_RETRIES_PER_SOURCE) {
        await this.sleep(this.RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    }
    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
   * Force a sync if the currency's rate is stale, regardless of whether any
   * scheduled cron actually ran. This is the safety net for "the cron didn't
   * fire" (server restart, deploy, a hung previous run, etc.) — it runs
   * inline on read paths (e.g. GET /exchange-rates/default) so a request can
   * never see a rate older than STALE_THRESHOLD_HOURS as long as at least
   * one source is reachable. Failures are swallowed: callers get whatever
   * rate is in the DB rather than a 500 just because BCV is unreachable.
   * Returns true only if a sync actually ran (so callers know whether to
   * re-read the row), false if the rate was already fresh.
   */
  async ensureFreshRate(currencyCode: string): Promise<boolean> {
    const currency = await this.prisma.exchangeRate.findUnique({
      where: { code: currencyCode.toUpperCase() },
    });

    if (!currency || !currency.autoSync || !currency.isActive) return false;

    const isStale = currency.lastSyncAt ? this.isRateStale(currency.lastSyncAt) : true;
    if (!isStale) return false;

    try {
      await this.syncCurrency(currency.code);
      return true;
    } catch (error) {
      this.logger.warn(`ensureFreshRate: sync failed for ${currency.code}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get sync status for all currencies with auto-sync enabled (for health check / UI summary)
   */
  async getAllSyncStatuses(): Promise<SyncStatus[]> {
    const currencies = await this.prisma.exchangeRate.findMany({
      where: { autoSync: true, isActive: true },
      orderBy: { code: 'asc' },
    });

    return currencies.map(currency => ({
      currencyCode: currency.code,
      lastSyncAt: currency.lastSyncAt,
      syncSource: currency.syncSource,
      syncError: currency.syncError,
      syncAttempts: currency.syncAttempts,
      autoSync: currency.autoSync,
      currentRate: currency.rateToUsd,
      isStale: currency.lastSyncAt ? this.isRateStale(currency.lastSyncAt) : true,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCRAPING LOGIC
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Throws on failure (rather than swallowing to null) so withRetries() sees
   * the real error — timeout vs. selector-not-found vs. bad rate — and can
   * report it, instead of every failure looking like generic "no data".
   */
  private async fetchFromBCVScraping(): Promise<BCVRateResult | null> {
    const response = await axios.get(this.BCV_URL, {
      timeout: 10000,
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

  /**
   * Tries each fallback API in order within a single call. Throws (rather
   * than swallowing) if all of them fail, carrying the last error so
   * withRetries() can report something more useful than "no data".
   */
  private async fetchFromExternalAPI(): Promise<BCVRateResult | null> {
    let lastError: Error | null = null;

    for (const apiUrl of this.FALLBACK_APIS) {
      try {
        const response = await axios.get(apiUrl, {
          timeout: 8000,
          headers: {
            'Accept': 'application/json',
          },
        });

        const rate = this.extractRateFromApiResponse(response.data);

        if (rate && rate > 0) {
          const date = this.getEffectiveDateForVenezuela();
          return {
            rate,
            date,
            source: 'API_FALLBACK',
            confidence: 'medium',
            rawData: { apiUrl, response: response.data },
          };
        }
        lastError = new Error(`${apiUrl}: response had no usable VES rate`);
      } catch (error) {
        lastError = error;
        this.logger.warn(`API ${apiUrl} failed: ${error.message}`);
      }
    }

    if (lastError) throw lastError;
    return null;
  }

  /**
   * Different fallback APIs shape their response differently — normalize
   * them all to a single VES-per-USD number.
   */
  private extractRateFromApiResponse(data: any): number | null {
    if (data?.rates?.VES) return parseFloat(data.rates.VES);
    if (data?.rates?.USD && data?.base === 'VES') return 1 / parseFloat(data.rates.USD);
    if (data?.conversion_rates?.VES) return parseFloat(data.conversion_rates.VES);
    // pydolarve.org: { price: number, ... } for a single-monitor query (?page=bcv)
    if (typeof data?.price === 'number') return data.price;
    if (typeof data?.price === 'string') return parseFloat(data.price);
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DATABASE OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  private async updateCurrencyRate(
    currencyCode: string,
    result: BCVRateResult,
  ): Promise<void> {
    const existing = await this.prisma.exchangeRate.findUnique({
      where: { code: currencyCode.toUpperCase() },
    });

    const updated = await this.prisma.exchangeRate.update({
      where: { code: currencyCode.toUpperCase() },
      data: {
        rateToUsd: result.rate,
        source: 'BCV',
        syncSource: result.source,
        lastSyncAt: new Date(),
        syncError: null,
        syncAttempts: 0,
      },
    });

    if (existing && existing.rateToUsd !== result.rate) {
      await this.prisma.exchangeRateHistory.create({
        data: {
          exchangeRateId: updated.id,
          code: updated.code,
          previousRate: existing.rateToUsd,
          newRate: result.rate,
          source: result.source,
          changedBy: null,
        },
      });
    }
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
   * Convert UTC date to Venezuela timezone
   */
  private toVenezuelaTime(date: Date): Date {
    return new Date(date.toLocaleString('en-US', { timeZone: this.VENEZUELA_TZ }));
  }

  /**
   * Check if a rate is stale (older than STALE_THRESHOLD_HOURS)
   */
  private isRateStale(lastSyncAt: Date): boolean {
    const hoursSinceSync = (Date.now() - lastSyncAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceSync > this.STALE_THRESHOLD_HOURS;
  }
}
