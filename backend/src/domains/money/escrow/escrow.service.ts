import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EscrowEntityType,
  EscrowDisputeResolution,
  EscrowStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import {
  add,
  eq,
  gt,
  round,
  toDecimal,
  toNumber,
  type MoneyInput,
} from '../../../common/money/money';
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
    deltaAmount: MoneyInput;
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
    const totalAmount = add(existing?.amount ?? 0, params.deltaAmount);

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
    amount: MoneyInput;
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
    amount: MoneyInput;
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
    // Contexto para decidir sin abrir cada transacción: qué se disputa,
    // quiénes son las partes y el motivo.
    const userIds = [
      ...new Set(disputes.flatMap((d) => [d.escrow.payerId, d.escrow.payeeId])),
    ];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const nameOf = (id: string) => {
      const u = users.find((x) => x.id === id);
      return u
        ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email
        : null;
    };
    return Promise.all(
      disputes.map(async (d) => ({
        ...this.toDisputeView(d),
        escrow: this.toView(d.escrow),
        entityName: await this.getEntityName(
          d.escrow.entityType,
          d.escrow.entityId
        ),
        payerName: nameOf(d.escrow.payerId),
        payeeName: nameOf(d.escrow.payeeId),
        createdAt: d.createdAt,
      }))
    );
  }

  async isServiceRequestDispute(disputeId: string) {
    const d = await this.prisma.escrowDispute.findUnique({
      where: { id: disputeId },
      select: { escrow: { select: { entityType: true } } },
    });
    return d?.escrow.entityType === 'SERVICE_REQUEST';
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
    // Lectura preliminar para localizar el escrow. La lectura autoritativa de
    // estado se repite después de adquirir el bloqueo de fila.
    const initial = await this.prisma.escrowDispute.findUnique({
      where: { id: params.disputeId },
      select: { id: true, escrowId: true },
    });
    if (!initial) throw new NotFoundException('Disputa no encontrada');

    // Todas las resoluciones del mismo escrow quedan serializadas, incluso si
    // llegan con IDs de disputa diferentes. El bloqueo se mantiene mientras
    // WalletsService confirma los movimientos y se persiste la resolución.
    const updatedDispute = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "escrows" WHERE id = ${initial.escrowId} FOR UPDATE
      `;
      if (!locked.length) throw new NotFoundException('Garantía no encontrada');

      const dispute = await tx.escrowDispute.findUnique({
        where: { id: params.disputeId },
        include: { escrow: true },
      });
      if (!dispute) throw new NotFoundException('Disputa no encontrada');
      if (dispute.escrowId !== initial.escrowId) {
        throw new BadRequestException('La disputa cambió de garantía');
      }
      if (dispute.status !== 'OPEN' || dispute.escrow.status !== 'DISPUTED') {
        throw new BadRequestException('Esta disputa ya fue resuelta');
      }

      const { escrow } = dispute;
      let releaseAmount = toDecimal(0);
      let refundAmount = toDecimal(0);

      if (params.resolution === 'RELEASE_FULL') {
        releaseAmount = toDecimal(escrow.amount);
      } else if (params.resolution === 'REFUND_FULL') {
        refundAmount = toDecimal(escrow.amount);
      } else {
        if (params.releaseAmount == null || params.refundAmount == null) {
          throw new BadRequestException(
            'SPLIT requiere releaseAmount y refundAmount'
          );
        }
        releaseAmount = round(params.releaseAmount);
        refundAmount = round(params.refundAmount);
        if (!eq(add(releaseAmount, refundAmount), escrow.amount)) {
          throw new BadRequestException(
            'releaseAmount + refundAmount debe ser igual al monto total retenido'
          );
        }
      }

      // La fila escrow sigue bloqueada durante ambos movimientos. Una segunda
      // petición espera y luego observa la disputa RESOLVED/escrow RELEASED.
      if (gt(releaseAmount, 0)) {
        await this.wallets.releaseEscrow(
          escrow.entityId,
          escrow.payeeId,
          releaseAmount
        );
      }
      if (gt(refundAmount, 0)) {
        await this.wallets.refundEscrow(
          escrow.entityId,
          escrow.payerId,
          refundAmount
        );
      }

      const resolvedAt = new Date();
      const result = await tx.escrowDispute.update({
        where: { id: dispute.id },
        data: {
          status: 'RESOLVED',
          resolution: params.resolution,
          releaseAmount,
          refundAmount,
          resolutionNote: params.resolutionNote,
          resolvedById: params.resolvedById,
          resolvedAt,
        },
      });
      await tx.escrow.update({
        where: { id: escrow.id },
        data: { status: 'RELEASED', releasedAt: resolvedAt },
      });
      const entityData = { escrowStatus: EscrowStatus.RELEASED };
      if (escrow.entityType === 'SERVICE_REQUEST') {
        await tx.serviceRequest.update({
          where: { id: escrow.entityId },
          data: entityData,
        });
      } else {
        await tx.catalogOrder.update({
          where: { id: escrow.entityId },
          data: entityData,
        });
      }

      return { result, escrow, releaseAmount, refundAmount };
    });

    const { result, escrow, releaseAmount, refundAmount } = updatedDispute;
    const entityName = await this.getEntityName(
      escrow.entityType,
      escrow.entityId
    );
    if (gt(releaseAmount, 0)) {
      this.notifications
        .notifyEscrowDisputeResolved(
          escrow.payeeId,
          entityName,
          toNumber(releaseAmount)
        )
        .catch(() => {});
    }
    if (gt(refundAmount, 0)) {
      this.notifications
        .notifyEscrowDisputeResolved(
          escrow.payerId,
          entityName,
          toNumber(refundAmount)
        )
        .catch(() => {});
    }

    return this.toDisputeView(result);
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
    releaseAmount: Prisma.Decimal | null;
    refundAmount: Prisma.Decimal | null;
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
      releaseAmount:
        row.releaseAmount == null ? null : toNumber(row.releaseAmount),
      refundAmount:
        row.refundAmount == null ? null : toNumber(row.refundAmount),
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
    amount: Prisma.Decimal;
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
      amount: toNumber(row.amount),
      heldAt: row.heldAt,
      releasedAt: row.releasedAt,
      refundedAt: row.refundedAt,
    };
  }
}
