import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  FeeTransactionType,
  ManualPaymentReportStatus,
  NotificationType,
  Prisma,
  SellerChargeStatus,
  SellerStatementStatus,
  ServiceStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import {
  EXCHANGE_RATES_FACADE,
  ExchangeRatesFacade,
} from '../exchange-rates/exchange-rates.facade';
import { SellerPaymentAccountsService } from '../payments/manual/seller-payment-accounts.service';
import {
  normalizeReference,
  parsePaidAt,
  snapshotAccount,
  withPayableAmounts,
} from '../payments/manual/payable-accounts';
import { CreateSellerPaymentAccountDto } from '../payments/dto/seller-payment-account.dto';
import { ReportStatementPaymentDto } from './dto/seller-billing.dto';

export const STATEMENT_DUE_DAYS = 5;
export const SUSPENSION_GRACE_HOURS = 48;
// Caracas es UTC-4 todo el año (sin horario de verano).
const CARACAS_OFFSET_MS = 4 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Estados que bloquean publicar (y que la suspensión agrava).
const BLOCKING: SellerStatementStatus[] = [
  SellerStatementStatus.OVERDUE,
  SellerStatementStatus.SUSPENDED,
];
// Estados en los que el vendedor puede reportar un pago.
const PAYABLE: SellerStatementStatus[] = [
  SellerStatementStatus.ISSUED,
  SellerStatementStatus.OVERDUE,
  SellerStatementStatus.SUSPENDED,
];

const FEE_LABELS: Record<FeeTransactionType, string> = {
  ORDER: 'pedido',
  SERVICE_REQUEST: 'servicio',
  RIDE: 'viaje',
  GROUP_BUYING: 'compra agrupada',
  CATALOG_ORDER: 'pedido del catálogo',
};

/** Lunes 00:00 (hora de Caracas) de la semana que contiene `now`, en UTC. */
export function weekStart(now: Date): Date {
  const local = new Date(now.getTime() - CARACAS_OFFSET_MS);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  const mondayLocal = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() - daysSinceMonday
  );
  return new Date(mondayLocal + CARACAS_OFFSET_MS);
}

/**
 * Estado de cuenta del vendedor: las comisiones de la plataforma se acumulan
 * como cargos y se cobran una vez por semana, en vez de debitarse de la
 * billetera en cada venta. WorkPlace no retiene dinero del vendedor: el
 * vendedor le paga a la plataforma su saldo semanal.
 */
@Injectable()
export class SellerBillingService {
  private readonly logger = new Logger(SellerBillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly accounts: SellerPaymentAccountsService,
    @Inject(EXCHANGE_RATES_FACADE)
    private readonly rates: ExchangeRatesFacade
  ) {}

  // ─── Cargos ───────────────────────────────────────────────────────────────

