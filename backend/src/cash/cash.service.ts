import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../prisma/prisma.service';
import { OpenSessionDto } from './dto/open-session.dto';
import { CloseSessionDto } from './dto/close-session.dto';
import { CreateMovementDto } from './dto/create-movement.dto';
import { QuerySessionsDto } from './dto/query-sessions.dto';
import { CashMovementType } from '@prisma/client';

@Injectable()
export class CashService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService
  ) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  async getCommerceId(userId: string): Promise<string> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
      select: { id: true },
    });
    return restaurant?.id ?? userId;
  }

  // ── Sesión activa ──────────────────────────────────────────────────────────

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
    if (existing) throw new ConflictException(this.i18n.t('cash.session.already_open'));

    return this.prisma.cashSession.create({
      data: {
        commerceId,
        openedBy,
        openingAmount: dto.openingAmount,
        notes: dto.notes,
      },
    });
  }

  async close(commerceId: string, closedBy: string, dto: CloseSessionDto) {
    const session = await this.prisma.cashSession.findFirst({
      where: { commerceId, status: 'OPEN' },
    });
    if (!session) throw new NotFoundException(this.i18n.t('cash.session.no_open_session'));

    const { expectedAmount } = await this.getSummary(commerceId, session);
    const difference = dto.countedAmount - expectedAmount;

    return this.prisma.cashSession.update({
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
  }

  // ── Movimientos manuales ────────────────────────────────────────────────────

  async addMovement(commerceId: string, dto: CreateMovementDto) {
    const session = await this.prisma.cashSession.findFirst({
      where: { commerceId, status: 'OPEN' },
    });
    if (!session) throw new NotFoundException(this.i18n.t('cash.session.no_open_session'));

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
    if (!session) throw new NotFoundException(this.i18n.t('cash.session.not_found'));
    return session;
  }

  // ── Cálculo de esperado ─────────────────────────────────────────────────────

  private async getSummary(
    commerceId: string,
    session: { id: string; openingAmount: number; openedAt: Date }
  ) {
    const [cashSales, movements] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          commerceId,
          paymentMethod: 'CASH',
          status: { not: 'CANCELLED' },
          createdAt: { gte: session.openedAt },
        },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.cashMovement.groupBy({
        by: ['type'],
        where: { sessionId: session.id },
        _sum: { amount: true },
      }),
    ]);

    const movementsByType: Record<CashMovementType, number> = {
      INCOME: 0,
      WITHDRAWAL: 0,
    };
    for (const m of movements) movementsByType[m.type] = m._sum.amount ?? 0;

    const cashSalesTotal = cashSales._sum.total ?? 0;
    const expectedAmount =
      session.openingAmount +
      cashSalesTotal +
      movementsByType.INCOME -
      movementsByType.WITHDRAWAL;

    return {
      cashSalesTotal,
      cashSalesCount: cashSales._count,
      manualIncome: movementsByType.INCOME,
      manualWithdrawals: movementsByType.WITHDRAWAL,
      expectedAmount,
    };
  }
}
