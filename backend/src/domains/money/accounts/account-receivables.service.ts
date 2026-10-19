import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { CreateReceivableDto } from './dto/create-receivable.dto';
import { QueryAccountsDto } from './dto/query-accounts.dto';
import { AccountStatus } from '@prisma/client';
import {
  div,
  mul,
  RATE_SCALE,
  round,
  sub,
  toNumber,
} from '../../../common/money/money';

@Injectable()
export class AccountReceivablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRates: ExchangeRatesService,
    private readonly i18n: I18nService
  ) {}

  async create(commerceId: string, userId: string, dto: CreateReceivableDto) {
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, commerceId },
      });
      if (!customer)
        throw new NotFoundException(this.i18n.t('accounts.customer_not_found'));
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

    return this.prisma.accountReceivable.create({
      data: {
        commerceId,
        customerId: dto.customerId,
        orderId: dto.orderId,
        description: dto.description,
        amount: dto.amount,
        currencyCode,
        exchangeRateValue: resolved.rateToUsd,
        amountUsd: round(div(dto.amount, resolved.rateToUsd)),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        createdBy: userId,
      },
      include: { customer: { select: { id: true, name: true } } },
    });
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

  async markAsPaid(id: string, commerceId: string) {
    await this.findOne(id, commerceId);
    return this.prisma.accountReceivable.update({
      where: { id },
      data: { status: AccountStatus.PAID, paidAt: new Date() },
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
