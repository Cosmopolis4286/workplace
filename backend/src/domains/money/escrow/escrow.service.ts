import { Injectable } from '@nestjs/common';
import { EscrowEntityType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { EscrowFacade, EscrowView } from './escrow.facade';

@Injectable()
export class EscrowService implements EscrowFacade {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallets: WalletsService,
  ) {}

  async hold(params: {
    entityType: EscrowEntityType;
    entityId: string;
    payerId: string;
    payeeId: string;
    // Monto a debitar del payer EN ESTA operación — no el acumulado. Para un
    // aumento de precio sobre un escrow ya HELD (ver
    // ServicesService.approvePriceChangeProposal), esto es el DELTA, nunca
    // el total: WalletsService.holdEscrow retiene exactamente lo que se le
    // pasa acá. La fila Escrow.amount sí acumula (ver abajo).
    deltaAmount: number;
    referenceOverride?: string;
  }): Promise<EscrowView> {
    // WalletsService.holdEscrow es la única fuente de movimiento de dinero
    // real (débito cliente + crédito wallet de plataforma, atómico) — no se
    // reimplementa acá, solo se envuelve. Si lanza (ej.
    // InsufficientEscrowFundsError), se propaga tal cual y no se persiste
    // ninguna fila Escrow — el caller decide cómo manejar el fallo, igual
    // que hace hoy con ServiceRequest.
    await this.wallets.holdEscrow(params.payerId, params.deltaAmount, params.entityId, params.referenceOverride);

    const existing = await this.prisma.escrow.findUnique({
      where: { entityType_entityId: { entityType: params.entityType, entityId: params.entityId } },
    });
    // Acumula sobre lo ya retenido (aumento de precio aprobado) en vez de
    // sobrescribir — un segundo hold() sobre la misma entidad SIEMPRE es un
    // incremento, nunca un monto final distinto.
    const totalAmount = (existing?.amount ?? 0) + params.deltaAmount;

    const row = await this.prisma.escrow.upsert({
      where: { entityType_entityId: { entityType: params.entityType, entityId: params.entityId } },
      create: {
        entityType: params.entityType,
        entityId: params.entityId,
        payerId: params.payerId,
        payeeId: params.payeeId,
        status: 'HELD',
        amount: totalAmount,
        heldAt: new Date(),
      },
      update: {
        status: 'HELD',
        amount: totalAmount,
        heldAt: new Date(),
      },
    });
    return this.toView(row);
  }

  async release(params: {
    entityType: EscrowEntityType;
    entityId: string;
    payeeId: string;
    amount: number;
  }): Promise<EscrowView> {
    await this.wallets.releaseEscrow(params.entityId, params.payeeId, params.amount);

    const row = await this.prisma.escrow.update({
      where: { entityType_entityId: { entityType: params.entityType, entityId: params.entityId } },
      data: { status: 'RELEASED', releasedAt: new Date() },
    });
    return this.toView(row);
  }

  async refund(params: {
    entityType: EscrowEntityType;
    entityId: string;
    payerId: string;
    amount: number;
  }): Promise<EscrowView> {
    await this.wallets.refundEscrow(params.entityId, params.payerId, params.amount);

    const row = await this.prisma.escrow.update({
      where: { entityType_entityId: { entityType: params.entityType, entityId: params.entityId } },
      data: { status: 'REFUNDED', refundedAt: new Date() },
    });
    return this.toView(row);
  }

  async getByEntity(entityType: EscrowEntityType, entityId: string): Promise<EscrowView | null> {
    const row = await this.prisma.escrow.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    });
    return row ? this.toView(row) : null;
  }

  private toView(row: {
    id: string;
    entityType: EscrowEntityType;
    entityId: string;
    payerId: string;
    payeeId: string;
    status: string;
    amount: number;
    heldAt: Date | null;
    releasedAt: Date | null;
    refundedAt: Date | null;
  }): EscrowView {
    return {
      id: row.id,
      entityType: row.entityType,
      entityId: row.entityId,
      payerId: row.payerId,
      payeeId: row.payeeId,
      status: row.status as EscrowView['status'],
      amount: row.amount,
      heldAt: row.heldAt,
      releasedAt: row.releasedAt,
      refundedAt: row.refundedAt,
    };
  }
}
