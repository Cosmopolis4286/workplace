import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { AccountStatus, Prisma } from '@prisma/client';
import {
  AccountReceivablesService,
  receivableBalance,
  receivableBalanceUsd,
} from '../../domains/money/accounts/account-receivables.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ExchangeRatesService } from '../../domains/money/exchange-rates/exchange-rates.service';
import { money } from '../money-matcher';

const D = (n: number) => new Prisma.Decimal(n);

describe('Fiado: abonos, libreta y tope', () => {
  let service: AccountReceivablesService;

  const tx = {
    accountReceivable: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    receivablePayment: { create: jest.fn() },
  };
  const prisma = {
    customer: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    order: { findFirst: jest.fn() },
    accountReceivable: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((fn: any) => fn(tx)),
  };
  const rates: Record<string, number> = { USD: 1, VES: 40 };
  const exchangeRates = {
    resolveRateToUsd: jest.fn(async (code: string) =>
      rates[code] ? { rateToUsd: D(rates[code]), source: null } : null
    ),
  };
  const i18n = { t: jest.fn((k: string) => k) };

  const commerceId = 'c1';
  const usdDebt = {
    id: 'r1',
    commerceId,
    currencyCode: 'USD',
    amount: D(10),
    paidAmount: D(0),
    amountUsd: D(10),
    exchangeRateValue: D(1),
    status: AccountStatus.PENDING,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    tx.accountReceivable.updateMany.mockResolvedValue({ count: 1 });
    tx.accountReceivable.findUnique.mockResolvedValue({ id: 'r1' });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountReceivablesService,
        { provide: PrismaService, useValue: prisma },
        { provide: ExchangeRatesService, useValue: exchangeRates },
        { provide: I18nService, useValue: i18n },
      ],
    }).compile();
    service = module.get(AccountReceivablesService);
  });

  it('saldo = monto - abonado; en USD a la tasa de la venta', () => {
    const r = { amount: D(4000), paidAmount: D(1000), amountUsd: D(100) };
    expect(receivableBalance(r)).toEqual(money(3000));
    expect(receivableBalanceUsd(r)).toEqual(money(75));
  });

  it('abono parcial en la misma moneda: baja el saldo y sigue PENDING', async () => {
    prisma.accountReceivable.findFirst.mockResolvedValue({ ...usdDebt });
    await service.addPayment('r1', commerceId, 'u1', {
      amount: 4,
      currencyCode: 'usd',
      method: 'CASH',
    });
    const call = tx.accountReceivable.updateMany.mock.calls[0][0];
    expect(call.where).toEqual(
      expect.objectContaining({ id: 'r1', paidAmount: D(0) })
    );
    expect(call.data.paidAmount).toEqual(money(4));
    expect(call.data.status).toBeUndefined();
    expect(tx.receivablePayment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        receivableId: 'r1',
        currencyCode: 'USD',
        appliedAmount: money(4),
        method: 'CASH',
      }),
    });
  });

  it('deuda en $ abonada en Bs: se convierte con la tasa del día', async () => {
    prisma.accountReceivable.findFirst.mockResolvedValue({ ...usdDebt });
    await service.addPayment('r1', commerceId, 'u1', {
      amount: 200,
      currencyCode: 'VES',
    });
    const payment = tx.receivablePayment.create.mock.calls[0][0].data;
    expect(payment.amount).toEqual(money(200));
    expect(payment.amountUsd).toEqual(money(5));
    expect(payment.appliedAmount).toEqual(money(5));
  });

  it('el abono que completa el saldo marca la cuenta como PAID', async () => {
    prisma.accountReceivable.findFirst.mockResolvedValue({
      ...usdDebt,
      paidAmount: D(6),
    });
    await service.addPayment('r1', commerceId, 'u1', {
      amount: 4,
      currencyCode: 'USD',
    });
    const data = tx.accountReceivable.updateMany.mock.calls[0][0].data;
    expect(data.status).toBe(AccountStatus.PAID);
    expect(data.paidAt).toBeInstanceOf(Date);
  });

  it('redondeo al pagar en Bs (hasta 0,5% de más) cuenta como saldo completo', async () => {
    prisma.accountReceivable.findFirst.mockResolvedValue({ ...usdDebt });
    await service.addPayment('r1', commerceId, 'u1', {
      amount: 401,
      currencyCode: 'VES',
    });
    const payment = tx.receivablePayment.create.mock.calls[0][0].data;
    expect(payment.appliedAmount).toEqual(money(10));
    expect(tx.accountReceivable.updateMany.mock.calls[0][0].data.status).toBe(
      AccountStatus.PAID
    );
  });

  it('rechaza un abono mayor que el saldo', async () => {
    prisma.accountReceivable.findFirst.mockResolvedValue({ ...usdDebt });
    await expect(
      service.addPayment('r1', commerceId, 'u1', {
        amount: 12,
        currencyCode: 'USD',
      })
    ).rejects.toThrow(BadRequestException);
    expect(tx.receivablePayment.create).not.toHaveBeenCalled();
  });

  it('rechaza abonos a una cuenta ya cobrada', async () => {
    prisma.accountReceivable.findFirst.mockResolvedValue({
      ...usdDebt,
      status: AccountStatus.PAID,
    });
    await expect(
      service.addPayment('r1', commerceId, 'u1', {
        amount: 1,
        currencyCode: 'USD',
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('si otro abono cambió el saldo entre medio, no se pasa del total', async () => {
    prisma.accountReceivable.findFirst.mockResolvedValue({ ...usdDebt });
    tx.accountReceivable.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.addPayment('r1', commerceId, 'u1', {
        amount: 4,
        currencyCode: 'USD',
      })
    ).rejects.toThrow(ConflictException);
    expect(tx.receivablePayment.create).not.toHaveBeenCalled();
  });

  it('"Cobrado" registra el saldo restante como último abono', async () => {
    prisma.accountReceivable.findFirst.mockResolvedValue({
      ...usdDebt,
      paidAmount: D(3),
    });
    await service.markAsPaid('r1', commerceId, 'u1', { method: 'PAGO_MOVIL' });
    expect(tx.receivablePayment.create.mock.calls[0][0].data).toEqual(
      expect.objectContaining({ appliedAmount: money(7), method: 'PAGO_MOVIL' })
    );
    expect(tx.accountReceivable.updateMany.mock.calls[0][0].data.status).toBe(
      AccountStatus.PAID
    );
  });

  it('avisa (sin bloquear) cuando el fiado pasa el tope del cliente', async () => {
    prisma.customer.findFirst.mockResolvedValue({
      id: 'cu1',
      creditLimitUsd: D(20),
    });
    prisma.accountReceivable.findMany.mockResolvedValue([
      { amount: D(15), paidAmount: D(0), amountUsd: D(15) },
    ]);
    prisma.accountReceivable.create.mockResolvedValue({ id: 'r2' });
    const res = await service.create(commerceId, 'u1', {
      description: 'Harina',
      amount: 8,
      currencyCode: 'USD',
      customerId: 'cu1',
    });
    expect(prisma.accountReceivable.create).toHaveBeenCalled();
    expect(res.creditWarning).toEqual({
      limitUsd: 20,
      balanceUsd: 15,
      newBalanceUsd: 23,
    });
  });

  it('crea el cliente de la libreta con nombre y teléfono', async () => {
    prisma.customer.create.mockResolvedValue({ id: 'new' });
    prisma.accountReceivable.create.mockResolvedValue({ id: 'r3' });
    const res = await service.create(commerceId, 'u1', {
      description: 'Pan',
      amount: 2,
      currencyCode: 'USD',
      customerName: ' Pedro ',
      customerPhone: '0414-1234567',
    });
    expect(prisma.customer.create).toHaveBeenCalledWith({
      data: { commerceId, name: 'Pedro', phone: '0414-1234567' },
    });
    expect(
      prisma.accountReceivable.create.mock.calls[0][0].data.customerId
    ).toBe('new');
    expect(res.creditWarning).toBeNull();
  });

  it('libreta: agrupa por cliente, ordena por saldo y marca tope pasado', async () => {
    const day = (d: number) => new Date(2026, 10, d);
    prisma.accountReceivable.findMany.mockResolvedValue([
      {
        amount: D(10),
        paidAmount: D(4),
        amountUsd: D(10),
        createdAt: day(5),
        customer: { id: 'a', name: 'Ana', phone: null, creditLimitUsd: D(5) },
        payments: [{ createdAt: day(10) }],
      },
      {
        amount: D(4000),
        paidAmount: D(0),
        amountUsd: D(100),
        createdAt: day(2),
        customer: {
          id: 'b',
          name: 'Beto',
          phone: '0414',
          creditLimitUsd: null,
        },
        payments: [],
      },
      {
        amount: D(3),
        paidAmount: D(0),
        amountUsd: D(3),
        createdAt: day(1),
        customer: { id: 'a', name: 'Ana', phone: null, creditLimitUsd: D(5) },
        payments: [],
      },
    ]);
    const res = await service.ledgerByCustomer(commerceId);
    expect(res.totalUsd).toBe(109);
    expect(res.customers.map((c) => c.customer?.name)).toEqual(['Beto', 'Ana']);
    const ana = res.customers[1];
    expect(ana).toEqual(
      expect.objectContaining({
        openCount: 2,
        balanceUsd: 9,
        overLimit: true,
        oldestOpenAt: day(1),
        lastPaymentAt: day(10),
      })
    );
  });
});
