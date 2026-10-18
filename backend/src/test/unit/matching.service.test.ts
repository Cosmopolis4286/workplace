import { Test, TestingModule } from '@nestjs/testing';
import { MatchingService } from '../../domains/commerce-core/matching/matching.service';
import { PrismaService } from '../../prisma/prisma.service';
import { REPUTATION_FACADE } from '../../domains/reputation/reputation.facade';
import { MatchCandidateInput } from '../../domains/commerce-core/matching/matching.facade';

describe('MatchingService', () => {
  let service: MatchingService;

  const mockPrismaService: any = {
    commerce: { findMany: jest.fn() },
    freelancerSettings: { findMany: jest.fn() },
  };

  const mockReputationFacade = {
    getScore: jest.fn(),
    recalculate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrismaService.commerce.findMany.mockResolvedValue([]);
    mockPrismaService.freelancerSettings.findMany.mockResolvedValue([]);
    mockReputationFacade.getScore.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: REPUTATION_FACADE, useValue: mockReputationFacade },
      ],
    }).compile();

    service = module.get<MatchingService>(MatchingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns an empty array when there are no candidates', async () => {
    expect(await service.rankCandidates([])).toEqual([]);
  });

  it('counts only availability as a present signal when there is no price, location or reputation', async () => {
    const candidates: MatchCandidateInput[] = [
      {
        entityType: 'COMMERCE',
        entityId: 'c1',
        userId: 'u1',
        isAvailable: false,
      },
    ];

    const [result] = await service.rankCandidates(candidates);

    // availabilityScore siempre se puede calcular (no depende de datos externos);
    // priceScore/distanceScore/reputationScore quedan null por falta de datos.
    expect(result.breakdown.confidence).toBeCloseTo(0.25);
    expect(result.score).toBe(0); // único signal presente (availability) vale 0 al no estar disponible
  });

  it('scores the cheapest candidate at 100 on priceScore and a candidate at double price at 0', async () => {
    const candidates: MatchCandidateInput[] = [
      {
        entityType: 'COMMERCE',
        entityId: 'cheap',
        userId: 'u1',
        price: 10,
        isAvailable: true,
      },
      {
        entityType: 'COMMERCE',
        entityId: 'expensive',
        userId: 'u2',
        price: 20,
        isAvailable: true,
      },
    ];

    const results = await service.rankCandidates(candidates);
    const cheap = results.find((r) => r.entityId === 'cheap')!;
    const expensive = results.find((r) => r.entityId === 'expensive')!;

    expect(cheap.breakdown.priceScore).toBe(100);
    expect(expensive.breakdown.priceScore).toBe(0);
  });

  it('ranks the cheaper candidate first when reputation and distance are equal (both absent)', async () => {
    const candidates: MatchCandidateInput[] = [
      {
        entityType: 'COMMERCE',
        entityId: 'expensive',
        userId: 'u1',
        price: 20,
        isAvailable: true,
      },
      {
        entityType: 'COMMERCE',
        entityId: 'cheap',
        userId: 'u2',
        price: 10,
        isAvailable: true,
      },
    ];

    const results = await service.rankCandidates(candidates);

    expect(results[0].entityId).toBe('cheap');
    expect(results[1].entityId).toBe('expensive');
  });

  it('computes distanceScore 100 at the same point and decays with distance, saturating at 0 beyond 30km', async () => {
    mockPrismaService.commerce.findMany.mockResolvedValue([
      { userId: 'u1', latitude: 10.5, longitude: -66.9 }, // mismo punto que origin
      { userId: 'u2', latitude: 10.6, longitude: -66.9 }, // ~11km más al norte
      { userId: 'u3', latitude: 20.0, longitude: -66.9 }, // muy lejos (>30km)
    ]);

    const candidates: MatchCandidateInput[] = [
      {
        entityType: 'COMMERCE',
        entityId: 'same-point',
        userId: 'u1',
        isAvailable: true,
      },
      {
        entityType: 'COMMERCE',
        entityId: 'near',
        userId: 'u2',
        isAvailable: true,
      },
      {
        entityType: 'COMMERCE',
        entityId: 'far',
        userId: 'u3',
        isAvailable: true,
      },
    ];

    const results = await service.rankCandidates(candidates, {
      origin: { lat: 10.5, lng: -66.9 },
    });
    const samePoint = results.find((r) => r.entityId === 'same-point')!;
    const near = results.find((r) => r.entityId === 'near')!;
    const far = results.find((r) => r.entityId === 'far')!;

    expect(samePoint.distanceMeters).toBe(0);
    expect(samePoint.breakdown.distanceScore).toBe(100);
    expect(near.breakdown.distanceScore).toBeGreaterThan(0);
    expect(near.breakdown.distanceScore).toBeLessThan(100);
    expect(far.breakdown.distanceScore).toBe(0);
  });

  it('returns distanceScore null when there is no origin, even if the candidate has a location', async () => {
    mockPrismaService.commerce.findMany.mockResolvedValue([
      { userId: 'u1', latitude: 10.5, longitude: -66.9 },
    ]);
    const candidates: MatchCandidateInput[] = [
      {
        entityType: 'COMMERCE',
        entityId: 'c1',
        userId: 'u1',
        isAvailable: true,
      },
    ];

    const [result] = await service.rankCandidates(candidates);

    expect(result.distanceMeters).toBeNull();
    expect(result.breakdown.distanceScore).toBeNull();
  });

  it('resolves location from FreelancerSettings for PROFESSIONAL candidates', async () => {
    mockPrismaService.freelancerSettings.findMany.mockResolvedValue([
      { userId: 'u1', latitude: 10.5, longitude: -66.9 },
    ]);
    const candidates: MatchCandidateInput[] = [
      {
        entityType: 'PROFESSIONAL',
        entityId: 'p1',
        userId: 'u1',
        isAvailable: true,
      },
    ];

    const [result] = await service.rankCandidates(candidates, {
      origin: { lat: 10.5, lng: -66.9 },
    });

    expect(result.distanceMeters).toBe(0);
    expect(mockPrismaService.freelancerSettings.findMany).toHaveBeenCalled();
    expect(mockPrismaService.commerce.findMany).not.toHaveBeenCalled();
  });

  it('uses ReputationService.getScore per entity and reflects it in reputationScore and confidence', async () => {
    mockReputationFacade.getScore.mockImplementation(
      async (_type: string, entityId: string) =>
        entityId === 'good'
          ? {
              score: 90,
              sampleSize: 20,
              breakdown: {},
              calculatedAt: new Date(),
            }
          : null
    );

    const candidates: MatchCandidateInput[] = [
      {
        entityType: 'COMMERCE',
        entityId: 'good',
        userId: 'u1',
        isAvailable: true,
      },
      {
        entityType: 'COMMERCE',
        entityId: 'unknown',
        userId: 'u2',
        isAvailable: true,
      },
    ];

    const results = await service.rankCandidates(candidates);
    const good = results.find((r) => r.entityId === 'good')!;
    const unknown = results.find((r) => r.entityId === 'unknown')!;

    expect(good.breakdown.reputationScore).toBe(90);
    expect(unknown.breakdown.reputationScore).toBeNull();
    expect(good.breakdown.confidence).toBeGreaterThan(
      unknown.breakdown.confidence
    );
    // El score final penaliza por confidence (ver matching.service.ts), así
    // que más señales reales siempre puede ganarle a menos señales aunque la
    // única señal del otro sea perfecta.
    expect(good.score).toBeGreaterThan(unknown.score);
  });

  it('scores availability at 100 when available and 0 when not, always counted as a present signal', async () => {
    const candidates: MatchCandidateInput[] = [
      {
        entityType: 'COMMERCE',
        entityId: 'available',
        userId: 'u1',
        isAvailable: true,
      },
      {
        entityType: 'COMMERCE',
        entityId: 'unavailable',
        userId: 'u2',
        isAvailable: false,
      },
    ];

    const results = await service.rankCandidates(candidates);
    const available = results.find((r) => r.entityId === 'available')!;
    const unavailable = results.find((r) => r.entityId === 'unavailable')!;

    expect(available.breakdown.availabilityScore).toBe(100);
    expect(unavailable.breakdown.availabilityScore).toBe(0);
    expect(available.score).toBeGreaterThan(unavailable.score);
  });

  it('sorts results by score descending', async () => {
    mockReputationFacade.getScore.mockImplementation(
      async (_type: string, entityId: string) =>
        entityId === 'best'
          ? {
              score: 100,
              sampleSize: 50,
              breakdown: {},
              calculatedAt: new Date(),
            }
          : null
    );
    const candidates: MatchCandidateInput[] = [
      {
        entityType: 'COMMERCE',
        entityId: 'worst',
        userId: 'u1',
        isAvailable: false,
      },
      {
        entityType: 'COMMERCE',
        entityId: 'best',
        userId: 'u2',
        isAvailable: true,
      },
    ];

    const results = await service.rankCandidates(candidates);

    expect(results[0].entityId).toBe('best');
    expect(results[1].entityId).toBe('worst');
  });
});
