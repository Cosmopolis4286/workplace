import type { Prisma } from '@prisma/client';

/**
 * Contrato público de ExchangeRatesService para otros dominios (compras y
 * cotizaciones de proveedores en Operations): solo resolver la tasa vigente
 * para guardar su snapshot inmutable. La administración de tasas y la sync
 * con el BCV quedan en el propio módulo.
 */
export interface ExchangeRatesFacade {
  /**
   * Tasa a USD vigente de una moneda (USD → 1, sin fila en ExchangeRate).
   * null si la moneda no existe o su tasa no es positiva: el llamador
   * decide el mensaje de error.
   */
  resolveRateToUsd(
    currencyCode: string
  ): Promise<{ rateToUsd: Prisma.Decimal; source: string | null } | null>;
}

export const EXCHANGE_RATES_FACADE = Symbol('EXCHANGE_RATES_FACADE');
