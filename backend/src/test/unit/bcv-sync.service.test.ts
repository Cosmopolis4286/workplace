import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BcvSyncService } from '../../domains/money/exchange-rates/bcv-sync.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

describe('BcvSyncService — ensureDefaultRate', () => {
  let service: BcvSyncService;

  const mockPrismaService = {
    exchangeRate: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    exchangeRateHistory: {
      create: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BcvSyncService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<BcvSyncService>(BcvSyncService);
  });

  it('creates the VES row with a real BCV rate when it does not exist yet', async () => {
    // Caso real: base de datos nueva, VES nunca se sembró (no está en
    // seed.js) — el job debe crearla con datos reales del BCV, no un
    // placeholder, cuando la red está disponible.
    mockPrismaService.exchangeRate.findUnique.mockResolvedValue(null);
    jest.spyOn(service as any, 'fetchFromBCVScraping').mockResolvedValue({
      rate: 857.0058,
      date: '2026-09-28',
      source: 'BCV_SCRAPING',
      confidence: 'high',
    });
    const created = {
      id: 'rate-1',
      code: 'VES',
      rateToUsd: 857.0058,
      isDefault: false,
    };
    mockPrismaService.exchangeRate.create.mockResolvedValue(created);
    mockPrismaService.exchangeRate.findFirst.mockResolvedValue(null); // nadie es default
    mockPrismaService.exchangeRate.update.mockResolvedValue({
      ...created,
      isDefault: true,
    });

    await service.ensureDefaultRate();

    expect(mockPrismaService.exchangeRate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: 'VES',
        rateToUsd: 857.0058,
        isActive: true,
        autoSync: true,
        syncSource: 'BCV_SCRAPING',
        syncError: null,
      }),
    });
    expect(mockPrismaService.exchangeRate.update).toHaveBeenCalledWith({
      where: { code: 'VES' },
      data: { isDefault: true },
    });
  });

  it('creates the VES row with a placeholder rate (never 0) when BCV and the fallback both fail', async () => {
    mockPrismaService.exchangeRate.findUnique.mockResolvedValue(null);
    jest
      .spyOn(service as any, 'fetchFromBCVScraping')
      .mockRejectedValue(new Error('BCV unreachable'));
    jest
      .spyOn(service as any, 'fetchFromExternalAPI')
      .mockRejectedValue(new Error('fallback unreachable'));
    mockPrismaService.exchangeRate.create.mockResolvedValue({
      id: 'rate-1',
      code: 'VES',
      rateToUsd: 1,
      isDefault: false,
    });
    mockPrismaService.exchangeRate.findFirst.mockResolvedValue(null);
    mockPrismaService.exchangeRate.update.mockResolvedValue({});

    await service.ensureDefaultRate();

    expect(mockPrismaService.exchangeRate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: 'VES',
        rateToUsd: 1, // nunca 0 — CreateExchangeRateDto exige Min(0.000001)
        syncError: expect.stringContaining('automáticamente'),
      }),
    });
  });

  it('reactivates an inactive VES row instead of creating a duplicate', async () => {
    const inactive = {
      id: 'rate-1',
      code: 'VES',
      isActive: false,
      autoSync: true,
      isDefault: false,
    };
    mockPrismaService.exchangeRate.findUnique.mockResolvedValue(inactive);
    mockPrismaService.exchangeRate.update.mockResolvedValue({
      ...inactive,
      isActive: true,
    });
    mockPrismaService.exchangeRate.findFirst.mockResolvedValue(null);

    await service.ensureDefaultRate();

    expect(mockPrismaService.exchangeRate.create).not.toHaveBeenCalled();
    expect(mockPrismaService.exchangeRate.update).toHaveBeenCalledWith({
      where: { code: 'VES' },
      data: { isActive: true },
    });
  });

  it('sets VES as default when no currency is default yet', async () => {
    const existing = {
      id: 'rate-1',
      code: 'VES',
      isActive: true,
      autoSync: true,
      isDefault: false,
    };
    mockPrismaService.exchangeRate.findUnique.mockResolvedValue(existing);
    mockPrismaService.exchangeRate.findFirst.mockResolvedValue(null);
    mockPrismaService.exchangeRate.update.mockResolvedValue({
      ...existing,
      isDefault: true,
    });

    await service.ensureDefaultRate();

    expect(mockPrismaService.exchangeRate.update).toHaveBeenCalledWith({
      where: { code: 'VES' },
      data: { isDefault: true },
    });
  });

  it('does NOT steal isDefault from another currency an admin already chose', async () => {
    // Decisión explícita: este job es una red de seguridad, no una regla de
    // negocio que fuerce VES sobre una elección deliberada de un admin.
    const existing = {
      id: 'rate-ves',
      code: 'VES',
      isActive: true,
      autoSync: true,
      isDefault: false,
    };
    mockPrismaService.exchangeRate.findUnique.mockResolvedValue(existing);
    mockPrismaService.exchangeRate.findFirst.mockResolvedValue({
      id: 'rate-usd',
      code: 'USD',
      isDefault: true,
    });

    await service.ensureDefaultRate();

    expect(mockPrismaService.exchangeRate.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: { isDefault: true } })
    );
  });

  it('does nothing beyond re-affirming isDefault when VES already exists, is active, autoSync, and default', async () => {
    const healthy = {
      id: 'rate-1',
      code: 'VES',
      isActive: true,
      autoSync: true,
      isDefault: true,
    };
    mockPrismaService.exchangeRate.findUnique.mockResolvedValue(healthy);
    mockPrismaService.exchangeRate.findFirst.mockResolvedValue(healthy);

    await service.ensureDefaultRate();

    expect(mockPrismaService.exchangeRate.create).not.toHaveBeenCalled();
    expect(mockPrismaService.exchangeRate.update).not.toHaveBeenCalled();
  });

  it('turns on autoSync if VES exists but had it disabled', async () => {
    const existing = {
      id: 'rate-1',
      code: 'VES',
      isActive: true,
      autoSync: false,
      isDefault: true,
    };
    mockPrismaService.exchangeRate.findUnique.mockResolvedValue(existing);
    mockPrismaService.exchangeRate.findFirst.mockResolvedValue(existing);
    mockPrismaService.exchangeRate.update.mockResolvedValue({
      ...existing,
      autoSync: true,
    });

    await service.ensureDefaultRate();

    expect(mockPrismaService.exchangeRate.update).toHaveBeenCalledWith({
      where: { code: 'VES' },
      data: { autoSync: true },
    });
  });
});
