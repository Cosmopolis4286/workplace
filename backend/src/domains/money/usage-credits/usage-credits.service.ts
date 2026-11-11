import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ManualPaymentReportStatus,
  NotificationType,
  Prisma,
  UsageCreditConcept,
  UsageCreditLotKind,
  UsageCreditMovementType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { features } from '../../../common/config/features';
import {
  NOTIFICATIONS_FACADE,
  type NotificationsFacade,
} from '../../engagement/notifications/notifications.facade';
import {
  EXCHANGE_RATES_FACADE,
  type ExchangeRatesFacade,
} from '../exchange-rates/exchange-rates.facade';
import {
  normalizeReference,
  parsePaidAt,
  snapshotAccount,
  withPayableAmounts,
} from '../payments/manual/payable-accounts';
import {
  FIRST_PURCHASE_BONUS_RATE,
  MAX_PENDING_PURCHASES,
  MONTHLY_PURCHASE_LIMIT_USD,
  PROMOTIONAL_EXPIRY_DAYS,
  USAGE_CREDIT_PACKAGES,
} from './usage-credits.constants';
import {
  InsufficientUsageCreditsError,
  UsageCreditsFacade,
} from './usage-credits.facade';
import { ReportUsageCreditPurchaseDto } from './dto/usage-credits.dto';

const ZERO = new Prisma.Decimal(0);
const DAY_MS = 24 * 60 * 60 * 1000;
const dec = (v: Prisma.Decimal | number | string) =>
  new Prisma.Decimal(v).toDecimalPlaces(2);

/**
 * Créditos de uso: unidades prepagadas para pagar cargos de la plataforma.
 * No es una billetera: no hay transferencias, retiros ni conversión a dinero.
 *
 * Reglas (docs/MARKETPLACE_CREDIT_MONETIZATION_REVIEW.md §4):
 * - Lotes comprados y promocionales separados; se consumen primero los
 *   promocionales (los que vencen antes) y luego los comprados (FIFO).
 * - Libro inmutable de movimientos; las correcciones son compensatorias.
 * - Cada operación tiene una referencia única (UsageCreditEvent): reintentos
 *   y concurrencia no aplican dos veces el mismo cargo.
 * - Nunca saldo negativo: si no alcanza, el consumo falla entero.
 * - Todo detrás de USAGE_CREDITS_ENABLED (apagado hasta el dictamen legal).
 */