  /**
   * Registra la comisión de una venta. Idempotente por `reference`: un
   * reintento de la misma venta devuelve el cargo existente en vez de cobrar
   * dos veces. `collected`: la comisión ya se retuvo de una garantía (escrow)
   * al liberarla, así que queda registrada pero no se factura.
   */
  async recordCharge(
    input: {
      type: FeeTransactionType;
      sellerUserId: string;
      amount: number;
      reference: string;
      metadata?: Record<string, unknown>;
      collected?: boolean;
    },
    tx?: Prisma.TransactionClient
  ) {
    const amount = new Prisma.Decimal(input.amount).toDecimalPlaces(2);
    if (!amount.gt(0)) return null;

    // Si el caller aporta una transacción, todas las lecturas/escrituras usan
    // ese cliente y la notificación queda a cargo del caller después del commit.
    const client = tx ?? this.prisma;
    const existing = await client.sellerCommissionCharge.findUnique({
      where: { reference: input.reference },
    });
    if (existing) return existing;

    let charge;
    try {
      charge = await client.sellerCommissionCharge.create({
        data: {
          sellerUserId: input.sellerUserId,
          type: input.type,
          reference: input.reference,
          amount,
          status: input.collected
            ? SellerChargeStatus.COLLECTED
            : SellerChargeStatus.PENDING,
          metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      // En una transacción interactiva de PostgreSQL, un P2002 aborta la
      // transacción. No se debe consultar de nuevo dentro de ella: se propaga
      // para que el caller revierta y pueda reintentar la operación completa.
      if (
        !tx &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.prisma.sellerCommissionCharge.findUnique({
          where: { reference: input.reference },
        });
      }
      throw error;
    }

    if (!tx) await this.notifyChargeRecorded(input);
    return charge;
  }

  /**
   * Notificación post-commit para cargos creados dentro de una transacción.
   * Invocar solo después de que $transaction haya resuelto correctamente y
   * únicamente cuando el caller haya confirmado que el cargo fue creado.
   */
  async notifyChargeRecorded(input: {
    type: FeeTransactionType;
    sellerUserId: string;
    amount: number;
    collected?: boolean;
  }) {
    const amount = new Prisma.Decimal(input.amount).toDecimalPlaces(2);
    if (!amount.gt(0)) return;

    const label = FEE_LABELS[input.type] ?? 'venta';
    await this.notify(input.sellerUserId, {
      title: '🧾 Comisión registrada',
      message: input.collected
        ? `Se retuvo una comisión de ${amount.toFixed(2)} de la garantía de un ${label} completado.`
        : `Se sumó una comisión de ${amount.toFixed(2)} por un ${label} completado a tu estado de cuenta semanal.`,
      link: '/billing',
      metadata: { feeType: input.type, feeAmount: amount.toNumber() },
    });
  }

  // ─── Emisión semanal ──────────────────────────────────────────────────────

  /**
   * Agrupa los cargos pendientes anteriores al lunes en curso en un estado de
   * cuenta por vendedor. Idempotente: (vendedor, periodStart) es único y los
   * cargos solo se toman si todavía no tienen estado de cuenta.
   */
  async issueStatements(now = new Date()) {
    const periodEnd = weekStart(now);
    const periodStart = new Date(periodEnd.getTime() - 7 * DAY_MS);

    const sellers = await this.prisma.sellerCommissionCharge.groupBy({
      by: ['sellerUserId'],
      where: {
        status: SellerChargeStatus.PENDING,
        statementId: null,
        createdAt: { lt: periodEnd },
      },
    });

    let issued = 0;
    for (const { sellerUserId } of sellers) {
      try {
        const statement = await this.issueFor(
          sellerUserId,
          periodStart,
          periodEnd,
          now
        );
        if (statement) issued++;
      } catch (error) {
        this.logger.error(
          `No se pudo emitir el estado de cuenta de ${sellerUserId}: ${(error as Error).message}`
        );
      }
    }
    return { issued };
  }

  private async issueFor(
    sellerUserId: string,
    periodStart: Date,
    periodEnd: Date,
    now: Date
  ) {
    const statement = await this.prisma.$transaction(async (tx) => {
      const exists = await tx.sellerStatement.findUnique({
        where: { sellerUserId_periodStart: { sellerUserId, periodStart } },
        select: { id: true },
      });
      if (exists) return null;

      const created = await tx.sellerStatement.create({
        data: {
          sellerUserId,
          periodStart,
          periodEnd,
          totalAmount: 0,
          issuedAt: now,
          dueAt: new Date(now.getTime() + STATEMENT_DUE_DAYS * DAY_MS),
        },
      });
      // Incluye también cargos de semanas anteriores que hayan quedado sin
      // emitir (ej. el cron no corrió): nada se pierde ni se cobra dos veces.
      await tx.sellerCommissionCharge.updateMany({
        where: {
          sellerUserId,
          status: SellerChargeStatus.PENDING,
          statementId: null,
          createdAt: { lt: periodEnd },
        },
        data: {
          statementId: created.id,
          status: SellerChargeStatus.STATEMENTED,
        },
      });
      const sum = await tx.sellerCommissionCharge.aggregate({
        where: { statementId: created.id },
        _sum: { amount: true },
      });
      const total = sum._sum.amount ?? new Prisma.Decimal(0);
      if (!total.gt(0)) {
        await tx.sellerStatement.delete({ where: { id: created.id } });
        return null;
      }
      return tx.sellerStatement.update({
        where: { id: created.id },
        data: { totalAmount: total },
      });
    });

    if (statement) {
      await this.notify(sellerUserId, {
        title: '🧾 Nuevo estado de cuenta',
        message: `Tu estado de cuenta semanal es de $${statement.totalAmount.toFixed(2)} en comisiones. Vence el ${this.formatDate(statement.dueAt)}.`,
        link: '/billing',
        metadata: { statementId: statement.id },
      });
    }
    return statement;
  }

  // ─── Vencimiento y suspensión ─────────────────────────────────────────────

  /**
   * Vencido → bloquea publicar. 48 h después del vencimiento sin pagar →
   * pausa lo publicado. Un pago reportado (PAYMENT_REPORTED) congela la
   * escalada mientras un admin lo revisa.
   */
  async enforceDeadlines(now = new Date()) {
    const overdue = await this.prisma.sellerStatement.findMany({
      where: { status: SellerStatementStatus.ISSUED, dueAt: { lt: now } },
    });
    for (const st of overdue) {
      const changed = await this.prisma.sellerStatement.updateMany({
        where: { id: st.id, status: SellerStatementStatus.ISSUED },
        data: { status: SellerStatementStatus.OVERDUE, overdueAt: now },
      });
      if (changed.count === 1) {
        await this.notify(st.sellerUserId, {
          title: '⚠️ Estado de cuenta vencido',
          message: `Tu estado de cuenta de $${st.totalAmount.toFixed(2)} venció. No puedes publicar ni activar servicios o productos hasta pagarlo. Si en ${SUSPENSION_GRACE_HOURS} h sigue sin pagar, se pausará lo que tienes publicado.`,
          link: '/billing',
          metadata: { statementId: st.id },
        });
      }
    }

    const graceLimit = new Date(
      now.getTime() - SUSPENSION_GRACE_HOURS * 60 * 60 * 1000
    );
    const toSuspend = await this.prisma.sellerStatement.findMany({
      where: {
        status: SellerStatementStatus.OVERDUE,
        dueAt: { lt: graceLimit },
      },
    });
    for (const st of toSuspend) {
      await this.suspend(st.id, st.sellerUserId, now);
    }

    return { overdue: overdue.length, suspended: toSuspend.length };
  }

  private async suspend(statementId: string, sellerUserId: string, now: Date) {
    const result = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.sellerStatement.updateMany({
        where: { id: statementId, status: SellerStatementStatus.OVERDUE },
        data: { status: SellerStatementStatus.SUSPENDED, suspendedAt: now },
      });
      if (changed.count !== 1) return null;

      const services = await tx.service.findMany({
        where: { userId: sellerUserId, status: ServiceStatus.ACTIVE },
        select: { id: true },
      });
      const commerce = await tx.commerce.findUnique({
        where: { userId: sellerUserId },
        select: { id: true },
      });
      const products = commerce
        ? await tx.product.findMany({
            where: { commerceId: commerce.id, forSale: true },
            select: { id: true },
          })
        : [];

      const serviceIds = services.map((s) => s.id);
      const productIds = products.map((p) => p.id);
      if (serviceIds.length) {
        await tx.service.updateMany({
          where: { id: { in: serviceIds } },
          data: { status: ServiceStatus.PAUSED },
        });
      }
      if (productIds.length) {
        await tx.product.updateMany({
          where: { id: { in: productIds } },
          data: { forSale: false },
        });
      }
      await tx.sellerStatement.update({
        where: { id: statementId },
        data: { pausedServiceIds: serviceIds, pausedProductIds: productIds },
      });
      return { services: serviceIds.length, products: productIds.length };
    });

    if (result) {
      await this.notify(sellerUserId, {
        title: '⛔ Publicaciones pausadas',
        message: `Por falta de pago de tu estado de cuenta se pausaron ${result.services} servicio(s) y ${result.products} producto(s). Se reactivan automáticamente al confirmarse el pago.`,
        link: '/billing',
        metadata: { statementId },
      });
    }
  }

  // ─── Vendedor ─────────────────────────────────────────────────────────────

  async hasBlockingDebt(sellerUserId: string) {
    const count = await this.prisma.sellerStatement.count({
      where: { sellerUserId, status: { in: BLOCKING } },
    });
    return count > 0;
  }

  async getMySummary(sellerUserId: string) {
    const [pending, statements] = await Promise.all([
      this.prisma.sellerCommissionCharge.findMany({
        where: { sellerUserId, status: SellerChargeStatus.PENDING },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sellerStatement.findMany({
        where: { sellerUserId },
        orderBy: { periodStart: 'desc' },
        take: 20,
        include: {
          charges: { orderBy: { createdAt: 'asc' } },
          payments: { orderBy: { createdAt: 'desc' } },
        },
      }),
    ]);
    const accrued = pending.reduce(
      (sum, c) => sum.plus(c.amount),
      new Prisma.Decimal(0)
    );
    return {
      currentPeriod: {
        start: weekStart(new Date()),
        accrued,
        charges: pending,
      },
      statements,
      blocked: statements.some((s) => BLOCKING.includes(s.status)),
      dueDays: STATEMENT_DUE_DAYS,
      graceHours: SUSPENSION_GRACE_HOURS,
    };
  }

  async getPaymentOptions(sellerUserId: string, statementId: string) {
    const statement = await this.findOwnedStatement(sellerUserId, statementId);
    const accounts = await this.prisma.platformCollectionAccount.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return {
      statement,
      accounts: await withPayableAmounts(
        this.rates,
        accounts,
        statement.currency,
        statement.totalAmount
      ),
    };
  }

  async reportPayment(
    sellerUserId: string,
    statementId: string,
    dto: ReportStatementPaymentDto
  ) {
    const statement = await this.findOwnedStatement(sellerUserId, statementId);
    if (!PAYABLE.includes(statement.status)) {
      throw new ConflictException(
        statement.status === SellerStatementStatus.PAYMENT_REPORTED
          ? 'Ya reportaste un pago; está en revisión'
          : 'Este estado de cuenta ya está pagado'
      );
    }

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

    const duplicate = await this.prisma.sellerStatementPayment.findFirst({
      where: {
        reference,
        status: { not: ManualPaymentReportStatus.REJECTED },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException('Esa referencia ya fue reportada');
    }

    const [priced] = await withPayableAmounts(
      this.rates,
      [account],
      statement.currency,
      statement.totalAmount
    );
    if (priced.amount === null) {
      throw new ConflictException(
        'No hay una tasa de cambio vigente para pagar en esta moneda'
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.sellerStatement.updateMany({
        where: { id: statement.id, status: { in: PAYABLE } },
        data: { status: SellerStatementStatus.PAYMENT_REPORTED },
      });
      if (changed.count !== 1) {
        throw new ConflictException('El estado de cuenta cambió; recarga');
      }
      return tx.sellerStatementPayment.create({
        data: {
          statementId: statement.id,
          sellerUserId,
          platformAccountId: account.id,
          destination: snapshotAccount(account),
          reference,
          payerBankCode: dto.payerBankCode,
          paidAt,
          paidCurrency: account.currency,
          paidAmount: priced.amount!,
          exchangeRate: priced.exchangeRate,
        },
      });
    });
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async listStatements(status?: SellerStatementStatus) {
    const statements = await this.prisma.sellerStatement.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ dueAt: 'asc' }],
      take: 200,
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    return this.withSellerNames(statements);
  }

  async listPayments(status?: ManualPaymentReportStatus) {
    const payments = await this.prisma.sellerStatementPayment.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        statement: {
          select: {
            id: true,
            totalAmount: true,
            currency: true,
            periodStart: true,
            periodEnd: true,
            status: true,
            dueAt: true,
          },
        },
      },
    });
    return this.withSellerNames(payments);
  }

  async confirmPayment(adminId: string, paymentId: string) {
    const payment = await this.findSubmittedPayment(paymentId);
    const statement = await this.prisma.$transaction(async (tx) => {
      await this.settlePayment(
        tx,
        paymentId,
        ManualPaymentReportStatus.CONFIRMED,
        adminId
      );
      const st = await tx.sellerStatement.update({
        where: { id: payment.statementId },
        data: { status: SellerStatementStatus.PAID, paidAt: new Date() },
      });
      // Reactiva solo lo que esta suspensión pausó y sigue pausado.
      if (st.pausedServiceIds.length) {
        await tx.service.updateMany({
          where: {
            id: { in: st.pausedServiceIds },
            status: ServiceStatus.PAUSED,
          },
          data: { status: ServiceStatus.ACTIVE },
        });
      }
      if (st.pausedProductIds.length) {
        await tx.product.updateMany({
          where: { id: { in: st.pausedProductIds }, forSale: false },
          data: { forSale: true },
        });
      }
      return tx.sellerStatement.update({
        where: { id: st.id },
        data: { pausedServiceIds: [], pausedProductIds: [] },
      });
    });

    await this.notify(payment.sellerUserId, {
      title: '✅ Estado de cuenta pagado',
      message: `Confirmamos tu pago de $${statement.totalAmount.toFixed(2)} (ref. ${payment.reference}).${statement.suspendedAt ? ' Tus publicaciones se reactivaron.' : ''}`,
      link: '/billing',
      metadata: { statementId: statement.id },
    });
    return statement;
  }

  async rejectPayment(adminId: string, paymentId: string, reason: string) {
    const trimmed = reason?.trim();
    if (!trimmed || trimmed.length < 5) {
      throw new BadRequestException(
        'Explica al vendedor por qué no se encontró el pago'
      );
    }
    const payment = await this.findSubmittedPayment(paymentId);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await this.settlePayment(
        tx,
        paymentId,
        ManualPaymentReportStatus.REJECTED,
        adminId,
        trimmed
      );
      const st = await tx.sellerStatement.findUniqueOrThrow({
        where: { id: payment.statementId },
      });
      // Vuelve al estado que corresponde por fechas; el cron sigue la escalada.
      const status = st.suspendedAt
        ? SellerStatementStatus.SUSPENDED
        : st.dueAt < now
          ? SellerStatementStatus.OVERDUE
          : SellerStatementStatus.ISSUED;
      await tx.sellerStatement.update({
        where: { id: st.id },
        data: {
          status,
          overdueAt:
            status === SellerStatementStatus.OVERDUE
              ? (st.overdueAt ?? now)
              : st.overdueAt,
        },
      });
    });

