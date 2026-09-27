import { EscrowEntityType, EscrowStatus } from '@prisma/client';

export interface EscrowView {
  id: string;
  entityType: EscrowEntityType;
  entityId: string;
  payerId: string;
  payeeId: string;
  status: EscrowStatus;
  amount: number;
  heldAt: Date | null;
  releasedAt: Date | null;
  refundedAt: Date | null;
}

/**
 * Contrato público de EscrowService para consumidores de otros dominios
 * (services, catalog) — mismo patrón Symbol-DI que ReputationFacade/
 * PlatformFeesFacade. Envuelve WalletsService.holdEscrow/releaseEscrow/
 * refundEscrow SIN alterar su lógica atómica (Wallet/WalletTransaction
 * siguen siendo la única fuente de movimiento de dinero real) — agrega la
 * proyección Escrow consultable por entityType/entityId, igual criterio que
 * ReputationService es una proyección derivada de Order/ServiceRequest.
 */
export interface EscrowFacade {
  hold(params: {
    entityType: EscrowEntityType;
    entityId: string;
    payerId: string;
    payeeId: string;
    /** Monto a debitar en ESTA operación (delta, no el acumulado) — ver EscrowService.hold */
    deltaAmount: number;
    referenceOverride?: string;
  }): Promise<EscrowView>;

  release(params: {
    entityType: EscrowEntityType;
    entityId: string;
    payeeId: string;
    amount: number;
  }): Promise<EscrowView>;

  refund(params: {
    entityType: EscrowEntityType;
    entityId: string;
    payerId: string;
    amount: number;
  }): Promise<EscrowView>;

  getByEntity(entityType: EscrowEntityType, entityId: string): Promise<EscrowView | null>;
}

export const ESCROW_FACADE = Symbol('ESCROW_FACADE');
