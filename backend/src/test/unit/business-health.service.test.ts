import { Test, TestingModule } from '@nestjs/testing';
import { BusinessHealthService } from '../../domains/money/business-health/business-health.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('BusinessHealthService', () => {
  let service: BusinessHealthService;

  const mockPrismaService = {
    product: { findMany: jest.fn() },
    purchase: { findMany: jest.fn() },
    commerceSettings: { findUnique: jest.fn() },
    accountReceivable: { findMany: jest.fn() },
    accountPayable: { findMany: jest.fn() },
    commerce: { findMany: jest.fn() },
  };

  const commerceId = 'commerce-1';

  beforeEach(async () => {
    jest.clearAllMocks();
    // Defaults: nada de qué calcular, cada test sobreescribe lo que necesita.
    mockPrismaService.product.findMany.mockResolvedValue([]);
    mockPrismaService.purchase.findMany.mockResolvedValue([]);
    mockPrismaService.commerceSettings.findUnique.mockResolvedValue(null);
    mockPrismaService.accountReceivable.findMany.mockResolvedValue([]);
    mockPrismaService.accountPayable.findMany.mockResolvedValue([]);
    mockPrismaService.commerce.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessHealthService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BusinessHealthService>(BusinessHealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getScore — sin datos en absoluto', () => {
    it('returns score=null, confidence=0 and rating=SIN_DATOS when nothing has ever been recorded', async () => {
      const result = await service.getScore(commerceId);

      expect(result.score).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.rating).toBe('SIN_DATOS');
      expect(result.components).toHaveLength(4);
      expect(result.components.every((c) => c.score === null)).toBe(true);
    });
  });

  describe('getScore — solo margen de reposición con datos', () => {
    it('computes the overall score from a single component and reports partial confidence', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([
        { id: 'prod-1', price: 15, minMarginPct: null },
      ]);
      mockPrismaService.purchase.findMany.mockResolvedValue([
        { unitCostUsd: 10 },
      ]);
      // El componente Price Guard también consulta purchase.findMany con el
      // mismo producto — usamos el mismo mock, así que también tendrá datos.
      // Para aislar el caso "solo 1 de 4", forzamos accountReceivable/Payable
      // ya en null por default y dejamos product sin compras para ese cálculo
      // sería contradictorio; en su lugar validamos el caso "2 de 4" abajo.

      const result = await service.getScore(commerceId);

      // margen: (15-10)/15 = 33.3% -> score = round(33.3/40*100) = 83
      // price guard: sin CommerceSettings -> default 15% margin -> minPrice = 10/0.85 = 11.76 <= 15 -> compliant
      expect(result.confidence).toBe(50); // 2 de 4 componentes con datos (margen + price guard)
      expect(result.score).not.toBeNull();
      expect(result.rating).not.toBe('SIN_DATOS');
    });
  });

  describe('getScore — todos los componentes con datos', () => {
    it('averages all 4 components with equal weight and reaches full confidence', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([
        { id: 'prod-1', price: 20, minMarginPct: null },
      ]);
      mockPrismaService.purchase.findMany.mockResolvedValue([
        { unitCostUsd: 10 },
      ]);
      mockPrismaService.commerceSettings.findUnique.mockResolvedValue({
        minMarginPct: 15,
      });
      mockPrismaService.accountReceivable.findMany.mockResolvedValue([
        { dueDate: new Date(Date.now() + 86_400_000) }, // no vencida
      ]);
      mockPrismaService.accountPayable.findMany.mockResolvedValue([
        { dueDate: new Date(Date.now() - 86_400_000) }, // vencida
      ]);

      const result = await service.getScore(commerceId);

      expect(result.confidence).toBe(100);
      expect(result.score).not.toBeNull();
      // margen: (20-10)/20 = 50% -> score = min(100, round(50/40*100)) = 100
      // price guard: minPrice = 10/0.85 = 11.76 <= 20 -> compliant -> 100
      // receivables: 1/1 no vencida -> 100
      // payables: 0/1 no vencida -> 0
      // promedio = (100+100+100+0)/4 = 75
      expect(result.score).toBe(75);
      expect(result.rating).toBe('ACEPTABLE');
    });
  });

  describe('componentes individuales vía getScore', () => {
    it('flags overdue receivables by lowering the receivables_health score', async () => {
      mockPrismaService.accountReceivable.findMany.mockResolvedValue([
        { dueDate: new Date(Date.now() - 86_400_000) }, // vencida
        { dueDate: new Date(Date.now() + 86_400_000) }, // no vencida
      ]);

      const result = await service.getScore(commerceId);
      const receivables = result.components.find(
        (c) => c.key === 'receivables_health'
      )!;

      expect(receivables.score).toBe(50);
      expect(receivables.detail).toMatchObject({
        pendingCount: 2,
        overdueCount: 1,
      });
    });

    it('reports null for price_guard_compliance when there is no purchase history for any product', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([
        { id: 'prod-1', price: 20, minMarginPct: null },
      ]);
      mockPrismaService.purchase.findMany.mockResolvedValue([]);

      const result = await service.getScore(commerceId);
      const priceGuard = result.components.find(
        (c) => c.key === 'price_guard_compliance'
      )!;

      expect(priceGuard.score).toBeNull();
    });

    it('caps the replacement_margin score at 100 for very high margins', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([
        { id: 'prod-1', price: 100, minMarginPct: null },
      ]);
      mockPrismaService.purchase.findMany.mockResolvedValue([
        { unitCostUsd: 5 },
      ]);

      const result = await service.getScore(commerceId);
      const margin = result.components.find(
        (c) => c.key === 'replacement_margin'
      )!;

      // (100-5)/100 = 95% margen, muy por encima del techo de 40% -> cap a 100
      expect(margin.score).toBe(100);
    });

    it('floors the replacement_margin score at 0 when selling at a loss on replacement cost', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([
        { id: 'prod-1', price: 10, minMarginPct: null },
      ]);
      mockPrismaService.purchase.findMany.mockResolvedValue([
        { unitCostUsd: 15 },
      ]);

      const result = await service.getScore(commerceId);
      const margin = result.components.find(
        (c) => c.key === 'replacement_margin'
      )!;

      expect(margin.score).toBe(0);
    });
  });

  describe('ratingFor thresholds (vía getScore con distintos escenarios)', () => {
    it('rates SALUDABLE at 80+, ACEPTABLE at 60-79, EN_RIESGO at 40-59, CRITICO below 40', async () => {
      // Simplificamos usando solo accountReceivable (1 componente activo) para
      // controlar el score exacto vía overdueCount/pendingCount.
      const scenarios: Array<[number, number, string]> = [
        [0, 10, 'SALUDABLE'], // 0 vencidas de 10 -> 100
        [3, 10, 'ACEPTABLE'], // 7/10 -> 70
        [6, 10, 'EN_RIESGO'], // 4/10 -> 40... ajustar a EN_RIESGO real
        [9, 10, 'CRITICO'], // 1/10 -> 10
      ];

      for (const [overdue, total, expectedRating] of scenarios) {
        jest.clearAllMocks();
        mockPrismaService.product.findMany.mockResolvedValue([]);
        mockPrismaService.purchase.findMany.mockResolvedValue([]);
        mockPrismaService.commerceSettings.findUnique.mockResolvedValue(null);
        mockPrismaService.accountPayable.findMany.mockResolvedValue([]);

        const pending = Array.from({ length: total }, (_, i) => ({
          dueDate:
            i < overdue
              ? new Date(Date.now() - 86_400_000)
              : new Date(Date.now() + 86_400_000),
        }));
        mockPrismaService.accountReceivable.findMany.mockResolvedValue(pending);

        const result = await service.getScore(commerceId);
        expect(result.rating).toBe(expectedRating);
      }
    });
  });

  describe('getPlatformSummary (SUPERADMIN/ADMIN)', () => {
    it('returns SIN_DATOS counts with zero commerces registered', async () => {
      mockPrismaService.commerce.findMany.mockResolvedValue([]);

      const result = await service.getPlatformSummary();

      expect(result.totalCommerces).toBe(0);
      expect(result.counts).toEqual({
        SALUDABLE: 0,
        ACEPTABLE: 0,
        EN_RIESGO: 0,
        CRITICO: 0,
        SIN_DATOS: 0,
      });
      expect(result.atRiskCommerces).toEqual([]);
      expect(result.truncated).toBe(false);
    });

    it('counts every commerce as SIN_DATOS when none has any recorded activity', async () => {
      mockPrismaService.commerce.findMany.mockResolvedValue([
        { id: 'c1', name: 'Comercio 1' },
        { id: 'c2', name: 'Comercio 2' },
      ]);
      // Sin compras/cuentas para ninguno -> getScore() por comercio da SIN_DATOS.
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.accountReceivable.findMany.mockResolvedValue([]);
      mockPrismaService.accountPayable.findMany.mockResolvedValue([]);

      const result = await service.getPlatformSummary();

      expect(result.totalCommerces).toBe(2);
      expect(result.counts.SIN_DATOS).toBe(2);
      expect(result.atRiskCommerces).toEqual([]);
    });

    it('flags commerces with overdue payables as at-risk, sorted worst-first', async () => {
      mockPrismaService.commerce.findMany.mockResolvedValue([
        { id: 'c1', name: 'Comercio Sano' },
        { id: 'c2', name: 'Comercio Crítico' },
      ]);
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.accountReceivable.findMany.mockResolvedValue([]);
      // Mismo mock aplica a ambos comercios (no diferencia por commerceId) —
      // representa el caso "ambos con cuentas por pagar 100% vencidas".
      mockPrismaService.accountPayable.findMany.mockResolvedValue([
        { dueDate: new Date(Date.now() - 86_400_000) },
      ]);

      const result = await service.getPlatformSummary();

      expect(result.totalCommerces).toBe(2);
      expect(result.counts.CRITICO).toBe(2);
      expect(result.atRiskCommerces).toHaveLength(2);
      expect(result.atRiskCommerces.every((c) => c.rating === 'CRITICO')).toBe(
        true
      );
    });

    it('marks the result as truncated when hitting the commerce limit', async () => {
      const many = Array.from({ length: 200 }, (_, i) => ({
        id: `c${i}`,
        name: `Comercio ${i}`,
      }));
      mockPrismaService.commerce.findMany.mockResolvedValue(many);

      const result = await service.getPlatformSummary();

      expect(result.truncated).toBe(true);
      expect(result.totalCommerces).toBe(200);
    });
  });
});
