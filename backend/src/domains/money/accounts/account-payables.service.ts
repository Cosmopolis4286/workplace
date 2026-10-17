import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { CreatePayableDto } from './dto/create-payable.dto';
import { QueryAccountsDto } from './dto/query-accounts.dto';
import { AccountStatus } from '@prisma/client';

@Injectable()
export class AccountPayablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRates: ExchangeRatesService,
    private readonly i18n: I18nService
  ) {}

  async create(commerceId: string, userId: string, dto: CreatePayableDto) {
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, commerceId },
      });
      if (!supplier)
        throw new NotFoundException(this.i18n.t('accounts.supplier_not_found'));
    }

    if (dto.purchaseId) {
      const purchase = await this.prisma.purchase.findFirst({
        where: { id: dto.purchaseId, commerceId },
      });
      if (!purchase)
        throw new NotFoundException(this.i18n.t('accounts.purchase_not_found'));
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

    return this.prisma.accountPayable.create({
      data: {
        commerceId,
        supplierId: dto.supplierId,
        purchaseId: dto.purchaseId,
        description: dto.description,
        amount: dto.amount,
        currencyCode,
        exchangeRateValue: resolved.rateToUsd,
        amountUsd: dto.amount / resolved.rateToUsd,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        createdBy: userId,
      },
      include: { supplier: { select: { id: true, name: true } } },
    });
  }

  async findAll(commerceId: string, query: QueryAccountsDto) {
    const where: any = { commerceId };
    if (query.status) where.status = query.status;

    return this.prisma.accountPayable.findMany({
      where,
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });
  }

  async findOne(id: string, commerceId: string) {
    const payable = await this.prisma.accountPayable.findFirst({
      where: { id, commerceId },
      include: { supplier: { select: { id: true, name: true } } },
    });
    if (!payable)
      throw new NotFoundException(this.i18n.t('accounts.payable_not_found'));
    return payable;
  }

  async markAsPaid(id: string, commerceId: string) {
    await this.findOne(id, commerceId);
    return this.prisma.accountPayable.update({
      where: { id },
      data: { status: AccountStatus.PAID, paidAt: new Date() },
    });
  }

  async remove(id: string, commerceId: string) {
    await this.findOne(id, commerceId);
    await this.prisma.accountPayable.delete({ where: { id } });
    return { message: this.i18n.t('accounts.payable_deleted') };
  }
}
