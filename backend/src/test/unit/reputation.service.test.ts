import { Test, TestingModule } from '@nestjs/testing';
import { ReputationService } from '../../domains/reputation/reputation.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ReputationService', () => {
  let service: ReputationService;

  const mockPrismaService: any = {
    reputationScore: { findUnique: jest.fn(), upsert: jest.fn() },
    commerce: { findUnique: jest.fn() },
    order: { count: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
    serviceRequest: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    delivery: { count: jest.fn() },
    report: { count: jest.fn() },
    review: { aggregate: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrismaService.commerce.findUnique.mockResolvedValue({
      userId: 'owner-1',
    });
    mockPrismaService.order.findMany.mockResolvedValue([]);
    mockPrismaService.serviceRequest.findMany.mockResolvedValue([]);
    mockPrismaService.report.count.mockResolvedValue(0);
    mockPrismaService.review.aggregate.mockResolvedValue({
      _avg: { rating: null },
    });
    mockPrismaService.order.groupBy.mockResolvedValue([]);
    mockPrismaService.serviceRequest.groupBy.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReputationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReputationService>(ReputationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getScore', () => {
    it('returns null when there is no score persisted yet', async () => {
      mockPrismaService.reputationScore.findUnique.mockResolvedValue(null);
      expect(await service.getScore('COMMERCE', 'c1')).toBeNull();
    });

    it('maps the persisted row to a ReputationScoreView', async () => {
      const calculatedAt = new Date();
      mockPrismaService.reputationScore.findUnique.mockResolvedValue({
        score: 82,
        sampleSize: 15,
        breakdown: { completionRate: 0.9 },
        calculatedAt,
      });
      const result = await service.getScore('COMMERCE', 'c1');
      expect(result).toEqual({
        score: 82,
        sampleSize: 15,
        breakdown: { completionRate: 0.9 },
        calculatedAt,
      });
    });
  });

  describe('recalculate — COMMERCE', () => {
    it('does nothing (no upsert) when there are no terminal orders yet', async () => {
      mockPrismaService.order.count.mockResolvedValue(0);
      await service.recalculate('COMMERCE', 'c1');
      expect(mockPrismaService.reputationScore.upsert).not.toHaveBeenCalled();
    });

    it('never throws even if a downstream query rejects (best-effort)', async () => {
      mockPrismaService.commerce.findUnique.mockRejectedValue(
        new Error('boom')
      );
      await expect(
        service.recalculate('COMMERCE', 'c1')
      ).resolves.toBeUndefined();
      expect(mockPrismaService.reputationScore.upsert).not.toHaveBeenCalled();
    });

    it('computes completion/cancellation/dispute from Order+Report when there is no review or repeat-customer data', async () => {
      mockPrismaService.order.count
        .mockResolvedValueOnce(8) // DELIVERED
        .mockResolvedValueOnce(2); // CANCELLED
      mockPrismaService.report.count.mockResolvedValue(1);
      // sin reviews, sin customers con órdenes -> satisfactionRate y repeatCustomerRate quedan null

      await service.recalculate('COMMERCE', 'c1');

      const [data] = mockPrismaService.reputationScore.upsert.mock.calls[0];
      expect(data.create.breakdown.completionRate).toBe(0.8);
      expect(data.create.breakdown.cancellationRate).toBe(0.2);
      expect(data.create.breakdown.disputeRate).toBe(0.1);
      expect(data.create.breakdown.satisfactionRate).toBeNull();
      expect(data.create.breakdown.repeatCustomerRate).toBeNull();
      expect(data.create.sampleSize).toBe(10);
    });

    it('includes satisfactionRate normalized 0-1 from Review.aggregate when reviews exist', async () => {
      mockPrismaService.order.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(0);
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: { rating: 5 },
      }); // 5/5 estrellas -> 1.0

      await service.recalculate('COMMERCE', 'c1');

      const [data] = mockPrismaService.reputationScore.upsert.mock.calls[0];
      expect(data.create.breakdown.satisfactionRate).toBe(1);
    });

    it('normalizes a 3-star average rating to 0.5 (midpoint of the 1-5 scale)', async () => {
      mockPrismaService.order.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(0);
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: { rating: 3 },
      });

      await service.recalculate('COMMERCE', 'c1');

      const [data] = mockPrismaService.reputationScore.upsert.mock.calls[0];
      expect(data.create.breakdown.satisfactionRate).toBe(0.5);
    });

    it('computes repeatCustomerRate as the fraction of customers with >= 2 orders', async () => {
      mockPrismaService.order.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(0);
      mockPrismaService.order.groupBy.mockResolvedValue([
        { customerId: 'cust-1', _count: { _all: 3 } }, // recurrente
        { customerId: 'cust-2', _count: { _all: 1 } }, // no recurrente
        { customerId: 'cust-3', _count: { _all: 2 } }, // recurrente (umbral exacto)
        { customerId: 'cust-4', _count: { _all: 1 } }, // no recurrente
      ]);

      await service.recalculate('COMMERCE', 'c1');

      const [data] = mockPrismaService.reputationScore.upsert.mock.calls[0];
      expect(data.create.breakdown.repeatCustomerRate).toBe(0.5); // 2 de 4
    });

    it('resolves satisfactionRate via the Commerce owner userId, not the commerceId', async () => {
      mockPrismaService.order.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(0);
      mockPrismaService.commerce.findUnique.mockResolvedValue({
        userId: 'owner-xyz',
      });

      await service.recalculate('COMMERCE', 'c1');

      expect(mockPrismaService.review.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ targetId: 'owner-xyz' }),
        })
      );
    });

    it('never lets a candidate with only one perfect signal outscore one with more real signals (confidence penalty)', async () => {
      // Escenario A: solo completion=100%, sin reviews ni recurrencia, pocas ordenes (sampleSize bajo)
      mockPrismaService.order.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(0);
      await service.recalculate('COMMERCE', 'low-confidence');
      const [lowConfidenceData] =
        mockPrismaService.reputationScore.upsert.mock.calls[0];

      jest.clearAllMocks();
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.report.count.mockResolvedValue(0);

      // Escenario B: mismo completion=100%, pero CON reviews perfectas y clientes recurrentes
      mockPrismaService.commerce.findUnique.mockResolvedValue({
        userId: 'owner-1',
      });
      mockPrismaService.order.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(0);
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: { rating: 5 },
      });
      mockPrismaService.order.groupBy.mockResolvedValue([
        { customerId: 'c1', _count: { _all: 2 } },
      ]);
      await service.recalculate('COMMERCE', 'high-confidence');
      const [highConfidenceData] =
        mockPrismaService.reputationScore.upsert.mock.calls[0];

      expect(highConfidenceData.create.score).toBeGreaterThan(
        lowConfidenceData.create.score
      );
    });
  });

  describe('recalculate — PROFESSIONAL', () => {
    it('treats REJECTED the same as CANCELLED', async () => {
      mockPrismaService.serviceRequest.count
        .mockResolvedValueOnce(6) // CLOSED
        .mockResolvedValueOnce(1) // CANCELLED
        .mockResolvedValueOnce(3); // REJECTED
      mockPrismaService.report.count.mockResolvedValue(0);

      await service.recalculate('PROFESSIONAL', 'user-1');

      const [data] = mockPrismaService.reputationScore.upsert.mock.calls[0];
      expect(data.create.sampleSize).toBe(10); // 6 completed + (1+3) cancelled
      expect(data.create.breakdown.cancellationRate).toBe(0.4);
    });

    it('resolves satisfactionRate directly from providerId (already a User.id, no Commerce lookup)', async () => {
      mockPrismaService.serviceRequest.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      await service.recalculate('PROFESSIONAL', 'provider-1');

      expect(mockPrismaService.commerce.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.review.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ targetId: 'provider-1' }),
        })
      );
    });

    it('excludes requests without requesterId from the repeat-customer calculation', async () => {
      mockPrismaService.serviceRequest.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrismaService.serviceRequest.groupBy.mockResolvedValue([
        { requesterId: 'u1', _count: { _all: 2 } },
      ]);

      await service.recalculate('PROFESSIONAL', 'provider-1');

      expect(mockPrismaService.serviceRequest.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ requesterId: { not: null } }),
        })
      );
      const [data] = mockPrismaService.reputationScore.upsert.mock.calls[0];
      expect(data.create.breakdown.repeatCustomerRate).toBe(1);
    });
  });

  describe('recalculate — DRIVER', () => {
    it('has no satisfaction or repeat-customer signal (both always null)', async () => {
      mockPrismaService.delivery = { count: jest.fn() };
      mockPrismaService.delivery.count
        .mockResolvedValueOnce(9) // DELIVERED
        .mockResolvedValueOnce(1) // CANCELLED
        .mockResolvedValueOnce(0); // FAILED

      await service.recalculate('DRIVER', 'driver-1');

      const [data] = mockPrismaService.reputationScore.upsert.mock.calls[0];
      expect(data.create.breakdown.satisfactionRate).toBeNull();
      expect(data.create.breakdown.repeatCustomerRate).toBeNull();
      expect(mockPrismaService.review.aggregate).not.toHaveBeenCalled();
    });

    it('treats FAILED the same as CANCELLED and never queries Report (no dispute signal for drivers)', async () => {
      mockPrismaService.delivery = { count: jest.fn() };
      mockPrismaService.delivery.count
        .mockResolvedValueOnce(7)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2);

      await service.recalculate('DRIVER', 'driver-1');

      const [data] = mockPrismaService.reputationScore.upsert.mock.calls[0];
      expect(data.create.breakdown.cancellationRate).toBe(0.3); // (1+2)/10
      expect(data.create.breakdown.disputeRate).toBe(0);
      expect(mockPrismaService.report.count).not.toHaveBeenCalled();
    });
  });

  describe('confidenceMultiplier', () => {
    it('is damped below CONFIDENCE_FLOOR (10) transactions', async () => {
      mockPrismaService.order.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(0); // sampleSize=3
      await service.recalculate('COMMERCE', 'c1');
      const [data] = mockPrismaService.reputationScore.upsert.mock.calls[0];
      // 3/10 de confianza por volumen * confianza de señales disponibles (4 de 6:
      // completion+non-cancellation+punctuality-proxy+non-dispute; satisfaction y
      // repeatCustomer siguen null sin reviews/customers) = 0.3 * (4/6) = 0.2
      expect(data.create.breakdown.confidenceMultiplier).toBeCloseTo(0.2);
    });

    it('reaches full volume confidence (1.0 factor) at or above CONFIDENCE_FLOOR transactions with all signals present', async () => {
      mockPrismaService.order.count
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(0);
      mockPrismaService.review.aggregate.mockResolvedValue({
        _avg: { rating: 4 },
      });
      mockPrismaService.order.groupBy.mockResolvedValue([
        { customerId: 'c1', _count: { _all: 2 } },
      ]);

      await service.recalculate('COMMERCE', 'c1');

      const [data] = mockPrismaService.reputationScore.upsert.mock.calls[0];
      // completion, non-cancellation, punctuality(proxy), non-dispute, satisfaction, repeatCustomer -> 6/6
      expect(data.create.breakdown.confidenceMultiplier).toBe(1);
    });
  });
});