    await this.notify(payment.sellerUserId, {
      title: '⚠️ Pago no encontrado',
      message: `No encontramos tu pago del estado de cuenta (ref. ${payment.reference}): ${trimmed}. Revisa los datos y repórtalo de nuevo.`,
      link: '/billing',
      metadata: { statementId: payment.statementId },
    });
    return { rejected: true };
  }

  // Cuentas de cobro de la plataforma (mismas validaciones que las del vendedor).
  listPlatformAccounts(activeOnly = false) {
    return this.prisma.platformCollectionAccount.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    });
  }

  createPlatformAccount(adminId: string, dto: CreateSellerPaymentAccountDto) {
    const data = this.accounts.normalize(dto);
    return this.prisma.platformCollectionAccount.create({
      data: { ...data, createdById: adminId },
    });
  }

  async setPlatformAccountActive(id: string, isActive: boolean) {
    await this.findPlatformAccount(id);
    return this.prisma.platformCollectionAccount.update({
      where: { id },
      data: { isActive },
    });
  }

  async removePlatformAccount(id: string) {
    await this.findPlatformAccount(id);
    const used = await this.prisma.sellerStatementPayment.count({
      where: { platformAccountId: id },
    });
    if (used > 0) {
      await this.prisma.platformCollectionAccount.update({
        where: { id },
        data: { isActive: false },
      });
      return { deleted: false, deactivated: true };
    }
    await this.prisma.platformCollectionAccount.delete({ where: { id } });
    return { deleted: true, deactivated: false };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async findOwnedStatement(sellerUserId: string, id: string) {
    const statement = await this.prisma.sellerStatement.findUnique({
      where: { id },
    });
    if (!statement || statement.sellerUserId !== sellerUserId) {
      throw new NotFoundException('Estado de cuenta no encontrado');
    }
    return statement;
  }

  private async findSubmittedPayment(id: string) {
    const payment = await this.prisma.sellerStatementPayment.findUnique({
      where: { id },
    });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    if (payment.status !== ManualPaymentReportStatus.SUBMITTED) {
      throw new ConflictException('Este pago ya fue revisado');
    }
    return payment;
  }

  private async findPlatformAccount(id: string) {
    const account = await this.prisma.platformCollectionAccount.findUnique({
      where: { id },
    });
    if (!account) throw new NotFoundException('Cuenta de cobro no encontrada');
    return account;
  }

  private async settlePayment(
    tx: Prisma.TransactionClient,
    id: string,
    status: ManualPaymentReportStatus,
    adminId: string,
    rejectionReason?: string
  ) {
    const changed = await tx.sellerStatementPayment.updateMany({
      where: { id, status: ManualPaymentReportStatus.SUBMITTED },
      data: {
        status,
        rejectionReason,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });
    if (changed.count !== 1) {
      throw new ConflictException('Este pago ya fue revisado');
    }
  }

  private async withSellerNames<T extends { sellerUserId: string }>(rows: T[]) {
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.sellerUserId))] } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return rows.map((r) => {
      const u = byId.get(r.sellerUserId);
      return {
        ...r,
        sellerName: u
          ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
          : null,
        sellerEmail: u?.email ?? null,
      };
    });
  }

  private formatDate(date: Date) {
    return date.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: 'short',
      timeZone: 'America/Caracas',
    });
  }

  // Una notificación fallida no debe revertir una operación de dinero.
  private async notify(
    userId: string,
    dto: {
      title: string;
      message: string;
      link?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    try {
      await this.notifications.createForUser(userId, {
        type: NotificationType.SYSTEM,
        ...dto,
      });
    } catch {
      // best-effort
    }
  }
}