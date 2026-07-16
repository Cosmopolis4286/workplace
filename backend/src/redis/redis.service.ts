import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get('REDIS_PASSWORD'),
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) => this.logger.error('Redis error', err.stack));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
  
  // --- Métodos básicos de Redis ---
  async set(key: string, value: string): Promise<void> {
    await this.client.set(key, value);
  }
  
  async setex(key: string, seconds: number, value: string): Promise<void> {
    await this.client.setex(key, seconds, value);
  }
  
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }
  
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
  
  async delMultiple(keys: string[]): Promise<void> {
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }
  
  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }
  
  async lpush(key: string, value: string): Promise<number> {
    return await this.client.lpush(key, value);
  }
  
  async ltrim(key: string, start: number, stop: number): Promise<void> {
    await this.client.ltrim(key, start, stop);
  }
  
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.client.lrange(key, start, stop);
  }

  // --- Token blacklist (logout) ---
  async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
    await this.client.setex(`blacklist:${jti}`, ttlSeconds, '1');
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await this.client.get(`blacklist:${jti}`);
    return result === '1';
  }

  // --- Rate limiting helpers ---
  async incrementLoginAttempts(email: string): Promise<number> {
    const key = `login_attempts:${email}`;
    const attempts = await this.client.incr(key);
    if (attempts === 1) {
      await this.client.expire(key, 15 * 60); // 15 minutes window
    }
    return attempts;
  }

  async getLoginAttempts(email: string): Promise<number> {
    const key = `login_attempts:${email}`;
    const attempts = await this.client.get(key);
    return attempts ? parseInt(attempts) : 0;
  }

  async resetLoginAttempts(email: string): Promise<void> {
    const key = `login_attempts:${email}`;
    await this.client.del(key);
  }

  // --- Generic cache ---
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  async incrbyfloat(key: string, amount: number): Promise<number> {
    const result = await this.client.incrbyfloat(key, amount);
    return parseFloat(String(result));
  }

  // Atomic INCRBYFLOAT + EXPIRE in one Lua script — eliminates the window
  // between the two commands where a crash or key expiry leaves the counter
  // without a TTL (which would permanently block users at their daily limit).
  async incrbyfloatWithExpire(key: string, amount: number, ttlSeconds: number): Promise<number> {
    const script = `
      local v = redis.call('INCRBYFLOAT', KEYS[1], ARGV[1])
      redis.call('EXPIRE', KEYS[1], ARGV[2])
      return v
    `;
    const result = await this.client.eval(script, 1, key, String(amount), String(ttlSeconds));
    return parseFloat(String(result));
  }
}
