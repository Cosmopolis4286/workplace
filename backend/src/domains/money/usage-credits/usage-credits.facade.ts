import type { Prisma, UsageCreditConcept } from '@prisma/client';

export class InsufficientUsageCreditsError extends Error {
  constructor(
    readonly available: Prisma.Decimal,
    readonly required: Prisma.Decimal
  ) {
    super('Créditos insuficientes');
    this.name = 'InsufficientUsageCreditsError';
  }
}

/**
 * Contrato para otros dominios (servicios, catálogo, viajes) que cobran en
 * créditos. Consumir y devolver se hacen DENTRO de la transacción del caller,
 * junto con el cambio de estado que los origina; la referencia es única por
 * evento, así un reintento no cobra dos veces.
 */
export interface UsageCreditsFacade {
  isEnabled(): boolean;
  getAvailable(userId: string): Promise<Prisma.Decimal>;
  /** Lanza InsufficientUsageCreditsError si no alcanza; no deja saldo negativo. */
  consume(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      units: Prisma.Decimal | number;
      concept: Extract<UsageCreditConcept, 'LEAD_FEE' | 'SUCCESS_FEE'>;
      reference: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<{ applied: boolean }>;
  /** Devuelve a sus lotes lo consumido por `reference` (movimiento compensatorio). */
  reverse(
    tx: Prisma.TransactionClient,
    input: { reference: string; reason: string }
  ): Promise<{ applied: boolean }>;
}

export const USAGE_CREDITS_FACADE = Symbol('USAGE_CREDITS_FACADE');
