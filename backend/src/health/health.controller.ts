import { Controller, Get, Inject } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@SkipThrottle()
@Controller()
export class HealthController {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  @Get('health')
  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('version')
  version() {
    return {
      version: process.env.APP_VERSION || '1.0.0',
      sha: process.env.GIT_SHA || 'unknown',
      buildTime: process.env.BUILD_TIME || new Date().toISOString(),
      nodeVersion: process.version,
    };
  }

  @Get('ready')
  async ready() {
    const uptime = process.uptime();
    const isReady = uptime > 5;
    
    // Verificar conexión a base de datos
    let dbStatus = 'disconnected';
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // Verificar conexión a Redis
    let redisStatus = 'disconnected';
    try {
      await this.redisService.setex('health_check', 10, 'ok');
      const value = await this.redisService.get('health_check');
      if (value === 'ok') {
        redisStatus = 'connected';
      }
    } catch (error) {
      console.error('Redis health check failed:', error);
    }

    const allChecksPass = isReady && dbStatus === 'connected' && redisStatus === 'connected';
    
    return {
      ready: allChecksPass,
      uptime: uptime,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        redis: redisStatus,
        application: isReady ? 'ready' : 'starting',
      }
    };
  }
}
