import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { PriceGuardService } from '../../domains/operations/pricing/price-guard.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PurchasesService } from '../../domains/operations/purchases/purchases.service';

describe('PriceGuardService', () => {
  let service: PriceGuardService;

  const mockPrismaService = {
    product: {
      findFirst: jest.fn(),
    },
    commerceSettings: {
      findUnique: jest.fn(),
    },
  };

  const mockPurchasesService = {
    getReplacementCost: jest.fn(),
  };

  const mockI18nService = {
    t: jest.fn((key: string) => key),
  };

  const commerceId = 'commerce-1';
  const productId = 'prod-1';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceGuardService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PurchasesService, useValue: mockPurchasesService },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile();

    service = module.get<PriceGuardService>(PriceGuardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMinPrice', () => {
    it('matches the audit example: cost $13, min margin 20% -> min price $16.25', async () => {
      mockPurchasesService.getReplacementCost.mockResolvedValue({
        price: 14,
        historicalCost: 10,
        hasPurchaseData: true,
        averageReplacementCostUsd: 13,
      });
      mockPrismaService.product.findFirst.mockResolvedValue({
        minMarginPct: 20,
      });

      const result = await service.getMinPrice(productId, commerceId);

      expect(result.replacementCostUsd).toBe(13);
      expect(result.minPrice).toBeCloseTo(16.25, 2);
      expect(result.belowMinPrice).toBe(true); // precio actual $14 < mínimo $16.25
    });

    it('falls back to the commerce default margin when the product has no override', async () => {
      mockPurchasesService.getReplacementCost.mockResolvedValue({
        price: 20,
        historicalCost: 10,
        hasPurchaseData: false,
        averageReplacementCostUsd: null,
      });
      mockPrismaService.product.findFirst.mockResolvedValue({
        minMarginPct: null,
      });
      mockPrismaService.commerceSettings.findUnique.mockResolvedValue({
        minMarginPct: 15,
      });

      const result = await service.getMinPrice(productId, commerceId);

      // Sin compras registradas todavía: usa el costo histórico (10) como
      // mejor estimación disponible, con el margen default del comercio (15%).
      expect(result.usingReplacementCost).toBe(false);
      expect(result.replacementCostUsd).toBe(10);
      expect(result.minMarginPct).toBe(15);
      expect(result.minPrice).toBeCloseTo(11.76, 2);
      expect(result.belowMinPrice).toBe(false); // precio actual $20 > mínimo
    });

    it('defaults to 15% margin when the commerce has no settings row at all', async () => {
      mockPurchasesService.getReplacementCost.mockResolvedValue({
        price: 10,
        historicalCost: 10,
        hasPurchaseData: false,
        averageReplacementCostUsd: null,
      });
      mockPrismaService.product.findFirst.mockResolvedValue({
        minMarginPct: null,
      });
      mockPrismaService.commerceSettings.findUnique.mockResolvedValue(null);

      const result = await service.getMinPrice(productId, commerceId);

      expect(result.minMarginPct).toBe(15);
    });
  });

  describe('simulatePriceChange', () => {
    it('projects a 10% cost increase and flags when the current price would fall below the new minimum', async () => {
      mockPurchasesService.getReplacementCost.mockResolvedValue({
        price: 14,
        historicalCost: 10,
        hasPurchaseData: true,
        averageReplacementCostUsd: 13,
      });
      mockPrismaService.product.findFirst.mockResolvedValue({
        minMarginPct: 20,
      });

      const result = await service.simulatePriceChange(
        productId,
        commerceId,
        10
      );

      expect(result.currentCostUsd).toBe(13);
      expect(result.simulatedCostUsd).toBeCloseTo(14.3, 2);
      expect(result.simulatedMinPrice).toBeCloseTo(17.88, 2);
      expect(result.belowSimulatedMinPrice).toBe(true);
    });

    it('computes the resulting margin against the current price, not the simulated min price', async () => {
      mockPurchasesService.getReplacementCost.mockResolvedValue({
        price: 20,
        historicalCost: 10,
        hasPurchaseData: true,
        averageReplacementCostUsd: 10,
      });
      mockPrismaService.product.findFirst.mockResolvedValue({
        minMarginPct: 15,
      });

      const result = await service.simulatePriceChange(
        productId,
        commerceId,
        0
      );

      // Sin incremento (0%): margen resultante debe ser el margen actual real (50%)
      expect(result.simulatedMarginPct).toBeCloseTo(50, 1);
      expect(result.belowSimulatedMinPrice).toBe(false);
    });
  });
});
