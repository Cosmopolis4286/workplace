import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../../domains/platform/health/health.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

describe('HealthController', () => {
  let controller: HealthController;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  const mockRedisService = {
    set: jest.fn(),
    setex: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health status', async () => {
      const result = await controller.check();

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      });
    });
  });

  describe('ready', () => {
    it('should return ready status', async () => {
      // Mock successful database connection
      mockPrismaService.$queryRaw.mockResolvedValue([{ '1': 1 }]);

      // Mock successful Redis connection
      mockRedisService.setex.mockResolvedValue(undefined);
      mockRedisService.get.mockResolvedValue('ok');

      const result = await controller.ready();

      expect(result).toHaveProperty('ready');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('checks');
      expect(result.checks.database).toBe('connected');
      expect(result.checks.redis).toBe('connected');
    });
  });
});
