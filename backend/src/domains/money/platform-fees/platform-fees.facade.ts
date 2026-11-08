import { FeeTransactionType, FeePayer, Prisma } from '@prisma/client';
import type { MoneyInput } from '../../../common/money/money';

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
  calculateFee(
    baseAmount: MoneyInput,
    config: FeeConfig
  ): { feeAmount: number };
  chargeProviderFee(
    type: FeeTransactionType,
    userId: string,
    feeAmount: number,
    reference: string,
    metadata: Record<string, unknown>,
    // true: la comisión ya se retuvo de una garantía (escrow) al liberarla.
    options?: { collected?: boolean }
  ): Promise<unknown>;
  chargeProviderFeeInTransaction(
    type: FeeTransactionType,
    userId: string,
    feeAmount: number,
    reference: string,
    metadata: Record<string, unknown>,
    options: { tx: Prisma.TransactionClient; collected?: boolean }
  ): Promise<{ charge: unknown | null; created: boolean }>;
  /**
   * Debe ejecutarse después del commit y solo si la transacción creó el cargo.
   */
  notifyProviderFee(input: {
    type: FeeTransactionType;
    userId: string;
    feeAmount: number;
    collected?: boolean;
  }): Promise<void>;
}

export const PLATFORM_FEES_FACADE = Symbol('PLATFORM_FEES_FACADE');
