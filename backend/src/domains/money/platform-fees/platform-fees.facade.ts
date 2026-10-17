import { FeeTransactionType, FeePayer } from '@prisma/client';

export interface FeeConfig {
  rate: number;
  payer: FeePayer;
}

/**
 * Contrato público de PlatformFeesService para consumidores de otros
 * dominios (orders en Operations, services en Commerce Core, rides en
 * Operations). Expone solo lectura/aplicación de comisiones — la
 * administración (upsertRate/createOverride/deleteOverride/getRates/
 * getOverrides) queda privada al propio módulo money/platform-fees, donde
 * PlatformFeesController ya la restringe a SUPERADMIN. Ningún consumidor
 * externo debe poder modificar tasas de comisión, solo leerlas y aplicarlas.
 */
export interface PlatformFeesFacade {
  resolveFeeConfig(
    type: FeeTransactionType,
    userId?: string
  ): Promise<FeeConfig | null>;
  calculateFee(baseAmount: number, config: FeeConfig): { feeAmount: number };
  chargeProviderFee(
    type: FeeTransactionType,
    userId: string,
    feeAmount: number,
    reference: string,
    metadata: Record<string, unknown>
  ): Promise<unknown>;
}

export const PLATFORM_FEES_FACADE = Symbol('PLATFORM_FEES_FACADE');
