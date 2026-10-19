import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { Prisma, CashMovementType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  sub,
  sum,
  toDecimal,
  toNumber,
  type MoneyInput,
} from '../../../common/money/money';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';
import { OpenSessionDto } from './dto/open-session.dto';
import { CloseSessionDto } from './dto/close-session.dto';
import { CreateMovementDto } from './dto/create-movement.dto';
import { QuerySessionsDto } from './dto/query-sessions.dto';

@Injectable()
export class CashService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commerceResolver: CommerceResolverService,
    private readonly i18n: I18nService
  ) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  async getCommerceId(userId: string): Promise<string> {
    return this.commerceResolver.resolve(userId);
  }

  // ── Sesión activa ──────────────────────────────────────────────────────────

  async hasOpenSession(commerceId: string): Promise<boolean> {
    const session = await this.prisma.cashSession.findFirst({
      where: { commerceId, status: 'OPEN' },
      select: { id: true },
    });
    return !!session;
  }

  async getCurrent(commerceId: string) {
    const session = await this.prisma.cashSession.findFirst({
      where: { commerceId, status: 'OPEN' },
      include: { movements: { orderBy: { createdAt: 'desc' } } },
    });
    if (!session) return null;

    const summary = await this.getSummary(commerceId, session);
    return { ...session, ...summary };
  }

  async open(commerceId: string, openedBy: string, dto: OpenSessionDto) {
    const existing = await this.prisma.cashSession.findFirst({
      where: { commerceId, status: 'OPEN' },
    });
    if (existing)
      throw new ConflictException(this.i18n.t('cash.session.already_open'));

    // El chequeo de arriba deja una ventana de carrera (dos requests
    // concurrentes pueden pasarlo antes de que cualquiera haga el create).
    // La garantía real es el índice único parcial
    // cash_sessions_commerceId_open_unique (WHERE status='OPEN') agregado en
    // la migración unique_open_cash_session_per_commerce — si la carrera
    // ocurre, el segundo create() falla con P2002 y lo traducimos al mismo
    // error legible en vez de dejar que caiga al 409 genérico del filtro global.
    try {
      return await this.prisma.cashSession.create({
        data: {
          commerceId,
          openedBy,
          openingAmount: dto.openingAmount,
          notes: dto.notes,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(this.i18n.t('cash.session.already_open'));
      }
      throw e;
    }
  }

  async close(commerceId: string, closedBy: string, dto: CloseSessionDto) {
    // Lectura (ventas/movimientos → expectedAmount) y escritura (el update
    // que cierra la sesión) en una sola transacción: si quedaran separadas,
    // un CashMovement agregado entre el cálculo y el update dejaría la
    // sesión cerrada con un expectedAmount que ya no refleja lo que había en
    // el momento real del cierre — el "arqueo" quedaría mal calculado sin
    // que nada lo señale.
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.cashSession.findFirst({
        where: { commerceId, status: 'OPEN' },
      });
      if (!session)
        throw new NotFoundException(
          this.i18n.t('cash.session.no_open_session')
        );

      const { expectedAmount } = await this.getSummary(commerceId, session, tx);
      const difference = sub(dto.countedAmount, expectedAmount);

      return tx.cashSession.update({
        where: { id: session.id },
        data: {
          status: 'CLOSED',
          countedAmount: dto.countedAmount,
          expectedAmount,
          difference,
          closedAt: new Date(),
          closedBy,
          closingNotes: dto.closingNotes,
        },
      });
    });
  }

  // ── Movimientos manuales ────────────────────────────────────────────────────

  async addMovement(commerceId: string, dto: CreateMovementDto) {
    const session = await this.prisma.cashSession.findFirst({
      where: { commerceId, status: 'OPEN' },
    });
    if (!session)
      throw new NotFoundException(this.i18n.t('cash.session.no_open_session'));

    return this.prisma.cashMovement.create({
      data: {
        commerceId,
        sessionId: session.id,
        type: dto.type,
        amount: dto.amount,
        reason: dto.reason,
      },
    });
  }

  // ── Historial ────────────────────────────────────────────────────────────

  async findAll(commerceId: string, query: QuerySessionsDto) {
    const { status, dateFrom, dateTo, page = 1, limit = 20 } = query;

    const where: any = { commerceId };
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.openedAt = {};
      if (dateFrom) where.openedAt.gte = new Date(dateFrom);
      if (dateTo) where.openedAt.lte = new Date(dateTo + 'T23:59:59');
    }

    const [data, total] = await Promise.all([
      this.prisma.cashSession.findMany({
        where,
        orderBy: { openedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.cashSession.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, commerceId: string) {
    const session = await this.prisma.cashSession.findFirst({
      where: { id, commerceId },
      include: { movements: { orderBy: { createdAt: 'desc' } } },
    });
    if (!session)
      throw new NotFoundException(this.i18n.t('cash.session.not_found'));
    return session;
  }

  // ── Cálculo de esperado ─────────────────────────────────────────────────────

  private async getSummary(
    commerceId: string,
    session: { id: string; openingAmount: MoneyInput; openedAt: Date },
    client: Prisma.TransactionClient | PrismaService = this.prisma
  ) {
    const [cashSales, movements] = await Promise.all([
      client.order.aggregate({
        where: {
          commerceId,
          paymentMethod: 'CASH',
          status: { not: 'CANCELLED' },
          createdAt: { gte: session.openedAt },
        },
        _sum: { total: true },
        _count: true,
      }),
      client.cashMovement.groupBy({
        by: ['type'],
        where: { sessionId: session.id },
        _sum: { amount: true },
      }),
    ]);

    const movementsByType: Record<CashMovementType, Prisma.Decimal> = {
      INCOME: toDecimal(0),
      WITHDRAWAL: toDecimal(0),
    };
    for (const m of movements)
      movementsByType[m.type] = toDecimal(m._sum.amount ?? 0);

    // Order.total sigue en Float (tanda de precios pendiente): su suma puede
    // traer ruido de coma flotante, por eso se redondea al centavo.
    const cashSalesTotal = toNumber(cashSales._sum.total ?? 0);
    const expectedAmount = sub(
      sum([session.openingAmount, cashSalesTotal, movementsByType.INCOME]),
      movementsByType.WITHDRAWAL
    );

    return {
      cashSalesTotal,
      cashSalesCount: cashSales._count,
      manualIncome: toNumber(movementsByType.INCOME),
      manualWithdrawals: toNumber(movementsByType.WITHDRAWAL),
      expectedAmount: toNumber(expectedAmount),
    };
  }
}
