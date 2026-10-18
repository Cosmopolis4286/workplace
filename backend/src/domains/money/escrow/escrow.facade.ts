import {
  EscrowEntityType,
  EscrowStatus,
  EscrowDisputeRaisedByRole,
  EscrowDisputeResolution,
} from '@prisma/client';
import type { MoneyInput } from '../../../common/money/money';

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

export interface EscrowDisputeView {
  id: string;
  escrowId: string;
  raisedById: string;
  raisedByRole: EscrowDisputeRaisedByRole;
  reason: string;
  status: 'OPEN' | 'RESOLVED';
  resolution: EscrowDisputeResolution | null;
  releaseAmount: number | null;
  refundAmount: number | null;
  resolvedById: string | null;
  resolvedAt: Date | null;
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
    deltaAmount: MoneyInput;
    referenceOverride?: string;
  }): Promise<EscrowView>;

  release(params: {
    entityType: EscrowEntityType;
    entityId: string;
    payeeId: string;
    amount: MoneyInput;
  }): Promise<EscrowView>;

  refund(params: {
    entityType: EscrowEntityType;
    entityId: string;
    payerId: string;
    amount: MoneyInput;
  }): Promise<EscrowView>;

  getByEntity(
    entityType: EscrowEntityType,
    entityId: string
  ): Promise<EscrowView | null>;

  /**
   * Marca el escrow HELD como en disputa — congela la liberación/reembolso
   * automáticos hasta que un admin la resuelva. Puede abrirla el payer o el
   * payee (ver EscrowDisputeRaisedByRole); solo uno puede tener una disputa
   * OPEN a la vez por escrow.
   */
  openDispute(params: {
    entityType: EscrowEntityType;
    entityId: string;
    raisedById: string;
    reason: string;
  }): Promise<EscrowDisputeView>;

  /**
   * Resuelve una disputa OPEN: ejecuta release/refund reales sobre
   * WalletsService según la resolución, y deja Escrow.status en RELEASED
   * (representa "ya no queda nada retenido", sea cual sea la combinación).
   */
  resolveDispute(params: {
    disputeId: string;
    resolvedById: string;
    resolution: EscrowDisputeResolution;
    /** Requerido solo cuando resolution=SPLIT; debe sumar el amount total del escrow */
    releaseAmount?: number;
    refundAmount?: number;
    resolutionNote?: string;
  }): Promise<EscrowDisputeView>;
}

export const ESCROW_FACADE = Symbol('ESCROW_FACADE');
