import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../../src/domains/platform/health/health.controller';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/redis/redis.service';

describe('HealthController', () => {
  let controller: HealthController;
  let mockPrismaService: Partial<PrismaService>;
  let mockRedisService: Partial<RedisService>;

  beforeEach(async () => {
    mockPrismaService = {
      $queryRaw: jest.fn(),
    };

    mockRedisService = {
      set: jest.fn(),
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('check', () => {
    it('should return health status', async () => {
      const result = await controller.check();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.uptime).toBe('number');
    });
  });

  describe('version', () => {
    it('should return version info', () => {
      const result = controller.version();

      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('sha');
      expect(result).toHaveProperty('buildTime');
      expect(result).toHaveProperty('nodeVersion');
      expect(typeof result.version).toBe('string');
      expect(typeof result.nodeVersion).toBe('string');
    });

    it('should use default version when env not set', () => {
      const originalVersion = process.env.APP_VERSION;
      delete process.env.APP_VERSION;

      const result = controller.version();
      expect(result.version).toBe('1.0.0');

      process.env.APP_VERSION = originalVersion;
    });
  });

  describe('ready', () => {
    it('should return ready status when all services are connected', async () => {
      mockPrismaService.$queryRaw = jest.fn().mockResolvedValue([{ 1: 1 }]);
      mockRedisService.set = jest.fn().mockResolvedValue('OK');
      mockRedisService.get = jest.fn().mockResolvedValue('ok');

      const result = await controller.ready();

      expect(result).toHaveProperty('ready');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('checks');
      expect(result.checks).toHaveProperty('database');
      expect(result.checks).toHaveProperty('redis');
      expect(result.checks).toHaveProperty('application');
    });

    it('should handle database connection failure', async () => {
      mockPrismaService.$queryRaw = jest.fn().mockRejectedValue(new Error('DB Error'));
      mockRedisService.set = jest.fn().mockResolvedValue('OK');
      mockRedisService.get = jest.fn().mockResolvedValue('ok');

      const result = await controller.ready();

      expect(result.checks.database).toBe('disconnected');
      expect(result.ready).toBe(false);
    });

    it('should handle redis connection failure', async () => {
      mockPrismaService.$queryRaw = jest.fn().mockResolvedValue([{ 1: 1 }]);
      mockRedisService.set = jest.fn().mockRejectedValue(new Error('Redis Error'));

      const result = await controller.ready();

      expect(result.checks.redis).toBe('disconnected');
      expect(result.ready).toBe(false);
    });
  });
});
