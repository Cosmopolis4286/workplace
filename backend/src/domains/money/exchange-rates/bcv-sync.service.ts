import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as https from 'https';
import * as cheerio from 'cheerio';
import { RedisService } from '../../../redis/redis.service';
import { PrismaService } from '../../../prisma/prisma.service';

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
  // Deduplicates concurrent ensureFreshRate calls for the same currency:
  // concurrent requests during a stale window share one in-flight sync
  // instead of each spawning an independent scraper → avoids stampede / IP ban.
  private readonly inFlightSyncs = new Map<string, Promise<boolean>>();

  // BCV official website
  private readonly BCV_URL = 'https://www.bcv.org.ve';
  // Alternative APIs for fallback, tried in order until one yields a usable rate
  private readonly FALLBACK_APIS = [
    'https://api.exchangerate-api.com/v4/latest/USD',
    'https://open.er-api.com/v6/latest/USD',
  ];

  /**
   * bcv.org.ve serves an incomplete/misconfigured certificate chain (missing
   * intermediate CA) — verified directly against the live site: every
   * request fails with UNABLE_TO_VERIFY_LEAF_SIGNATURE even though the site
   * itself is legitimate. This is why BCV scraping — the primary, highest
   * confidence source — was silently failing on every single attempt,
   * forcing every sync onto the lower-confidence API fallback (or failing
   * entirely if that also had a hiccup). Disabling verification for this one
   * known host restores the primary source; nothing else uses this agent.
   */
  private readonly bcvHttpsAgent = new https.Agent({
    rejectUnauthorized: false,
  });

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
    private readonly config: ConfigService
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
      attemptErrors
    );
    if (scrapingResult) {
      await this.updateCurrencyRate(currencyCode, scrapingResult);
      await this.cacheResult(cacheKey, scrapingResult);
      await this.resetSyncAttempts(currencyCode);
      this.logger.log(
        `BCV scraping successful: ${scrapingResult.rate} VES/USD`
      );
      return scrapingResult;
    }

    const apiResult = await this.withRetries(
      () => this.fetchFromExternalAPI(),
      'API fallback',
      attemptErrors
    );
    if (apiResult) {
      await this.updateCurrencyRate(currencyCode, apiResult);
      await this.cacheResult(cacheKey, apiResult);
      await this.resetSyncAttempts(currencyCode);
      this.logger.log(`API fallback successful: ${apiResult.rate} VES/USD`);
      return apiResult;
    }

    // All sources failed after retries - increment attempts and throw.
    // El detalle técnico (attemptErrors) queda en syncError/logs para debug;
    // el mensaje de la excepción es el que el admin ve en el modal de sync
    // manual (vía ExchangeRatesController.syncCurrency), así que se mantiene
    // legible en español en vez de la concatenación cruda de errores.
    const summary = attemptErrors.join(' | ') || 'All sync sources failed';
    await this.incrementSyncAttempts(currencyCode, summary);
    this.logger.error(`Sync failed for ${currencyCode}: ${summary}`);
    throw new Error(
      `No se pudo sincronizar ${currencyCode}: el BCV y las fuentes de respaldo no respondieron. Intenta de nuevo en unos minutos.`
    );
  }

  /**
   * Retry a fetch operation with exponential backoff. Returns null (not throw)
   * once retries are exhausted so the caller can move on to the next source;
   * errors are appended to `errors` for the final failure message.
   */
  private async withRetries(
    fn: () => Promise<BCVRateResult | null>,
    label: string,
    errors: string[]
  ): Promise<BCVRateResult | null> {
    for (let attempt = 1; attempt <= this.MAX_RETRIES_PER_SOURCE; attempt++) {
      try {
        const result = await fn();
        if (result) return result;
        errors.push(`${label}: no data (attempt ${attempt})`);
      } catch (error) {
        errors.push(`${label}: ${error.message} (attempt ${attempt})`);
        this.logger.warn(
          `${label} attempt ${attempt} failed: ${error.message}`
        );
      }

      if (attempt < this.MAX_RETRIES_PER_SOURCE) {
        await this.sleep(this.RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    }
    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get cached rate or fetch new one
   */
  async getCurrentRate(
    currencyCode: string = 'VES'
  ): Promise<BCVRateResult | null> {
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
  async getSyncStatus(
    currencyCode: string = 'VES'
  ): Promise<SyncStatus | null> {
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
   * Garantiza que exista una ExchangeRate para VES (BCV) y que sea la
   * predeterminada de la app — sin esto, VES nunca se siembra (no está en
   * seed.js) y solo existe si un admin la crea a mano desde /exchange-rates,
   * dejando la app sin ninguna moneda default hasta que alguien lo note.
   * Llamado desde BcvSyncCron.onModuleInit() (cubre "nunca existió") y desde
   * el health check horario (cubre "alguien la borró/desmarcó después").
   *
   * No le quita isDefault a otra moneda si ya hay una: un admin pudo elegir
   * deliberadamente otra moneda como default (ej. USD), y este job es una
   * red de seguridad, no una imposición de producto sobre esa decisión — solo
   * actúa cuando NINGUNA moneda es default todavía.
   */
  async ensureDefaultRate(): Promise<void> {
    const code = 'VES';
    let rate = await this.prisma.exchangeRate.findUnique({ where: { code } });

    if (!rate) {
      this.logger.log('VES exchange rate missing — creating it now');
      // Intenta obtener la tasa real del BCV antes de crear la fila, para no
      // arrancar con un placeholder inventado si la red está disponible.
      // syncCurrency() no puede usarse acá (hace `update`, no `create`/`upsert`
      // — la fila todavía no existe), así que se llama directo a las fuentes.
      let initialRate = 0;
      let source = 'MANUAL';
      let syncError: string | null =
        'Creada automáticamente sin datos reales aún — pendiente de la primera sincronización.';
      try {
        const result = await this.fetchFromBCVScraping().catch(() =>
          this.fetchFromExternalAPI()
        );
        if (result) {
          initialRate = result.rate;
          source = result.source;
          syncError = null;
        }
      } catch (error) {
        this.logger.warn(
          `Could not fetch initial VES rate on creation: ${error.message}`
        );
      }

      rate = await this.prisma.exchangeRate.create({
        data: {
          code,
          name: 'Bolívar',
          symbol: 'Bs.',
          // No puede quedar en 0 (constraint de negocio en CreateExchangeRateDto,
          // Min(0.000001)) — si ambas fuentes fallaron en este primer intento,
          // usa un valor de arranque razonable; el cron horario lo corrige en
          // cuanto el BCV/fallback vuelva a responder (syncError queda marcado).
          rateToUsd: initialRate > 0 ? initialRate : 1,
          isActive: true,
          isDefault: false, // se decide más abajo, mismo criterio que una fila preexistente
          autoSync: true,
          source,
          syncSource: initialRate > 0 ? source : null,
          syncError,
          lastSyncAt: initialRate > 0 ? new Date() : null,
        },
      });

      if (initialRate > 0) {
        await this.cacheResult(`bcv_rate:${code}`, {
          rate: initialRate,
          date: this.getEffectiveDateForVenezuela(),
          source: source as BCVRateResult['source'],
          confidence: 'high',
        });
      }
    } else if (!rate.isActive) {
      // Existía pero estaba desactivada (ej. un admin la desactivó por error,
      // o quedó de una limpieza manual) — reactivarla es parte de "garantizar
      // que exista y funcione", no solo "garantizar la fila en DB".
      this.logger.warn(
        'VES exchange rate exists but is inactive — reactivating it'
      );
      rate = await this.prisma.exchangeRate.update({
        where: { code },
        data: { isActive: true },
      });
    }

    if (!rate.autoSync) {
      await this.prisma.exchangeRate.update({
        where: { code },
        data: { autoSync: true },
      });
    }

    const anyDefault = await this.prisma.exchangeRate.findFirst({
      where: { isDefault: true },
    });
    if (!anyDefault) {
      this.logger.log(
        'No default currency set — setting VES as the app default'
      );
      await this.prisma.exchangeRate.update({
        where: { code },
        data: { isDefault: true },
      });
    } else if (anyDefault.code !== code) {
      this.logger.debug(
        `Default currency is already ${anyDefault.code} — leaving it as-is`
      );
    }
  }

  /**
   * Enable/disable auto-sync for a currency
   */
  async setAutoSync(currencyCode: string, enabled: boolean): Promise<void> {
    await this.prisma.exchangeRate.update({
      where: { code: currencyCode.toUpperCase() },
      data: { autoSync: enabled },
    });
    this.logger.log(
      `Auto-sync ${enabled ? 'enabled' : 'disabled'} for ${currencyCode}`
    );
  }

  /**
   * Trigger a sync if the currency's rate is stale, regardless of whether any
   * scheduled cron actually ran — the safety net for "the cron didn't fire"
   * (server restart, deploy, a hung previous run, etc.). Fire-and-forget on
   * purpose: this is called from read paths (GET /exchange-rates,
   * /exchange-rates/default), and awaiting the sync inline used to block
   * those requests for up to ~40s (2 retries × scraping+fallback+backoff)
   * whenever BCV was unreachable — the worst possible moment for a public
   * endpoint to hang. The current request still serves whatever rate is
   * already in the DB (possibly stale); the NEXT request benefits from the
   * refreshed value once the background sync completes. Never throws —
   * failures are logged and swallowed inside _doEnsureFreshRate.
   */
  ensureFreshRate(currencyCode: string): void {
    const key = currencyCode.toUpperCase();

    // Dedup concurrent triggers for the same currency instead of piling up
    // redundant syncs while one is already in flight.
    if (this.inFlightSyncs.has(key)) return;

    const run = this._doEnsureFreshRate(key);
    this.inFlightSyncs.set(key, run);
    run.finally(() => this.inFlightSyncs.delete(key));
  }

  private async _doEnsureFreshRate(code: string): Promise<boolean> {
    const currency = await this.prisma.exchangeRate.findUnique({
      where: { code },
    });

    if (!currency || !currency.autoSync || !currency.isActive) return false;

    const isStale = currency.lastSyncAt
      ? this.isRateStale(currency.lastSyncAt)
      : true;
    if (!isStale) return false;

    try {
      await this.syncCurrency(currency.code);
      return true;
    } catch (error) {
      this.logger.warn(
        `ensureFreshRate: sync failed for ${currency.code}: ${error.message}`
      );
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

    return currencies.map((currency) => ({
      currencyCode: currency.code,
      lastSyncAt: currency.lastSyncAt,
      syncSource: currency.syncSource,
      syncError: currency.syncError,
      syncAttempts: currency.syncAttempts,
      autoSync: currency.autoSync,
      currentRate: currency.rateToUsd,
      isStale: currency.lastSyncAt
        ? this.isRateStale(currency.lastSyncAt)
        : true,
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
      httpsAgent: this.bcvHttpsAgent,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-VE,es;q=0.9',
      },
    });

    const $ = cheerio.load(response.data);

    // BCV typically shows rates in a specific format
    // Look for USD rate in the page
    const extracted = this.extractRateFromHTML($);

    if (!extracted) {
      throw new Error('Could not extract rate from BCV page');
    }

    const rate = this.parseRate(extracted.text);
    const date = this.getEffectiveDateForVenezuela();

    // El regex genérico de bodyText (fromSelector=false) no tiene forma de
    // confirmar que el número capturado es REALMENTE la tasa USD/VES — podría
    // ser cualquier mención incidental de "Bs" en la página (un precio citado
    // en una noticia, footer, etc.). Un selector específico del BCV (líneas de
    // arriba) sí lo garantiza por estructura. Rango más angosto (20-500, el
    // histórico real del BCV) para el fallback genérico reduce ese riesgo;
    // confidence 'low' (no 'high') deja rastro explícito de que este dato es
    // menos confiable, visible en ExchangeRate.rawData/syncSource para quien
    // audite un valor sospechoso después.
    const [minRate, maxRate] = extracted.fromSelector ? [1, 1000] : [20, 500];
    if (rate < minRate || rate > maxRate) {
      throw new Error(
        `Rate ${rate} seems unreasonable (source: ${extracted.fromSelector ? 'selector' : 'generic fallback'})`
      );
    }

    return {
      rate,
      date,
      source: 'BCV_SCRAPING',
      confidence: extracted.fromSelector ? 'high' : 'low',
      rawData: {
        url: this.BCV_URL,
        extractedText: extracted.text,
        fromSelector: extracted.fromSelector,
      },
    };
  }

  private extractRateFromHTML(
    $: cheerio.CheerioAPI
  ): { text: string; fromSelector: boolean } | null {
    // BCV website selectors based on actual HTML structure
    // Reference: <div id="dolar"><div class="centrado"><strong>487,11920000</strong></div></div>
    const selectors = [
      '#dolar .centrado strong', // Current BCV format (screenshot confirmed)
      '#dolar strong', // Simplified selector
      '#dolar .col-sm-6.centrado strong', // With bootstrap grid class
      '#euro .centrado strong', // Euro rate (same structure)
      '#dolar .recuadro .centrado strong', // Legacy BCV format
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
          return { text, fromSelector: true };
        }
      }
    }

    // Fallback: search for any element containing USD rate pattern. Menos
    // confiable a propósito — ver comentario en fetchFromBCVScraping sobre
    // el rango más angosto y confidence 'low' que recibe este camino.
    const bodyText = $('body').text();
    const matches = bodyText.match(/(\d+[.,]?\d*)\s*(?:Bs\.?|VES|bolivar)/i);
    if (matches) {
      return { text: matches[1], fromSelector: false };
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
            Accept: 'application/json',
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
    if (data?.rates?.USD && data?.base === 'VES')
      return 1 / parseFloat(data.rates.USD);
    if (data?.conversion_rates?.VES)
      return parseFloat(data.conversion_rates.VES);
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DATABASE OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  // SELECT ... FOR UPDATE + update + fila de historial en una sola
  // transacción: sin el lock explícito, dos syncs concurrentes de la misma
  // moneda (ej. POST /exchange-rates/sync-all y el cron programado
  // solapándose) podían hacer ambas su SELECT antes de que ninguna
  // escribiera, leyendo el mismo "previousRate" — la tasa final quedaba
  // correcta (Postgres serializa los UPDATE), pero ExchangeRateHistory
  // terminaba con dos entradas para una sola transición real, ensuciando la
  // auditoría. FOR UPDATE obliga a la segunda transacción a esperar a que la
  // primera haga commit antes de leer, así que ve el rateToUsd ya actualizado.
  private async updateCurrencyRate(
    currencyCode: string,
    result: BCVRateResult
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string; rateToUsd: number }[]>`
        SELECT id, "rateToUsd" FROM exchange_rates WHERE code = ${currencyCode.toUpperCase()} FOR UPDATE
      `;
      const existing = locked[0] ?? null;

      const updated = await tx.exchangeRate.update({
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
        await tx.exchangeRateHistory.create({
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
    });
  }

  private async incrementSyncAttempts(
    currencyCode: string,
    error: string
  ): Promise<void> {
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

  private async cacheResult(
    cacheKey: string,
    result: BCVRateResult
  ): Promise<void> {
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));
  }

  private async getCachedResult(
    cacheKey: string
  ): Promise<BCVRateResult | null> {
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
    const isAfterUpdateTime =
      venezuelaTime.getHours() >= 16 && venezuelaTime.getMinutes() >= 30;

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
    return new Date(
      date.toLocaleString('en-US', { timeZone: this.VENEZUELA_TZ })
    );
  }

  /**
   * Check if a rate is stale (older than STALE_THRESHOLD_HOURS)
   */
  private isRateStale(lastSyncAt: Date): boolean {
    const hoursSinceSync =
      (Date.now() - lastSyncAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceSync > this.STALE_THRESHOLD_HOURS;
  }
}