@Injectable()
export class UsageCreditsService implements UsageCreditsFacade {
  private readonly logger = new Logger(UsageCreditsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATIONS_FACADE)
    private readonly notifications: NotificationsFacade,
    @Inject(EXCHANGE_RATES_FACADE)
    private readonly rates: ExchangeRatesFacade
  ) {}

  isEnabled() {
    return features.usageCredits();
  }

  assertEnabled() {
    if (!this.isEnabled()) {
      throw new NotFoundException('Los créditos de uso no están disponibles');
    }
  }

  // ─── Saldo y consultas ────────────────────────────────────────────────────

  private activeLotsWhere(userId: string, now = new Date()) {
    return {
      userId,
      remaining: { gt: ZERO },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    };
  }

  async getBalance(userId: string) {
    const lots = await this.prisma.usageCreditLot.findMany({
      where: this.activeLotsWhere(userId),
      orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }],
    });
    const sum = (kind: UsageCreditLotKind) =>
      lots
        .filter((l) => l.kind === kind)
        .reduce((acc, l) => acc.plus(l.remaining), ZERO);
    const purchased = sum(UsageCreditLotKind.PURCHASED);
    const promotional = sum(UsageCreditLotKind.PROMOTIONAL);
    return {
      purchased,
      promotional,
      total: purchased.plus(promotional),
      lots,
    };
  }

  async getAvailable(userId: string) {
    return (await this.getBalance(userId)).total;
  }

  async getMine(userId: string) {
    this.assertEnabled();
    const [balance, movements, purchases] = await Promise.all([
      this.getBalance(userId),
      this.prisma.usageCreditMovement.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.usageCreditPurchase.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);
    return { balance, movements, purchases };
  }

  async getPackages() {
    this.assertEnabled();
    const accounts = await this.prisma.platformCollectionAccount.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(
      USAGE_CREDIT_PACKAGES.map(async (pkg) => ({
        ...pkg,
        accounts: await withPayableAmounts(
          this.rates,
          accounts,
          'USD',
          dec(pkg.priceUsd)
        ),
      }))
    );
  }

  // ─── Compra (pago a la cuenta de la plataforma + confirmación admin) ─────

  async reportPurchase(userId: string, dto: ReportUsageCreditPurchaseDto) {
    this.assertEnabled();
    const pkg = USAGE_CREDIT_PACKAGES.find((p) => p.code === dto.packageCode);
    if (!pkg) throw new BadRequestException('Paquete inválido');

    const account = await this.prisma.platformCollectionAccount.findFirst({
      where: { id: dto.platformAccountId, isActive: true },
    });
    if (!account) {
      throw new BadRequestException('La cuenta de destino no está disponible');
    }
    const reference = normalizeReference(dto.reference);
    if (!reference) {
      throw new BadRequestException(
        'Referencia inválida: usa entre 4 y 30 letras o números'
      );
    }
    const paidAt = parsePaidAt(dto.paidAt);
    if (typeof paidAt === 'string') throw new BadRequestException(paidAt);

    const [duplicate, pending, monthTotal] = await Promise.all([
      this.prisma.usageCreditPurchase.findFirst({
        where: {
          reference,
          status: { not: ManualPaymentReportStatus.REJECTED },
        },
        select: { id: true },
      }),
      this.prisma.usageCreditPurchase.count({
        where: { userId, status: ManualPaymentReportStatus.SUBMITTED },
      }),
      this.prisma.usageCreditPurchase.aggregate({
        where: {
          userId,
          status: { not: ManualPaymentReportStatus.REJECTED },
          createdAt: { gte: startOfMonth(new Date()) },
        },
        _sum: { priceUsd: true },
      }),
    ]);
    if (duplicate)
      throw new ConflictException('Esa referencia ya fue reportada');
    if (pending >= MAX_PENDING_PURCHASES) {
      throw new ConflictException(
        'Tienes compras en revisión; espera a que se confirmen'
      );
    }
    const spent = monthTotal._sum.priceUsd ?? ZERO;
    if (spent.plus(pkg.priceUsd).gt(MONTHLY_PURCHASE_LIMIT_USD)) {
      throw new BadRequestException(
        `Superarías el límite de compras de créditos de este mes ($${MONTHLY_PURCHASE_LIMIT_USD})`
      );
    }

    const [priced] = await withPayableAmounts(
      this.rates,
      [account],
      'USD',
      dec(pkg.priceUsd)
    );
    if (priced.amount === null) {
      throw new ConflictException(
        'No hay una tasa de cambio vigente para pagar en esta moneda'
      );
    }

    return this.prisma.usageCreditPurchase.create({
      data: {
        userId,
        packageCode: pkg.code,
        units: dec(pkg.units),
        priceUsd: dec(pkg.priceUsd),
        platformAccountId: account.id,
        destination: snapshotAccount(account),
        reference,
        payerBankCode: dto.payerBankCode,
        paidAt,
        paidCurrency: account.currency,
        paidAmount: priced.amount,
        exchangeRate: priced.exchangeRate,
      },
    });
  }

  async listPurchases(status?: ManualPaymentReportStatus) {
    this.assertEnabled();
    return this.prisma.usageCreditPurchase.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async confirmPurchase(adminId: string, id: string) {
    this.assertEnabled();
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      // Toma la compra: dos confirmaciones simultáneas no acreditan dos veces.
      const claimed = await tx.usageCreditPurchase.updateMany({
        where: { id, status: ManualPaymentReportStatus.SUBMITTED },
        data: {
          status: ManualPaymentReportStatus.CONFIRMED,
          reviewedById: adminId,
          reviewedAt: now,
        },
      });
      if (claimed.count !== 1) {
        throw new ConflictException('Esta compra ya fue revisada');
      }
      const purchase = await tx.usageCreditPurchase.findUniqueOrThrow({
        where: { id },
      });
      const previous = await tx.usageCreditPurchase.count({
        where: {
          userId: purchase.userId,
          status: ManualPaymentReportStatus.CONFIRMED,
          id: { not: id },
        },
      });

      await this.grant(tx, {
        userId: purchase.userId,
        kind: UsageCreditLotKind.PURCHASED,
        units: purchase.units,
        concept: UsageCreditConcept.PURCHASE,
        reference: `PURCHASE-${id}`,
        purchaseId: id,
      });

      let bonus = ZERO;
      if (previous === 0) {
        bonus = dec(purchase.units.mul(FIRST_PURCHASE_BONUS_RATE));
        if (bonus.gt(0)) {
          await this.grant(tx, {
            userId: purchase.userId,
            kind: UsageCreditLotKind.PROMOTIONAL,
            units: bonus,
            concept: UsageCreditConcept.PROMOTION,
            reference: `WELCOME-BONUS-${purchase.userId}`,
            purchaseId: id,
            expiresAt: new Date(
              now.getTime() + PROMOTIONAL_EXPIRY_DAYS * DAY_MS
            ),
            reason: 'Bono de bienvenida (primera compra)',
          });
        }
      }
      return { purchase, bonus };
    });

    await this.notify(result.purchase.userId, {
      title: '✅ Créditos acreditados',
      message: result.bonus.gt(0)
        ? `Confirmamos tu pago: ${result.purchase.units.toFixed(2)} créditos + ${result.bonus.toFixed(2)} de regalo (vencen en ${PROMOTIONAL_EXPIRY_DAYS} días).`
        : `Confirmamos tu pago: ${result.purchase.units.toFixed(2)} créditos.`,
    });
    return { confirmed: true, bonus: result.bonus };
  }

  async rejectPurchase(adminId: string, id: string, reason: string) {
    this.assertEnabled();
    const changed = await this.prisma.usageCreditPurchase.updateMany({
      where: { id, status: ManualPaymentReportStatus.SUBMITTED },
      data: {
        status: ManualPaymentReportStatus.REJECTED,
        rejectionReason: reason.trim(),
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });
    if (changed.count !== 1) {
      throw new ConflictException('Esta compra ya fue revisada');
    }
    const purchase = await this.prisma.usageCreditPurchase.findUniqueOrThrow({
      where: { id },
    });
    await this.notify(purchase.userId, {
      title: 'Compra de créditos rechazada',
      message: `No pudimos verificar tu pago (ref. ${purchase.reference}). Motivo: ${reason.trim()}`,
    });
    return purchase;
  }

  // ─── Consumo y devolución (dentro de la transacción del caller) ──────────

  async consume(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      units: Prisma.Decimal | number;
      concept: Extract<UsageCreditConcept, 'LEAD_FEE' | 'SUCCESS_FEE'>;
      reference: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    const units = dec(input.units);
    if (!units.gt(0)) return { applied: false };

    const existing = await tx.usageCreditEvent.findUnique({
      where: { reference: input.reference },
      select: { id: true },
    });
    if (existing) return { applied: false };

    // Bloquea los lotes del usuario hasta el fin de la transacción: dos
    // consumos simultáneos no pueden gastar el mismo saldo.
    const now = new Date();
    await tx.$queryRaw`
      SELECT id FROM "usage_credit_lots"
      WHERE "userId" = ${input.userId} AND remaining > 0
      FOR UPDATE
    `;
    const lots = await tx.usageCreditLot.findMany({
      where: this.activeLotsWhere(input.userId, now),
    });
    // Promocionales primero (los que vencen antes), luego comprados (FIFO).
    lots.sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind === UsageCreditLotKind.PROMOTIONAL ? -1 : 1;
      }
      const ae = a.expiresAt?.getTime() ?? Infinity;
      const be = b.expiresAt?.getTime() ?? Infinity;
      return ae !== be
        ? ae - be
        : a.createdAt.getTime() - b.createdAt.getTime();
    });
    const available = lots.reduce((acc, l) => acc.plus(l.remaining), ZERO);
    if (available.lt(units)) {
      throw new InsufficientUsageCreditsError(available, units);
    }

    // El insert del evento es la barrera de idempotencia definitiva: si otra
    // transacción ya lo creó, este falla (P2002) y todo se revierte.
    const event = await tx.usageCreditEvent.create({
      data: {
        reference: input.reference,
        userId: input.userId,
        concept: input.concept,
        units: units.neg(),
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    let pending = units;
    for (const lot of lots) {
      if (!pending.gt(0)) break;
      const take = Prisma.Decimal.min(lot.remaining, pending);
      await tx.usageCreditLot.update({
        where: { id: lot.id },
        data: { remaining: { decrement: take } },
      });
      await tx.usageCreditMovement.create({
        data: {
          userId: input.userId,
          lotId: lot.id,
          eventId: event.id,
          type: UsageCreditMovementType.CONSUME,
          concept: input.concept,
          units: take.neg(),
        },
      });
      pending = pending.minus(take);
    }
    return { applied: true };
  }

  async reverse(
    tx: Prisma.TransactionClient,
    input: { reference: string; reason: string }
  ) {
    const original = await tx.usageCreditEvent.findUnique({
      where: { reference: input.reference },
      include: {
        movements: { where: { type: UsageCreditMovementType.CONSUME } },
      },
    });
    if (!original || original.movements.length === 0) {
      return { applied: false };
    }
    const reversalRef = `REVERSAL-${input.reference}`;
    if (
      await tx.usageCreditEvent.findUnique({
        where: { reference: reversalRef },
        select: { id: true },
      })
    ) {
      return { applied: false };
    }
    const total = original.movements.reduce(
      (acc, m) => acc.plus(m.units.abs()),
      ZERO
    );
    const event = await tx.usageCreditEvent.create({
      data: {
        reference: reversalRef,
        userId: original.userId,
        concept: UsageCreditConcept.REVERSAL,
        units: total,
        metadata: { reason: input.reason, original: input.reference },
      },
    });
    // Devuelve cada parte a su lote de origen (un promocional vencido vuelve
    // vencido: no revive unidades que ya habían expirado).
    for (const m of original.movements) {
      if (m.lotId) {
        await tx.usageCreditLot.update({
          where: { id: m.lotId },
          data: { remaining: { increment: m.units.abs() } },
        });
      }
      await tx.usageCreditMovement.create({
        data: {
          userId: original.userId,
          lotId: m.lotId,
          eventId: event.id,
          type: UsageCreditMovementType.REVERSAL,
          concept: UsageCreditConcept.REVERSAL,
          units: m.units.abs(),
        },
      });
    }
    return { applied: true };
  }

  // ─── Vencimiento de promocionales (cron) ─────────────────────────────────

  async expirePromotional(now = new Date()) {
    const lots = await this.prisma.usageCreditLot.findMany({
      where: {
        kind: UsageCreditLotKind.PROMOTIONAL,
        expiresAt: { lte: now },
        remaining: { gt: ZERO },
      },
      take: 500,
    });
    let expired = 0;
    for (const lot of lots) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const changed = await tx.usageCreditLot.updateMany({
            where: { id: lot.id, remaining: lot.remaining },
            data: { remaining: ZERO },
          });
          if (changed.count !== 1) return;
          const event = await tx.usageCreditEvent.create({
            data: {
              reference: `EXPIRE-${lot.id}`,
              userId: lot.userId,
              concept: UsageCreditConcept.EXPIRATION,
              units: lot.remaining.neg(),
            },
          });
          await tx.usageCreditMovement.create({
            data: {
              userId: lot.userId,
              lotId: lot.id,
              eventId: event.id,
              type: UsageCreditMovementType.EXPIRE,
              concept: UsageCreditConcept.EXPIRATION,
              units: lot.remaining.neg(),
            },
          });
          expired++;
        });
      } catch (err) {
        this.logger.warn(
          `No se pudo vencer el lote ${lot.id}: ${(err as Error).message}`
        );
      }
    }
    return { expired };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async grant(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      kind: UsageCreditLotKind;
      units: Prisma.Decimal;
      concept: UsageCreditConcept;
      reference: string;
      purchaseId?: string;
      expiresAt?: Date;
      reason?: string;
    }
  ) {
    const event = await tx.usageCreditEvent.create({
      data: {
        reference: input.reference,
        userId: input.userId,
        concept: input.concept,
        units: input.units,
      },
    });
    const lot = await tx.usageCreditLot.create({
      data: {
        userId: input.userId,
        kind: input.kind,
        units: input.units,
        remaining: input.units,
        expiresAt: input.expiresAt,
        purchaseId: input.purchaseId,
        reason: input.reason,
      },
    });
    await tx.usageCreditMovement.create({
      data: {
        userId: input.userId,
        lotId: lot.id,
        eventId: event.id,
        type: UsageCreditMovementType.GRANT,
        concept: input.concept,
        units: input.units,
      },
    });
    return lot;
  }

  // Una notificación fallida no debe revertir una operación ya confirmada.
  private async notify(
    userId: string,
    dto: { title: string; message: string }
  ) {
    try {
      await this.notifications.createForUser(userId, {
        type: NotificationType.SYSTEM,
        link: '/credits',
        ...dto,
      });
    } catch (err) {
      this.logger.warn(
        `No se pudo notificar a ${userId}: ${(err as Error).message}`
      );
    }
  }
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}
