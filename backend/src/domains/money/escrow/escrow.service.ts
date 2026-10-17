import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EscrowEntityType,
  EscrowDisputeResolution,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { EscrowDisputeView, EscrowFacade, EscrowView } from './escrow.facade';

@Injectable()
export class EscrowService implements EscrowFacade {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallets: WalletsService,
    private readonly notifications: NotificationsService
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
    await this.wallets.holdEscrow(
      params.payerId,
      params.deltaAmount,
      params.entityId,
      params.referenceOverride
    );

    const existing = await this.prisma.escrow.findUnique({
      where: {
        entityType_entityId: {
          entityType: params.entityType,
          entityId: params.entityId,
        },
      },
    });
    // Acumula sobre lo ya retenido (aumento de precio aprobado) en vez de
    // sobrescribir — un segundo hold() sobre la misma entidad SIEMPRE es un
    // incremento, nunca un monto final distinto.
    const totalAmount = (existing?.amount ?? 0) + params.deltaAmount;

    const row = await this.prisma.escrow.upsert({
      where: {
        entityType_entityId: {
          entityType: params.entityType,
          entityId: params.entityId,
        },
      },
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
    await this.wallets.releaseEscrow(
      params.entityId,
      params.payeeId,
      params.amount
    );

    const row = await this.prisma.escrow.update({
      where: {
        entityType_entityId: {
          entityType: params.entityType,
          entityId: params.entityId,
        },
      },
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
    await this.wallets.refundEscrow(
      params.entityId,
      params.payerId,
      params.amount
    );

    const row = await this.prisma.escrow.update({
      where: {
        entityType_entityId: {
          entityType: params.entityType,
          entityId: params.entityId,
        },
      },
      data: { status: 'REFUNDED', refundedAt: new Date() },
    });
    return this.toView(row);
  }

  async getByEntity(
    entityType: EscrowEntityType,
    entityId: string
  ): Promise<EscrowView | null> {
    const row = await this.prisma.escrow.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    });
    return row ? this.toView(row) : null;
  }

  // Cola de disputas pendientes para el panel admin — no forma parte de
  // EscrowFacade (es de uso admin puro, no algo que otros dominios
  // consuman), así que EscrowController inyecta EscrowService directo.
  async listOpenDisputes() {
    const disputes = await this.prisma.escrowDispute.findMany({
      where: { status: 'OPEN' },
      include: { escrow: true },
      orderBy: { createdAt: 'asc' },
    });
    return disputes.map((d) => ({
      ...this.toDisputeView(d),
      escrow: this.toView(d.escrow),
    }));
  }

  async openDispute(params: {
    entityType: EscrowEntityType;
    entityId: string;
    raisedById: string;
    reason: string;
  }): Promise<EscrowDisputeView> {
    const escrow = await this.prisma.escrow.findUnique({
      where: {
        entityType_entityId: {
          entityType: params.entityType,
          entityId: params.entityId,
        },
      },
    });
    if (!escrow)
      throw new NotFoundException(
        'No hay garantía retenida para esta transacción'
      );
    if (escrow.status !== 'HELD') {
      throw new BadRequestException(
        'Solo se puede disputar una garantía retenida (HELD)'
      );
    }
    if (
      escrow.payerId !== params.raisedById &&
      escrow.payeeId !== params.raisedById
    ) {
      throw new ForbiddenException(
        'No tienes permiso para disputar esta transacción'
      );
    }

    const existingOpen = await this.prisma.escrowDispute.findFirst({
      where: { escrowId: escrow.id, status: 'OPEN' },
    });
    if (existingOpen) {
      throw new BadRequestException(
        'Ya existe una disputa abierta para esta transacción'
      );
    }

    const raisedByRole =
      escrow.payerId === params.raisedById ? 'PAYER' : 'PAYEE';

    const [dispute] = await this.prisma.$transaction([
      this.prisma.escrowDispute.create({
        data: {
          escrowId: escrow.id,
          raisedById: params.raisedById,
          raisedByRole,
          reason: params.reason,
        },
      }),
      this.prisma.escrow.update({
        where: { id: escrow.id },
        data: { status: 'DISPUTED' },
      }),
      ...this.syncEntityEscrowStatusTo(
        params.entityType,
        params.entityId,
        'DISPUTED'
      ),
    ]);

    return this.toDisputeView(dispute);
  }

  async resolveDispute(params: {
    disputeId: string;
    resolvedById: string;
    resolution: EscrowDisputeResolution;
    releaseAmount?: number;
    refundAmount?: number;
    resolutionNote?: string;
  }): Promise<EscrowDisputeView> {
    const dispute = await this.prisma.escrowDispute.findUnique({
      where: { id: params.disputeId },
      include: { escrow: true },
    });
    if (!dispute) throw new NotFoundException('Disputa no encontrada');
    if (dispute.status !== 'OPEN')
      throw new BadRequestException('Esta disputa ya fue resuelta');

    const { escrow } = dispute;
    let releaseAmount = 0;
    let refundAmount = 0;

    if (params.resolution === 'RELEASE_FULL') {
      releaseAmount = escrow.amount;
    } else if (params.resolution === 'REFUND_FULL') {
      refundAmount = escrow.amount;
    } else {
      // SPLIT: ambos montos son obligatorios y deben sumar exactamente el
      // total retenido — no puede "aparecer" ni "desaparecer" dinero al
      // resolver, solo redistribuirse entre payer y payee.
      if (params.releaseAmount == null || params.refundAmount == null) {
        throw new BadRequestException(
          'SPLIT requiere releaseAmount y refundAmount'
        );
      }
      releaseAmount = params.releaseAmount;
      refundAmount = params.refundAmount;
      const diff = Math.abs(releaseAmount + refundAmount - escrow.amount);
      if (diff > 0.01) {
        throw new BadRequestException(
          'releaseAmount + refundAmount debe ser igual al monto total retenido'
        );
      }
    }

    // Ejecuta los movimientos de dinero reales primero (vía WalletsService) —
    // si alguno falla, la disputa sigue OPEN para reintentar, en vez de
    // quedar marcada RESOLVED sin que el dinero se haya movido.
    if (releaseAmount > 0) {
      await this.wallets.releaseEscrow(
        escrow.entityId,
        escrow.payeeId,
        releaseAmount
      );
    }
    if (refundAmount > 0) {
      await this.wallets.refundEscrow(
        escrow.entityId,
        escrow.payerId,
        refundAmount
      );
    }

    const [updatedDispute] = await this.prisma.$transaction([
      this.prisma.escrowDispute.update({
        where: { id: dispute.id },
        data: {
          status: 'RESOLVED',
          resolution: params.resolution,
          releaseAmount,
          refundAmount,
          resolutionNote: params.resolutionNote,
          resolvedById: params.resolvedById,
          resolvedAt: new Date(),
        },
      }),
      // RELEASED representa "ya no queda nada retenido" — el desglose real
      // de cuánto fue a cada parte en un SPLIT vive en EscrowDispute, no en
      // Escrow.status (que es un único valor, no dos).
      this.prisma.escrow.update({
        where: { id: escrow.id },
        data: { status: 'RELEASED', releasedAt: new Date() },
      }),
      // Escrow es una proyección — ServiceRequest/CatalogOrder siguen siendo
      // la fuente real que consultan sus propios dominios, así que hay que
      // sincronizar el espejo desnormalizado ahí también.
      ...this.syncEntityEscrowStatusTo(
        escrow.entityType,
        escrow.entityId,
        'RELEASED'
      ),
    ]);

    const entityName = await this.getEntityName(
      escrow.entityType,
      escrow.entityId
    );
    if (releaseAmount > 0) {
      this.notifications
        .notifyEscrowDisputeResolved(escrow.payeeId, entityName, releaseAmount)
        .catch(() => {});
    }
    if (refundAmount > 0) {
      this.notifications
        .notifyEscrowDisputeResolved(escrow.payerId, entityName, refundAmount)
        .catch(() => {});
    }

    return this.toDisputeView(updatedDispute);
  }

  private async getEntityName(
    entityType: EscrowEntityType,
    entityId: string
  ): Promise<string> {
    if (entityType === 'SERVICE_REQUEST') {
      const req = await this.prisma.serviceRequest.findUnique({
        where: { id: entityId },
        select: { serviceName: true },
      });
      return req?.serviceName ?? 'la transacción';
    }
    const order = await this.prisma.catalogOrder.findUnique({
      where: { id: entityId },
      select: { commerceName: true },
    });
    return order?.commerceName ?? 'la transacción';
  }

  private syncEntityEscrowStatusTo(
    entityType: EscrowEntityType,
    entityId: string,
    status: 'DISPUTED' | 'RELEASED'
  ): Prisma.PrismaPromise<unknown>[] {
    const data = { escrowStatus: status };
    if (entityType === 'SERVICE_REQUEST') {
      return [
        this.prisma.serviceRequest.update({ where: { id: entityId }, data }),
      ];
    }
    return [this.prisma.catalogOrder.update({ where: { id: entityId }, data })];
  }

  private toDisputeView(row: {
    id: string;
    escrowId: string;
    raisedById: string;
    raisedByRole: string;
    reason: string;
    status: string;
    resolution: string | null;
    releaseAmount: number | null;
    refundAmount: number | null;
    resolvedById: string | null;
    resolvedAt: Date | null;
  }): EscrowDisputeView {
    return {
      id: row.id,
      escrowId: row.escrowId,
      raisedById: row.raisedById,
      raisedByRole: row.raisedByRole as EscrowDisputeView['raisedByRole'],
      reason: row.reason,
      status: row.status as EscrowDisputeView['status'],
      resolution: row.resolution as EscrowDisputeView['resolution'],
      releaseAmount: row.releaseAmount,
      refundAmount: row.refundAmount,
      resolvedById: row.resolvedById,
      resolvedAt: row.resolvedAt,
    };
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
