import { ReputationEntityType } from '@prisma/client';

export interface ReputationScoreView {
  score: number;
  sampleSize: number;
  breakdown: Record<string, number | null>;
  calculatedAt: Date;
}

/**
 * Contrato público de ReputationService para consumidores de otros dominios
 * (services, orders, delivery, reports). Mismo patrón que
 * money/platform-fees/platform-fees.facade.ts — un único método de escritura
 * (recalculate, disparado desde los puntos donde cada dominio ya muta el
 * estado de una transacción a un estado terminal) y uno de lectura.
 */
export interface ReputationFacade {
  recalculate(entityType: ReputationEntityType, entityId: string): Promise<void>;
  getScore(entityType: ReputationEntityType, entityId: string): Promise<ReputationScoreView | null>;
}

export const REPUTATION_FACADE = Symbol('REPUTATION_FACADE');
