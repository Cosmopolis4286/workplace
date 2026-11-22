import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { CreateReceivableDto } from './dto/create-receivable.dto';
import { QueryAccountsDto } from './dto/query-accounts.dto';
import { AccountStatus, Prisma } from '@prisma/client';
import {
  add,
  div,
  gt,
  lte,
  mul,
  RATE_SCALE,
  round,
  sub,
  toDecimal,
  toNumber,
} from '../../../common/money/money';
import {
  CreateReceivablePaymentDto,
  MarkReceivablePaidDto,
} from './dto/receivable-payment.dto';

const OPEN_STATUSES: AccountStatus[] = [
  AccountStatus.PENDING,
  AccountStatus.OVERDUE,
];

// Tolerancia al convertir un abono en otra moneda: si el cliente paga "el
// saldo" redondeado (ej. Bs 365 por $10,00 a 36,53), lo que sobra por el
// redondeo (hasta 0,5% del saldo) se toma como saldo completo.
const OVERPAY_TOLERANCE = 0.005;

type ReceivableBalanceRow = {
  amount: Prisma.Decimal | number;
  paidAmount: Prisma.Decimal | number;
  amountUsd: Prisma.Decimal | number;
};

/** Saldo pendiente en la moneda de la cuenta. */
export function receivableBalance(r: ReceivableBalanceRow): Prisma.Decimal {
  const balance = sub(r.amount, r.paidAmount ?? 0);
  return balance.isNegative() ? toDecimal(0) : balance;
}

/**
 * Saldo pendiente en USD, a la tasa de la venta (la misma de amountUsd): la
 * libreta suma deudas en distintas monedas con una sola referencia.
 */
export function receivableBalanceUsd(r: ReceivableBalanceRow): Prisma.Decimal {
  if (!gt(r.amount, 0)) return toDecimal(0);
  return round(mul(r.amountUsd, div(receivableBalance(r), r.amount)));
}

