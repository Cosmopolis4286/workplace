import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { AccountReceivablesService } from '../../domains/money/accounts/account-receivables.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ExchangeRatesService } from '../../domains/money/exchange-rates/exchange-rates.service';
import { AccountStatus } from '@prisma/client';
import { money } from '../money-matcher';

describe('AccountReceivablesService', () => {
  let service: AccountReceivablesService;

  const mockPrismaService = {
    customer: { findFirst: jest.fn() },
    order: { findFirst: jest.fn() },
    accountReceivable: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockExchangeRatesService = {
    resolveRateToUsd: jest.fn(),
  };

  const mockI18nService = {
    t: jest.fn((key: string) => key),
  };

  const commerceId = 'commerce-1';
  const userId = 'user-1';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountReceivablesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ExchangeRatesService, useValue: mockExchangeRatesService },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile();

    service = module.get<AccountReceivablesService>(AccountReceivablesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      description: 'Fiado a Juan',
      amount: 100,
      currencyCode: 'usd',
    };

    it('throws NotFoundException when customer does not belong to commerce', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.create(commerceId, userId, {
          ...dto,
          customerId: 'cust-1',
        } as any)
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when order does not belong to commerce', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(null);

      await expect(
        service.create(commerceId, userId, {
          ...dto,
          orderId: 'order-1',
        } as any)
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the exchange rate is invalid', async () => {
      mockExchangeRatesService.resolveRateToUsd.mockResolvedValue(null);

      await expect(
        service.create(commerceId, userId, {
          ...dto,
          currencyCode: 'ves',
        } as any)
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.accountReceivable.create).not.toHaveBeenCalled();
    });

    it('stores an immutable exchange rate snapshot converted to USD', async () => {
      mockExchangeRatesService.resolveRateToUsd.mockResolvedValue({
        rateToUsd: 40,
      });
      mockPrismaService.accountReceivable.create.mockResolvedValue({
        id: 'rec-1',
      });

      await service.create(commerceId, userId, {
        ...dto,
        currencyCode: 'ves',
        amount: 4000,
      } as any);

      expect(mockPrismaService.accountReceivable.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currencyCode: 'VES',
            exchangeRateValue: 40,
            amountUsd: money(100),
            createdBy: userId,
          }),
        })
      );
    });
  });

  describe('markAsPaid', () => {
    it('throws NotFoundException when the receivable does not belong to the commerce', async () => {
      mockPrismaService.accountReceivable.findFirst.mockResolvedValue(null);

      await expect(service.markAsPaid('rec-1', commerceId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('marks it as PAID with a paidAt timestamp', async () => {
      mockPrismaService.accountReceivable.findFirst.mockResolvedValue({
        id: 'rec-1',
        commerceId,
      });

      await service.markAsPaid('rec-1', commerceId);

      expect(mockPrismaService.accountReceivable.update).toHaveBeenCalledWith({
        where: { id: 'rec-1' },
        data: { status: AccountStatus.PAID, paidAt: expect.any(Date) },
      });
    });
  });

  describe('getReplacementRisk', () => {
    it('reports no exposure for USD receivables', async () => {
      mockPrismaService.accountReceivable.findFirst.mockResolvedValue({
        id: 'rec-1',
        commerceId,
        currencyCode: 'USD',
        amount: 100,
        amountUsd: 100,
        exchangeRateValue: 1,
      });

      const result = await service.getReplacementRisk('rec-1', commerceId);

      expect(result.hasExposure).toBe(false);
      expect(mockExchangeRatesService.resolveRateToUsd).not.toHaveBeenCalled();
    });

    it('reports no exposure when the current rate cannot be resolved', async () => {
      mockPrismaService.accountReceivable.findFirst.mockResolvedValue({
        id: 'rec-1',
        commerceId,
        currencyCode: 'VES',
        amount: 4000,
        amountUsd: 100,
        exchangeRateValue: 40,
      });
      mockExchangeRatesService.resolveRateToUsd.mockResolvedValue(null);

      const result = await service.getReplacementRisk('rec-1', commerceId);

      expect(result.hasExposure).toBe(false);
    });

    it('matches the audit example: currency devalued since the sale reduces the USD value collected', async () => {
      // Vendió 4000 VES a tasa 40 (=$100 USD en ese momento). 30 días después
      // la tasa subió a 50 (VES se devaluó frente al USD) -> cobrar los
      // mismos 4000 VES hoy equivale a solo $80 USD: perdió $20 de poder de
      // reposición por haber esperado a cobrar (WORKPLACE_VISION.md sección 11).
      mockPrismaService.accountReceivable.findFirst.mockResolvedValue({
        id: 'rec-1',
        commerceId,
        currencyCode: 'VES',
        amount: 4000,
        amountUsd: 100,
        exchangeRateValue: 40,
      });
      mockExchangeRatesService.resolveRateToUsd.mockResolvedValue({
        rateToUsd: 50,
      });

      const result = await service.getReplacementRisk('rec-1', commerceId);

      expect(result.hasExposure).toBe(true);
      expect(result.currentAmountUsd).toBe(80);
      expect(result.valueLossUsd).toBe(20);
      expect(result.rateChangePct).toBeCloseTo(25, 1);
    });

    it('reports a gain (negative loss) when the currency appreciated since the sale', async () => {
      mockPrismaService.accountReceivable.findFirst.mockResolvedValue({
        id: 'rec-1',
        commerceId,
        currencyCode: 'VES',
        amount: 4000,
        amountUsd: 100,
        exchangeRateValue: 40,
      });
      mockExchangeRatesService.resolveRateToUsd.mockResolvedValue({
        rateToUsd: 40,
      });

      const result = await service.getReplacementRisk('rec-1', commerceId);

      expect(result.valueLossUsd).toBe(0);
      expect(result.rateChangePct).toBe(0);
    });
  });
});
