import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PurchasesService } from '../../domains/operations/purchases/purchases.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ExchangeRatesService } from '../../domains/money/exchange-rates/exchange-rates.service';
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service';
import { AlertEngineService } from '../../domains/operations/alert-engine/alert-engine.service';

describe('PurchasesService', () => {
  let service: PurchasesService;

  const mockPrismaService: any = {
    product: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    supplier: {
      findFirst: jest.fn(),
    },
    purchase: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((callback: (tx: any) => unknown) =>
      callback(mockPrismaService)
    ),
  };

  const mockExchangeRatesService = {
    findByCode: jest.fn(),
  };

  const mockNotificationsService = {
    notifyMarginDrop: jest.fn(),
  };

  const mockAlertEngineService = {
    shouldFire: jest.fn(),
  };

  const mockI18nService = {
    t: jest.fn((key: string) => key),
  };

  const commerceId = 'commerce-1';
  const userId = 'user-1';

  beforeEach(async () => {
    jest.clearAllMocks();
    mockNotificationsService.notifyMarginDrop.mockResolvedValue(undefined);
    mockAlertEngineService.shouldFire.mockResolvedValue(false);
    // checkMarginDrop() vuelve a consultar compras recientes tras crear una
    // — default a "sin historial" salvo que un test lo sobreescriba.
    mockPrismaService.purchase.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ExchangeRatesService, useValue: mockExchangeRatesService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: AlertEngineService, useValue: mockAlertEngineService },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile();

    service = module.get<PurchasesService>(PurchasesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      productId: 'prod-1',
      quantity: 10,
      unitCost: 5,
      currencyCode: 'usd',
    };

    it('throws NotFoundException when product does not belong to commerce', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(
        service.create(commerceId, userId, dto as any)
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.purchase.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when supplier does not belong to commerce', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        commerceId,
      });
      mockPrismaService.supplier.findFirst.mockResolvedValue(null);

      await expect(
        service.create(commerceId, userId, {
          ...dto,
          supplierId: 'sup-1',
        } as any)
      ).rejects.toThrow(NotFoundException);
    });

    it('uses rate 1 and skips exchange-rate lookup for USD purchases', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        commerceId,
        stock: 20,
        minStock: 5,
      });
      mockPrismaService.purchase.create.mockResolvedValue({ id: 'purchase-1' });

      await service.create(commerceId, userId, dto as any);

      expect(mockExchangeRatesService.findByCode).not.toHaveBeenCalled();
      expect(mockPrismaService.purchase.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currencyCode: 'USD',
            exchangeRateValue: 1,
            unitCostUsd: 5,
            exchangeRateSource: null,
            createdBy: userId,
          }),
        })
      );
    });

    it('converts unitCost to USD using the resolved exchange rate for non-USD currencies', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        commerceId,
        stock: 20,
        minStock: 5,
      });
      mockExchangeRatesService.findByCode.mockResolvedValue({
        rateToUsd: 40,
        source: 'BCV',
        syncSource: 'BCV_SCRAPING',
      });
      mockPrismaService.purchase.create.mockResolvedValue({ id: 'purchase-1' });

      await service.create(commerceId, userId, {
        ...dto,
        currencyCode: 'ves',
        unitCost: 400,
      } as any);

      expect(mockExchangeRatesService.findByCode).toHaveBeenCalledWith('VES');
      expect(mockPrismaService.purchase.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currencyCode: 'VES',
            exchangeRateValue: 40,
            unitCostUsd: 10,
            exchangeRateSource: 'BCV_SCRAPING',
          }),
        })
      );
    });

    it('repone stock del producto y recalcula status tras registrar la compra', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        commerceId,
        stock: 2,
        minStock: 5,
      });
      mockPrismaService.purchase.create.mockResolvedValue({ id: 'purchase-1' });

      await service.create(commerceId, userId, { ...dto, quantity: 10 } as any);

      // stock 2 + 10 comprados = 12, por encima de minStock=5 -> AVAILABLE
      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: 12, status: 'AVAILABLE' },
      });
    });

    it('deja el producto en LOW_STOCK si la reposición no alcanza el mínimo', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        commerceId,
        stock: 0,
        minStock: 10,
      });
      mockPrismaService.purchase.create.mockResolvedValue({ id: 'purchase-1' });

      await service.create(commerceId, userId, { ...dto, quantity: 3 } as any);

      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: 3, status: 'LOW_STOCK' },
      });
    });

    it('throws BadRequestException when the resolved exchange rate is invalid', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        commerceId,
      });
      mockExchangeRatesService.findByCode.mockResolvedValue({ rateToUsd: 0 });

      await expect(
        service.create(commerceId, userId, {
          ...dto,
          currencyCode: 'ves',
        } as any)
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.purchase.create).not.toHaveBeenCalled();
    });

    it('fires the MARGIN_DROP notification when the Alert Engine says the threshold was crossed', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        commerceId,
        name: 'Aceite 1L',
        cost: 10,
        price: 15,
        stock: 20,
        minStock: 5,
      });
      mockPrismaService.purchase.create.mockResolvedValue({ id: 'purchase-1' });
      // Post-create recompute: compra reciente a $13 -> margen reposición 13.3%,
      // muy por debajo del histórico 33.3% (caída de 20pp).
      mockPrismaService.purchase.findMany.mockResolvedValue([
        { unitCostUsd: 13 },
      ]);
      mockAlertEngineService.shouldFire.mockResolvedValue(true);

      await service.create(commerceId, userId, dto as any);
      await new Promise(process.nextTick); // deja correr el .catch(() => {}) fire-and-forget

      expect(mockAlertEngineService.shouldFire).toHaveBeenCalledWith(
        commerceId,
        'MARGIN_DROP',
        expect.closeTo(20, 1) // caída de margen: 33.3% - 13.3%
      );
      expect(mockNotificationsService.notifyMarginDrop).toHaveBeenCalledWith(
        commerceId,
        'Aceite 1L',
        expect.closeTo(33.3, 1),
        expect.closeTo(13.3, 1)
      );
    });

    it('does not fire the notification when the Alert Engine says the drop does not cross the threshold', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        commerceId,
        name: 'Aceite 1L',
        cost: 10,
        price: 15,
        stock: 20,
        minStock: 5,
      });
      mockPrismaService.purchase.create.mockResolvedValue({ id: 'purchase-1' });
      mockPrismaService.purchase.findMany.mockResolvedValue([
        { unitCostUsd: 10.2 },
      ]);
      mockAlertEngineService.shouldFire.mockResolvedValue(false);

      await service.create(commerceId, userId, dto as any);
      await new Promise(process.nextTick);

      expect(mockNotificationsService.notifyMarginDrop).not.toHaveBeenCalled();
    });

    it('does not let a notification failure break purchase creation', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        commerceId,
        name: 'Aceite 1L',
        cost: 10,
        price: 15,
        stock: 20,
        minStock: 5,
      });
      mockPrismaService.purchase.create.mockResolvedValue({ id: 'purchase-1' });
      mockPrismaService.purchase.findMany.mockResolvedValue([
        { unitCostUsd: 13 },
      ]);
      mockAlertEngineService.shouldFire.mockResolvedValue(true);
      mockNotificationsService.notifyMarginDrop.mockRejectedValue(
        new Error('gateway down')
      );

      const result = await service.create(commerceId, userId, dto as any);
      await new Promise(process.nextTick);

      expect(result).toEqual({ id: 'purchase-1' });
    });
  });

  describe('getReplacementCost', () => {
    it('throws NotFoundException when product does not exist for commerce', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(
        service.getReplacementCost('prod-1', commerceId)
      ).rejects.toThrow(NotFoundException);
    });

    it('returns historical margin only when there is no purchase history', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        cost: 10,
        price: 15,
      });
      mockPrismaService.purchase.findMany.mockResolvedValue([]);

      const result = await service.getReplacementCost('prod-1', commerceId);

      expect(result.hasPurchaseData).toBe(false);
      expect(result.marginHistoricalPct).toBeCloseTo(33.3, 1);
      expect(result.marginReplacementPct).toBeNull();
      expect(result.averageReplacementCostUsd).toBeNull();
    });

    it('computes replacement margin from recent purchases and flags margin erosion', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        cost: 10, // costo histórico: margen 33.3%
        price: 15,
      });
      mockPrismaService.purchase.findMany.mockResolvedValue([
        { unitCostUsd: 13 },
        { unitCostUsd: 13 },
      ]);

      const result = await service.getReplacementCost('prod-1', commerceId);

      expect(result.hasPurchaseData).toBe(true);
      expect(result.lastPurchaseCostUsd).toBe(13);
      expect(result.averageReplacementCostUsd).toBe(13);
      expect(result.marginHistoricalPct).toBeCloseTo(33.3, 1);
      // margen sobre reposición: (15-13)/15 = 13.3% — bien por debajo del histórico
      expect(result.marginReplacementPct).toBeCloseTo(13.3, 1);
      expect(result.marginReplacementPct!).toBeLessThan(
        result.marginHistoricalPct!
      );
    });
  });

  describe('getMarginReport', () => {
    it('sorts products by largest margin drop first', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Producto A',
          price: 100,
          cost: 50, // margen histórico 50%
          purchases: [{ unitCostUsd: 90 }], // margen reposición 10% -> caída de 40pp
        },
        {
          id: 'prod-2',
          name: 'Producto B',
          price: 100,
          cost: 50, // margen histórico 50%
          purchases: [{ unitCostUsd: 55 }], // margen reposición 45% -> caída de 5pp
        },
      ]);

      const result = await service.getMarginReport(commerceId);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].productId).toBe('prod-1');
      expect(result.data[0].marginDropPct).toBeCloseTo(40, 0);
      expect(result.data[1].productId).toBe('prod-2');
      expect(result.data[1].marginDropPct).toBeCloseTo(5, 0);
    });

    it('paginates the sorted result', async () => {
      mockPrismaService.product.findMany.mockResolvedValue(
        Array.from({ length: 25 }, (_, i) => ({
          id: `prod-${i}`,
          name: `Producto ${i}`,
          price: 100,
          cost: 50,
          purchases: [{ unitCostUsd: 60 + i }],
        }))
      );

      const result = await service.getMarginReport(commerceId, 2, 10);

      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(3);
      expect(result.data).toHaveLength(10);
    });

    it('only queries products that have at least one purchase', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.getMarginReport(commerceId);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { commerceId, purchases: { some: {} } },
        })
      );
    });
  });
});