@Injectable()
export class AccountReceivablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRates: ExchangeRatesService,
    private readonly i18n: I18nService
  ) {}

  async create(commerceId: string, userId: string, dto: CreateReceivableDto) {
    let customerId = dto.customerId;
    let creditLimitUsd: Prisma.Decimal | null = null;
    if (customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: customerId, commerceId },
      });
      if (!customer)
        throw new NotFoundException(this.i18n.t('accounts.customer_not_found'));
      creditLimitUsd = customer.creditLimitUsd ?? null;
    }

    if (dto.orderId) {
      const order = await this.prisma.order.findFirst({
        where: { id: dto.orderId, commerceId },
      });
      if (!order)
        throw new NotFoundException(this.i18n.t('accounts.order_not_found'));
    }

    const currencyCode = dto.currencyCode.toUpperCase();
    const resolved = await this.exchangeRates.resolveRateToUsd(currencyCode);
    if (!resolved) {
      throw new BadRequestException(
        this.i18n.t('accounts.invalid_exchange_rate', {
          args: { code: currencyCode },
        })
      );
    }

    // Cliente nuevo de la libreta: se crea aquí (nombre y teléfono).
    if (!customerId && dto.customerName !== undefined) {
      const name = dto.customerName.trim();
      if (!name)
        throw new BadRequestException(
          this.i18n.t('accounts.customer_name_required')
        );
      const created = await this.prisma.customer.create({
        data: {
          commerceId,
          name,
          phone: dto.customerPhone?.trim() || undefined,
        },
      });
      customerId = created.id;
    }

    const amountUsd = round(div(dto.amount, resolved.rateToUsd));
    // Tope de fiado: avisa (no bloquea) si con esta cuenta el cliente lo pasa.
    let creditWarning: {
      limitUsd: number;
      balanceUsd: number;
      newBalanceUsd: number;
    } | null = null;
    if (customerId && creditLimitUsd !== null) {
      const balanceUsd = await this.customerOpenBalanceUsd(
        commerceId,
        customerId
      );
      const newBalanceUsd = add(balanceUsd, amountUsd);
      if (gt(newBalanceUsd, creditLimitUsd)) {
        creditWarning = {
          limitUsd: toNumber(creditLimitUsd),
          balanceUsd: toNumber(balanceUsd),
          newBalanceUsd: toNumber(newBalanceUsd),
        };
      }
    }

    const receivable = await this.prisma.accountReceivable.create({
      data: {
        commerceId,
        customerId,
        orderId: dto.orderId,
        description: dto.description,
        amount: dto.amount,
        currencyCode,
        exchangeRateValue: resolved.rateToUsd,
        amountUsd,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        createdBy: userId,
      },
      include: { customer: { select: { id: true, name: true } } },
    });
    return { ...receivable, creditWarning };
  }

  private async customerOpenBalanceUsd(
    commerceId: string,
    customerId: string
  ): Promise<Prisma.Decimal> {
    const open = await this.prisma.accountReceivable.findMany({
      where: { commerceId, customerId, status: { in: OPEN_STATUSES } },
      select: { amount: true, paidAmount: true, amountUsd: true },
    });
    return open.reduce(
      (acc, r) => add(acc, receivableBalanceUsd(r)),
      toDecimal(0)
    );
  }

  async findAll(commerceId: string, query: QueryAccountsDto) {
    const where: any = { commerceId };
    if (query.status) where.status = query.status;

    return this.prisma.accountReceivable.findMany({
      where,
      include: { customer: { select: { id: true, name: true } } },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });
  }

  async findOne(id: string, commerceId: string) {
    const receivable = await this.prisma.accountReceivable.findFirst({
      where: { id, commerceId },
      include: { customer: { select: { id: true, name: true } } },
    });
    if (!receivable)
      throw new NotFoundException(this.i18n.t('accounts.receivable_not_found'));
    return receivable;
  }

  // "Cobrado": registra el saldo que quedaba como último abono, en la moneda
  // de la cuenta, para que el historial del cliente cuadre.
  async markAsPaid(
    id: string,
    commerceId: string,
    userId?: string,
    dto: MarkReceivablePaidDto = {}
  ) {
    const receivable = await this.findOne(id, commerceId);
    if (!OPEN_STATUSES.includes(receivable.status)) {
      throw new BadRequestException(this.i18n.t('accounts.receivable_closed'));
    }
    const balance = receivableBalance(receivable);
    const rate = toDecimal(receivable.exchangeRateValue);
    return this.applyPayment(receivable, {
      amount: balance,
      currencyCode: receivable.currencyCode,
      exchangeRateValue: rate,
      amountUsd: round(div(balance, rate)),
      appliedAmount: balance,
      method: dto.method ?? null,
      note: null,
      createdBy: userId ?? null,
    });
  }

  /**
   * Abono parcial. Si el cliente paga en otra moneda, se convierte con la
   * tasa del día: la deuda en $ se cobra en Bs a la tasa de hoy.
   */
  async addPayment(
    id: string,
    commerceId: string,
    userId: string,
    dto: CreateReceivablePaymentDto
  ) {
    const receivable = await this.findOne(id, commerceId);
    if (!OPEN_STATUSES.includes(receivable.status)) {
      throw new BadRequestException(this.i18n.t('accounts.receivable_closed'));
    }

    const payCode = dto.currencyCode.toUpperCase();
    const payRate = await this.exchangeRates.resolveRateToUsd(payCode);
    if (!payRate) {
      throw new BadRequestException(
        this.i18n.t('accounts.invalid_exchange_rate', {
          args: { code: payCode },
        })
      );
    }
    const amountUsd = div(dto.amount, payRate.rateToUsd);

    let applied: Prisma.Decimal;
    if (payCode === receivable.currencyCode) {
      applied = toDecimal(dto.amount);
    } else {
      const debtRate = await this.exchangeRates.resolveRateToUsd(
        receivable.currencyCode
      );
      if (!debtRate) {
        throw new BadRequestException(
          this.i18n.t('accounts.invalid_exchange_rate', {
            args: { code: receivable.currencyCode },
          })
        );
      }
      applied = round(mul(amountUsd, debtRate.rateToUsd));
    }

    const balance = receivableBalance(receivable);
    if (gt(applied, balance)) {
      const excess = sub(applied, balance);
      if (!lte(excess, mul(balance, OVERPAY_TOLERANCE))) {
        throw new BadRequestException(
          this.i18n.t('accounts.payment_exceeds_balance', {
            args: {
              applied: toNumber(applied),
              balance: toNumber(balance),
              code: receivable.currencyCode,
            },
          })
        );
      }
      applied = balance;
    }

    return this.applyPayment(receivable, {
      amount: toDecimal(dto.amount),
      currencyCode: payCode,
      exchangeRateValue: payRate.rateToUsd,
      amountUsd: round(amountUsd),
      appliedAmount: applied,
      method: dto.method ?? null,
      note: dto.note?.trim() || null,
      createdBy: userId,
    });
  }

  private async applyPayment(
    receivable: {
      id: string;
      amount: Prisma.Decimal;
      paidAmount: Prisma.Decimal;
    },
    payment: {
      amount: Prisma.Decimal;
      currencyCode: string;
      exchangeRateValue: Prisma.Decimal;
      amountUsd: Prisma.Decimal;
      appliedAmount: Prisma.Decimal;
      method: string | null;
      note: string | null;
      createdBy: string | null;
    }
  ) {
    const newPaid = add(receivable.paidAmount ?? 0, payment.appliedAmount);
    const fullyPaid = !gt(sub(receivable.amount, newPaid), 0);
    return this.prisma.$transaction(async (tx) => {
      // Bloqueo optimista: si otro abono entró entre la lectura y ahora, el
      // saldo cambió y este se rechaza en vez de pasarse del total.
      const updated = await tx.accountReceivable.updateMany({
        where: {
          id: receivable.id,
          paidAmount: receivable.paidAmount ?? 0,
          status: { in: OPEN_STATUSES },
        },
        data: {
          paidAmount: newPaid,
          ...(fullyPaid
            ? { status: AccountStatus.PAID, paidAt: new Date() }
            : {}),
        },
      });
      if (updated.count === 0) {
        throw new ConflictException(this.i18n.t('accounts.payment_conflict'));
      }
      await tx.receivablePayment.create({
        data: { receivableId: receivable.id, ...payment },
      });
      return tx.accountReceivable.findUnique({
        where: { id: receivable.id },
        include: {
          customer: { select: { id: true, name: true } },
          payments: { orderBy: { createdAt: 'desc' } },
        },
      });
    });
  }

  /**
   * Libreta: saldo abierto por cliente, de mayor a menor. Las cuentas sin
   * cliente se agrupan aparte (customer null).
   */
  async ledgerByCustomer(commerceId: string) {
    const open = await this.prisma.accountReceivable.findMany({
      where: { commerceId, status: { in: OPEN_STATUSES } },
      select: {
        amount: true,
        paidAmount: true,
        amountUsd: true,
        createdAt: true,
        customer: {
          select: { id: true, name: true, phone: true, creditLimitUsd: true },
        },
        payments: {
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    type Row = {
      customer: {
        id: string;
        name: string;
        phone: string | null;
        creditLimitUsd: number | null;
      } | null;
      openCount: number;
      balanceUsd: Prisma.Decimal;
      oldestOpenAt: Date;
      lastPaymentAt: Date | null;
    };
    const groups = new Map<string, Row>();
    for (const r of open) {
      const key = r.customer?.id ?? '';
      const row: Row = groups.get(key) ?? {
        customer: r.customer
          ? {
              ...r.customer,
              creditLimitUsd:
                r.customer.creditLimitUsd === null
                  ? null
                  : toNumber(r.customer.creditLimitUsd),
            }
          : null,
        openCount: 0,
        balanceUsd: toDecimal(0),
        oldestOpenAt: r.createdAt,
        lastPaymentAt: null,
      };
      row.openCount += 1;
      row.balanceUsd = add(row.balanceUsd, receivableBalanceUsd(r));
      if (r.createdAt < row.oldestOpenAt) row.oldestOpenAt = r.createdAt;
      const lastPay = r.payments[0]?.createdAt ?? null;
      if (lastPay && (!row.lastPaymentAt || lastPay > row.lastPaymentAt))
        row.lastPaymentAt = lastPay;
      groups.set(key, row);
    }

    const customers = [...groups.values()]
      .map((g) => ({
        ...g,
        balanceUsd: toNumber(g.balanceUsd),
        overLimit:
          g.customer?.creditLimitUsd != null &&
          toNumber(g.balanceUsd) > g.customer.creditLimitUsd,
      }))
      .sort((a, b) => b.balanceUsd - a.balanceUsd);

    return {
      totalUsd: toNumber(
        customers.reduce((acc, c) => add(acc, c.balanceUsd), toDecimal(0))
      ),
      customers,
    };
  }

  /** Historial de un cliente: sus cuentas (abiertas primero) con abonos. */
  async customerLedger(commerceId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, commerceId },
      select: { id: true, name: true, phone: true, creditLimitUsd: true },
    });
    if (!customer)
      throw new NotFoundException(this.i18n.t('accounts.customer_not_found'));

    const receivables = await this.prisma.accountReceivable.findMany({
      where: { commerceId, customerId },
      include: { payments: { orderBy: { createdAt: 'desc' } } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });
    const balanceUsd = receivables
      .filter((r) => OPEN_STATUSES.includes(r.status))
      .reduce((acc, r) => add(acc, receivableBalanceUsd(r)), toDecimal(0));

    return {
      customer: {
        ...customer,
        creditLimitUsd:
          customer.creditLimitUsd === null
            ? null
            : toNumber(customer.creditLimitUsd),
      },
      balanceUsd: toNumber(balanceUsd),
      receivables: receivables.map((r) => ({
        ...r,
        balance: toNumber(receivableBalance(r)),
        balanceUsd: toNumber(receivableBalanceUsd(r)),
      })),
    };
  }

  async updateCreditLimit(
    commerceId: string,
    customerId: string,
    creditLimitUsd: number | null
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, commerceId },
      select: { id: true },
    });
    if (!customer)
      throw new NotFoundException(this.i18n.t('accounts.customer_not_found'));
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { creditLimitUsd },
      select: { id: true, name: true, creditLimitUsd: true },
    });
  }

  async remove(id: string, commerceId: string) {
    await this.findOne(id, commerceId);
    await this.prisma.accountReceivable.delete({ where: { id } });
    return { message: this.i18n.t('accounts.receivable_deleted') };
  }

  // Riesgo de reposición (Business Shield, ver WORKPLACE_VISION.md sección
  // 11): compara la tasa de cambio de la moneda original al momento de la
  // venta contra la tasa actual. Si la moneda se devaluó desde entonces, el
  // mismo monto nominal cobrado hoy equivale a menos USD que cuando se
  // vendió — es la "pérdida de poder de reposición" del ejemplo del audit
  // (venta a 30 días, costo de reposición sube mientras tanto).
  async getReplacementRisk(id: string, commerceId: string) {
    const receivable = await this.findOne(id, commerceId);

    if (receivable.currencyCode === 'USD') {
      return {
        id,
        currencyCode: receivable.currencyCode,
        hasExposure: false,
        message: this.i18n.t('accounts.no_fx_exposure_usd'),
      };
    }

    const current = await this.exchangeRates.resolveRateToUsd(
      receivable.currencyCode
    );
    if (!current) {
      return {
        id,
        currencyCode: receivable.currencyCode,
        hasExposure: false,
        message: this.i18n.t('accounts.no_current_rate'),
      };
    }

    const originalRate = receivable.exchangeRateValue;
    const currentAmountUsd = div(receivable.amount, current.rateToUsd);
    const valueLossUsd = sub(receivable.amountUsd, currentAmountUsd);
    // % que se devaluó la moneda desde la venta hasta hoy respecto al USD.
    const rateChangePct = toNumber(
      mul(div(sub(current.rateToUsd, originalRate), originalRate), 100),
      1
    );

    return {
      id,
      currencyCode: receivable.currencyCode,
      hasExposure: true,
      originalRate: toNumber(originalRate, RATE_SCALE),
      currentRate: toNumber(current.rateToUsd, RATE_SCALE),
      rateChangePct,
      originalAmountUsd: toNumber(receivable.amountUsd),
      currentAmountUsd: toNumber(currentAmountUsd),
      valueLossUsd: toNumber(valueLossUsd),
    };
  }
}
